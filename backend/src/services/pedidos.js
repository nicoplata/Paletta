// Lógica de negocio de la tienda: creación de pedidos con reserva de stock,
// aplicación de pagos, cambios de estado, cancelaciones y vencimientos.
const { Op } = require('sequelize');
const ENV = require('../config/env');
const { sequelize, Pedido, PedidoItem, Variante, Producto, Colegio } = require('../models');
const { AppError } = require('../utils/errorHandler');
const mercadoPago = require('./mercadoPago');
const notificaciones = require('./notificacionesPedido');
const cupones = require('./cupones');
const envio = require('./envio');

const redondear = (n) => Math.round(n * 100) / 100;

// Transiciones permitidas desde el panel de administración
const TRANSICIONES = {
  pendiente_pago: ['pagado', 'cancelado'],
  pagado: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo_para_retirar', 'enviado', 'cancelado'],
  listo_para_retirar: ['entregado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
};

function metodosDisponibles() {
  const metodos = [];
  if (mercadoPago.configurado()) metodos.push('mercadopago');
  if (ENV.TRANSFERENCIA_ALIAS || ENV.TRANSFERENCIA_CBU) metodos.push('transferencia');
  return metodos;
}

function configuracionPublica() {
  return {
    habilitada: ENV.TIENDA_HABILITADA,
    metodosPago: metodosDisponibles(),
    envio: { habilitado: ENV.ENVIO_HABILITADO, costo: ENV.ENVIO_COSTO, gratisDesde: ENV.ENVIO_GRATIS_DESDE || null },
    retiro: { direccion: ENV.RETIRO_DIRECCION },
    maxUnidadesPorItem: ENV.MAX_UNIDADES_POR_ITEM,
  };
}

function datosTransferencia() {
  return {
    alias: ENV.TRANSFERENCIA_ALIAS || null,
    cbu: ENV.TRANSFERENCIA_CBU || null,
    titular: ENV.TRANSFERENCIA_TITULAR || null,
    banco: ENV.TRANSFERENCIA_BANCO || null,
  };
}

const includeItems = [{ model: PedidoItem, as: 'items' }];

// Descuenta (signo -1) o devuelve (signo +1) stock de las variantes de los ítems.
// Bloquea las filas en orden de id para evitar deadlocks entre pedidos concurrentes.
async function moverStock(items, signo, transaction) {
  const cantidades = new Map();
  for (const it of items) {
    if (!it.varianteId) continue;
    cantidades.set(it.varianteId, (cantidades.get(it.varianteId) || 0) + it.cantidad);
  }
  const ids = [...cantidades.keys()].sort((a, b) => a - b);
  if (!ids.length) return { faltantes: [] };

  const variantes = await Variante.findAll({
    where: { id: ids },
    order: [['id', 'ASC']],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  const faltantes = [];
  for (const v of variantes) {
    const delta = cantidades.get(v.id) * signo;
    if (v.stock + delta < 0) faltantes.push(v);
    else await v.update({ stock: v.stock + delta }, { transaction });
  }
  return { faltantes };
}

async function crearPedido(datos) {
  if (!ENV.TIENDA_HABILITADA) throw new AppError('La tienda online no está habilitada', 403);
  if (!metodosDisponibles().includes(datos.metodoPago)) throw new AppError('Método de pago no disponible', 400);
  if (datos.tipoEntrega === 'envio' && !ENV.ENVIO_HABILITADO) throw new AppError('El envío a domicilio no está disponible', 400);

  // Unificar ítems repetidos de la misma variante
  const pedidos = new Map();
  for (const it of datos.items) pedidos.set(it.varianteId, (pedidos.get(it.varianteId) || 0) + it.cantidad);
  for (const cantidad of pedidos.values()) {
    if (cantidad > ENV.MAX_UNIDADES_POR_ITEM) {
      throw new AppError(`Máximo ${ENV.MAX_UNIDADES_POR_ITEM} unidades por talle. Para compras mayores, contactanos.`, 400);
    }
  }

  const venceAt = new Date(
    Date.now() + (datos.metodoPago === 'mercadopago'
      ? ENV.PEDIDO_VENCIMIENTO_MP_MIN * 60 * 1000
      : ENV.PEDIDO_VENCIMIENTO_TRANSFERENCIA_HS * 60 * 60 * 1000)
  );

  const pedido = await sequelize.transaction(async (transaction) => {
    const ids = [...pedidos.keys()].sort((a, b) => a - b);
    const variantes = await Variante.findAll({
      where: { id: ids },
      include: [{
        model: Producto,
        as: 'producto',
        include: [{ model: Colegio, as: 'colegio', attributes: ['nombre', 'activo'] }],
      }],
      order: [['id', 'ASC']],
      lock: { level: transaction.LOCK.UPDATE, of: Variante },
      transaction,
    });

    if (variantes.length !== ids.length) throw new AppError('Algún producto del carrito ya no existe', 409);

    const items = [];
    const sinStock = [];
    for (const v of variantes) {
      const p = v.producto;
      if (!v.activo || !p.activo || p.colegio?.activo === false) {
        throw new AppError(`"${p.nombre}" (talle ${v.talle}) ya no está disponible`, 409);
      }
      const cantidad = pedidos.get(v.id);
      if (v.stock < cantidad) sinStock.push({ varianteId: v.id, producto: p.nombre, talle: v.talle, disponible: v.stock });
      // El precio SIEMPRE sale de la base, nunca del cliente
      items.push({
        productoId: p.id,
        varianteId: v.id,
        nombreProducto: p.nombre,
        colegio: p.colegio?.nombre || null,
        talle: v.talle,
        cantidad,
        precioUnitario: p.precio,
        subtotal: redondear(p.precio * cantidad),
      });
    }
    if (sinStock.length) {
      throw new AppError('No hay stock suficiente para algunos productos', 409, sinStock.map(
        (s) => `${s.producto} (talle ${s.talle}): quedan ${s.disponible}`
      ));
    }

    for (const v of variantes) {
      await v.update({ stock: v.stock - pedidos.get(v.id) }, { transaction });
    }

    const subtotal = redondear(items.reduce((acc, it) => acc + it.subtotal, 0));
    const esEnvio = datos.tipoEntrega === 'envio';

    // Cupón: se valida y se reserva un uso dentro de esta misma transacción
    const cupon = datos.cupon ? await cupones.aplicarEnPedido(datos.cupon, subtotal, transaction) : null;
    const descuento = cupon ? cupon.descuento : 0;

    // Envío: por zona de código postal (o costo fijo si no hay zonas); el envío gratis se mide sobre el subtotal con descuento
    const cotizacion = esEnvio ? await envio.costoParaPedido(datos.codigoPostal, subtotal - descuento) : null;
    const costoEnvio = cotizacion ? cotizacion.costo : 0;

    const nuevo = await Pedido.create({
      nombre: datos.nombre,
      email: datos.email.toLowerCase(),
      telefono: datos.telefono,
      dni: datos.dni || null,
      tipoEntrega: datos.tipoEntrega,
      direccion: esEnvio ? datos.direccion : null,
      ciudad: esEnvio ? datos.ciudad : null,
      provincia: esEnvio ? datos.provincia : null,
      codigoPostal: esEnvio ? datos.codigoPostal : null,
      notas: datos.notas || null,
      subtotal,
      descuento,
      cuponCodigo: cupon ? cupon.codigo : null,
      costoEnvio,
      zonaEnvio: cotizacion?.zona || null,
      total: redondear(subtotal - descuento + costoEnvio),
      metodoPago: datos.metodoPago,
      venceAt,
    }, { transaction });

    await PedidoItem.bulkCreate(items.map((it) => ({ ...it, pedidoId: nuevo.id })), { transaction });
    return nuevo;
  });

  const completo = await Pedido.findByPk(pedido.id, { include: includeItems });
  notificaciones.pedidoCreado(completo, datosTransferencia());
  return completo;
}

async function crearPreferenciaPago(pedido) {
  if (pedido.metodoPago !== 'mercadopago') throw new AppError('El pedido no se paga con Mercado Pago', 400);
  if (pedido.estado !== 'pendiente_pago') throw new AppError('El pedido ya no está pendiente de pago', 409);
  if (pedido.venceAt && new Date(pedido.venceAt) < new Date()) throw new AppError('El pedido venció. Hacé un nuevo pedido.', 409);
  const items = pedido.items || (await pedido.getItems());
  const preferencia = await mercadoPago.crearPreferencia(pedido, items);
  await pedido.update({ mpPreferenceId: preferencia.id });
  return { preferenceId: preferencia.id, initPoint: preferencia.init_point };
}

// Marca un pedido como pagado. Es idempotente. Si el pedido estaba cancelado (p. ej. por
// vencimiento) intenta volver a reservar el stock; si no alcanza, lo deja pagado con una alerta.
async function marcarPagado(pedidoId, { mpPaymentId = null, mpEstado = null, origen = 'manual' } = {}) {
  let notificar = false;
  const pedido = await sequelize.transaction(async (transaction) => {
    const p = await Pedido.findByPk(pedidoId, { include: includeItems, transaction, lock: { level: transaction.LOCK.UPDATE, of: Pedido } });
    if (!p) throw new AppError('Pedido no encontrado', 404);
    if (p.pagadoAt) {
      if (mpEstado) await p.update({ mpEstado }, { transaction });
      return p;
    }

    const cambios = { estado: 'pagado', pagadoAt: new Date(), mpEstado: mpEstado || p.mpEstado };
    if (mpPaymentId) cambios.mpPaymentId = mpPaymentId;

    if (p.estado === 'cancelado') {
      const { faltantes } = await moverStock(p.items, -1, transaction);
      if (p.cuponCodigo) await sequelize.models.Cupon.increment('usos', { by: 1, where: { codigo: p.cuponCodigo }, transaction });
      cambios.canceladoAt = null;
      cambios.motivoCancelacion = null;
      if (faltantes.length) {
        cambios.notasInternas = [p.notasInternas, `⚠️ Pago (${origen}) recibido después de la cancelación y no hay stock suficiente de: ${faltantes.map((v) => v.talle).join(', ')}. Revisar o reintegrar.`]
          .filter(Boolean).join('\n');
      }
    } else if (p.estado !== 'pendiente_pago') {
      throw new AppError('El pedido no está pendiente de pago', 409);
    }
    await p.update(cambios, { transaction });
    notificar = true;
    return p;
  });
  if (notificar) notificaciones.pedidoPagado(pedido);
  return pedido;
}

async function cancelar(pedidoId, motivo) {
  return sequelize.transaction(async (transaction) => {
    const p = await Pedido.findByPk(pedidoId, { include: includeItems, transaction, lock: { level: transaction.LOCK.UPDATE, of: Pedido } });
    if (!p) throw new AppError('Pedido no encontrado', 404);
    if (p.estado === 'cancelado') return p;
    if (!TRANSICIONES[p.estado].includes('cancelado')) throw new AppError('Este pedido ya no se puede cancelar', 409);
    await moverStock(p.items, +1, transaction);
    await cupones.liberarUso(p.cuponCodigo, transaction);
    await p.update({ estado: 'cancelado', canceladoAt: new Date(), motivoCancelacion: motivo || null }, { transaction });
    return p;
  });
}

async function cambiarEstado(pedidoId, nuevoEstado, { motivo } = {}) {
  if (nuevoEstado === 'cancelado') {
    const p = await cancelar(pedidoId, motivo || 'Cancelado por el administrador');
    notificaciones.estadoActualizado(p);
    return p;
  }
  if (nuevoEstado === 'pagado') return marcarPagado(pedidoId, { origen: 'manual' });

  const p = await Pedido.findByPk(pedidoId, { include: includeItems });
  if (!p) throw new AppError('Pedido no encontrado', 404);
  if (!TRANSICIONES[p.estado].includes(nuevoEstado)) {
    throw new AppError(`No se puede pasar de "${p.estado}" a "${nuevoEstado}"`, 409);
  }
  if (nuevoEstado === 'listo_para_retirar' && p.tipoEntrega !== 'retiro') throw new AppError('El pedido es con envío a domicilio', 400);
  if (nuevoEstado === 'enviado' && p.tipoEntrega !== 'envio') throw new AppError('El pedido es para retirar', 400);
  await p.update({ estado: nuevoEstado });
  notificaciones.estadoActualizado(p);
  return p;
}

// Procesa una notificación de pago de Mercado Pago consultando el pago real a la API.
async function procesarPagoMercadoPago(paymentId) {
  const pago = await mercadoPago.obtenerPago(paymentId);
  const pedido = await Pedido.findByPk(Number(pago.external_reference));
  if (!pedido) {
    console.warn(`[webhook] pago ${paymentId} con external_reference desconocida: ${pago.external_reference}`);
    return { ignorado: true };
  }

  if (pago.status === 'approved') {
    const monto = Number(pago.transaction_amount);
    if (pago.currency_id !== 'ARS' || Math.abs(monto - pedido.total) > 0.01) {
      await pedido.update({
        mpEstado: 'monto_invalido',
        notasInternas: [pedido.notasInternas, `⚠️ Pago MP ${paymentId} aprobado por ${pago.currency_id} ${monto}, pero el total es ${pedido.total}. Revisar.`]
          .filter(Boolean).join('\n'),
      });
      console.error(`[webhook] monto inválido en pedido ${pedido.id}: ${monto} vs ${pedido.total}`);
      return { pedido, aplicado: false };
    }
    const actualizado = await marcarPagado(pedido.id, { mpPaymentId: String(pago.id), mpEstado: pago.status, origen: 'Mercado Pago' });
    return { pedido: actualizado, aplicado: true };
  }

  const cambios = { mpEstado: pago.status };
  if (['refunded', 'charged_back'].includes(pago.status)) {
    cambios.notasInternas = [pedido.notasInternas, `⚠️ Mercado Pago informó "${pago.status}" para el pago ${paymentId}.`].filter(Boolean).join('\n');
  }
  await pedido.update(cambios);
  return { pedido, aplicado: false };
}

// Cancela los pedidos impagos vencidos y devuelve su stock.
async function vencerPendientes(ahora = new Date()) {
  const vencidos = await Pedido.findAll({
    where: { estado: 'pendiente_pago', venceAt: { [Op.lt]: ahora } },
    attributes: ['id'],
  });
  for (const { id } of vencidos) {
    try {
      await cancelar(id, 'Vencido sin pago');
    } catch (err) {
      console.error(`No se pudo vencer el pedido ${id}:`, err.message);
    }
  }
  return vencidos.length;
}

module.exports = {
  TRANSICIONES,
  configuracionPublica,
  datosTransferencia,
  metodosDisponibles,
  crearPedido,
  crearPreferenciaPago,
  marcarPagado,
  cancelar,
  cambiarEstado,
  procesarPagoMercadoPago,
  vencerPendientes,
  includeItems,
};
