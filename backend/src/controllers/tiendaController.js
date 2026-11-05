const { Pedido, Variante, Producto } = require('../models');
const cupones = require('../services/cupones');
const envio = require('../services/envio');
const pedidos = require('../services/pedidos');
const mercadoPago = require('../services/mercadoPago');
const { AppError } = require('../utils/errorHandler');

// Vista pública de un pedido: sin notas internas ni datos de Mercado Pago.
function pedidoPublico(p) {
  return {
    token: p.token,
    numero: p.numero(),
    estado: p.estado,
    creadoAt: p.createdAt,
    venceAt: p.venceAt,
    pagadoAt: p.pagadoAt,
    nombre: p.nombre,
    email: p.email,
    tipoEntrega: p.tipoEntrega,
    direccion: p.direccion,
    ciudad: p.ciudad,
    provincia: p.provincia,
    codigoPostal: p.codigoPostal,
    metodoPago: p.metodoPago,
    subtotal: p.subtotal,
    descuento: p.descuento,
    cuponCodigo: p.cuponCodigo,
    costoEnvio: p.costoEnvio,
    zonaEnvio: p.zonaEnvio,
    total: p.total,
    items: (p.items || []).map((it) => ({
      nombreProducto: it.nombreProducto,
      colegio: it.colegio,
      talle: it.talle,
      cantidad: it.cantidad,
      precioUnitario: it.precioUnitario,
      subtotal: it.subtotal,
    })),
    transferencia: p.metodoPago === 'transferencia' && p.estado === 'pendiente_pago' ? pedidos.datosTransferencia() : undefined,
  };
}

async function buscarPorToken(token) {
  const p = await Pedido.findOne({ where: { token }, include: pedidos.includeItems });
  if (!p) throw new AppError('Pedido no encontrado', 404);
  return p;
}

exports.config = (req, res) => {
  res.json(pedidos.configuracionPublica());
};

exports.crearPedido = async (req, res) => {
  const pedido = await pedidos.crearPedido(req.body);
  const respuesta = { pedido: pedidoPublico(pedido) };
  if (pedido.metodoPago === 'mercadopago') {
    try {
      respuesta.pago = await pedidos.crearPreferenciaPago(pedido);
    } catch (err) {
      // El pedido ya existe con el stock reservado: el cliente puede reintentar el pago desde su página.
      console.error('No se pudo crear la preferencia de MP:', err.message);
      respuesta.pagoError = 'No pudimos iniciar el pago. Podés reintentarlo desde la página del pedido.';
    }
  }
  res.status(201).json(respuesta);
};

exports.verPedido = async (req, res) => {
  res.json(pedidoPublico(await buscarPorToken(req.params.token)));
};

exports.iniciarPago = async (req, res) => {
  const pedido = await buscarPorToken(req.params.token);
  res.json(await pedidos.crearPreferenciaPago(pedido));
};

// Al volver de Mercado Pago el front informa el payment_id; lo verificamos contra la API
// (no confiamos en el estado que viene en la URL).
exports.verificarPago = async (req, res) => {
  const pedido = await buscarPorToken(req.params.token);
  if (pedido.metodoPago === 'mercadopago' && !pedido.pagadoAt) {
    const pago = await mercadoPago.obtenerPago(req.body.paymentId);
    if (String(pago.external_reference) !== String(pedido.id)) throw new AppError('El pago no corresponde a este pedido', 400);
    await pedidos.procesarPagoMercadoPago(req.body.paymentId);
  }
  res.json(pedidoPublico(await buscarPorToken(req.params.token)));
};

// Webhook de Mercado Pago. Responde 200 rápido; si algo falla devuelve 500 para que MP reintente.
exports.webhookMercadoPago = async (req, res) => {
  const tipo = req.body?.type || req.query.type || req.query.topic;
  const dataId = req.query['data.id'] || req.body?.data?.id || req.query.id;

  const firmaValida = mercadoPago.verificarFirma({
    firma: req.get('x-signature'),
    requestId: req.get('x-request-id'),
    dataId,
  });
  if (!firmaValida) return res.status(401).json({ error: 'Firma inválida' });

  if (tipo !== 'payment' || !dataId) return res.status(200).json({ ok: true, ignorado: true });

  await pedidos.procesarPagoMercadoPago(String(dataId));
  res.status(200).json({ ok: true });
};

exports.pedidoPublico = pedidoPublico;

// Subtotal de un carrito calculado con los precios de la base (para previsualizar cupones).
async function subtotalDeItems(items) {
  const variantes = await Variante.findAll({
    where: { id: items.map((it) => it.varianteId) },
    include: [{ model: Producto, as: 'producto', attributes: ['precio'] }],
  });
  const precios = new Map(variantes.map((v) => [v.id, v.producto.precio]));
  return Math.round(items.reduce((acc, it) => acc + (precios.get(it.varianteId) || 0) * it.cantidad, 0) * 100) / 100;
}

exports.validarCupon = async (req, res) => {
  const subtotal = await subtotalDeItems(req.body.items);
  res.json(await cupones.previsualizar(req.body.codigo, subtotal));
};

exports.cotizarEnvio = async (req, res) => {
  res.json(await envio.cotizar(req.query.cp, req.query.subtotal));
};
