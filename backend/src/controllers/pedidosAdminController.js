const { Op, fn, col } = require('sequelize');
const { Pedido, sequelize } = require('../models');
const pedidos = require('../services/pedidos');
const { AppError } = require('../utils/errorHandler');
const { generarCsv } = require('../utils/csv');
const { ESTADOS_TEXTO } = require('../services/notificacionesPedido');

exports.listar = async (req, res) => {
  const where = {};
  if (req.query.estado) where.estado = req.query.estado;
  const q = (req.query.q || '').trim();
  if (q) {
    const numero = Number(q.replace(/^p-?/i, ''));
    where[Op.or] = [
      { nombre: { [Op.iLike]: `%${q}%` } },
      { email: { [Op.iLike]: `%${q}%` } },
      ...(Number.isInteger(numero) && numero > 0 ? [{ id: numero }] : []),
    ];
  }
  const lista = await Pedido.findAll({
    where,
    include: pedidos.includeItems,
    order: [['createdAt', 'DESC'], [{ model: sequelize.models.PedidoItem, as: 'items' }, 'id', 'ASC']],
    limit: Math.min(Number(req.query.limite) || 200, 500),
  });
  res.json(lista.map((p) => ({ ...p.toJSON(), numero: p.numero() })));
};

exports.resumen = async (req, res) => {
  const porEstado = await Pedido.findAll({
    attributes: ['estado', [fn('COUNT', col('id')), 'cantidad']],
    group: ['estado'],
    raw: true,
  });
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const [ventas] = await Pedido.findAll({
    attributes: [[fn('COALESCE', fn('SUM', col('total')), 0), 'total'], [fn('COUNT', col('id')), 'cantidad']],
    where: { pagadoAt: { [Op.gte]: inicioMes }, estado: { [Op.ne]: 'cancelado' } },
    raw: true,
  });
  res.json({
    porEstado: Object.fromEntries(porEstado.map((r) => [r.estado, Number(r.cantidad)])),
    mes: { total: Number(ventas.total), cantidad: Number(ventas.cantidad) },
  });
};

exports.obtener = async (req, res) => {
  const p = await Pedido.findByPk(req.params.id, { include: pedidos.includeItems });
  if (!p) throw new AppError('Pedido no encontrado', 404);
  res.json({ ...p.toJSON(), numero: p.numero(), transicionesPosibles: pedidos.TRANSICIONES[p.estado] });
};

exports.cambiarEstado = async (req, res) => {
  await pedidos.cambiarEstado(Number(req.params.id), req.body.estado, { motivo: req.body.motivo });
  const p = await Pedido.findByPk(req.params.id, { include: pedidos.includeItems });
  res.json({ ...p.toJSON(), numero: p.numero(), transicionesPosibles: pedidos.TRANSICIONES[p.estado] });
};

exports.actualizar = async (req, res) => {
  const p = await Pedido.findByPk(req.params.id, { include: pedidos.includeItems });
  if (!p) throw new AppError('Pedido no encontrado', 404);
  await p.update({ notasInternas: req.body.notasInternas ?? null });
  res.json({ ...p.toJSON(), numero: p.numero(), transicionesPosibles: pedidos.TRANSICIONES[p.estado] });
};

const numero = (p) => `P-${String(p.id).padStart(6, '0')}`;
const COLUMNAS_PEDIDO = [
  { titulo: 'Pedido', valor: (p) => numero(p) },
  { titulo: 'Fecha', valor: (p) => p.createdAt },
  { titulo: 'Estado', valor: (p) => ESTADOS_TEXTO[p.estado] || p.estado },
  { titulo: 'Cliente', valor: (p) => p.nombre },
  { titulo: 'Email', valor: (p) => p.email },
  { titulo: 'Teléfono', valor: (p) => p.telefono },
  { titulo: 'DNI', valor: (p) => p.dni },
  { titulo: 'Entrega', valor: (p) => (p.tipoEntrega === 'retiro' ? 'Retiro' : 'Envío') },
  { titulo: 'Dirección', valor: (p) => (p.tipoEntrega === 'envio' ? `${p.direccion}, ${p.ciudad}, ${p.provincia} (${p.codigoPostal})` : '') },
  { titulo: 'Zona', valor: (p) => p.zonaEnvio },
  { titulo: 'Pago', valor: (p) => (p.metodoPago === 'mercadopago' ? 'Mercado Pago' : 'Transferencia') },
  { titulo: 'Pagado', valor: (p) => p.pagadoAt },
  { titulo: 'Cupón', valor: (p) => p.cuponCodigo },
  { titulo: 'Subtotal', valor: (p) => p.subtotal },
  { titulo: 'Descuento', valor: (p) => p.descuento },
  { titulo: 'Envío', valor: (p) => p.costoEnvio },
  { titulo: 'Total', valor: (p) => p.total },
  { titulo: 'Notas del cliente', valor: (p) => p.notas },
];

exports.exportar = async (req, res) => {
  const { estado, desde, hasta, detalle } = req.query;
  const where = {};
  if (estado) where.estado = estado;
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt[Op.gte] = new Date(desde);
    if (hasta) {
      const fin = new Date(hasta);
      fin.setHours(23, 59, 59, 999);
      where.createdAt[Op.lte] = fin;
    }
  }
  const lista = await Pedido.findAll({
    where,
    include: pedidos.includeItems,
    order: [['createdAt', 'ASC'], [{ model: sequelize.models.PedidoItem, as: 'items' }, 'id', 'ASC']],
  });

  let csv;
  if (detalle === 'items') {
    // Una fila por prenda: sirve para armar la producción (talles y cantidades)
    const filas = lista.flatMap((p) => p.items.map((it) => ({ p, it })));
    csv = generarCsv([
      { titulo: 'Pedido', valor: ({ p }) => numero(p) },
      { titulo: 'Fecha', valor: ({ p }) => p.createdAt },
      { titulo: 'Estado', valor: ({ p }) => ESTADOS_TEXTO[p.estado] || p.estado },
      { titulo: 'Cliente', valor: ({ p }) => p.nombre },
      { titulo: 'Producto', valor: ({ it }) => it.nombreProducto },
      { titulo: 'Colegio', valor: ({ it }) => it.colegio },
      { titulo: 'Talle', valor: ({ it }) => it.talle },
      { titulo: 'Cantidad', valor: ({ it }) => it.cantidad },
      { titulo: 'Precio unitario', valor: ({ it }) => it.precioUnitario },
      { titulo: 'Subtotal', valor: ({ it }) => it.subtotal },
    ], filas);
  } else {
    csv = generarCsv(COLUMNAS_PEDIDO, lista);
  }

  const fecha = new Date().toISOString().slice(0, 10);
  res
    .type('text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="pedidos-${detalle}-${fecha}.csv"`)
    .set('Cache-Control', 'no-store')
    .send(csv);
};
