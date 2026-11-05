const { Op, fn, col } = require('sequelize');
const { Pedido, sequelize } = require('../models');
const pedidos = require('../services/pedidos');
const { AppError } = require('../utils/errorHandler');

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
