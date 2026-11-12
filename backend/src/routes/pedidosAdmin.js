const express = require('express');
const c = require('../controllers/pedidosAdminController');
const { soloPanel, requiereConfirmacion } = require('../middleware/auth');
const { auditar } = require('../services/actividad');
const { Pedido } = require('../models');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

router.use(soloPanel);

// Cancelar un pedido ya pagado (devuelve stock y hay que reintegrar la plata) pide confirmar la contraseña
async function confirmarSiCancelaPagado(req, res, next) {
  if (req.body?.estado !== 'cancelado') return next();
  const p = await Pedido.findByPk(req.params.id, { attributes: ['estado'] });
  if (!p || p.estado === 'pendiente_pago') return next();
  return requiereConfirmacion(req, res, next);
}
router.get('/', c.listar);
router.get('/resumen', c.resumen);
router.get('/exportar', validar(schemas.exportarPedidos, 'query'), c.exportar);
router.get('/:id', conId, c.obtener);
router.patch('/:id', conId, validar(schemas.pedidoAdmin), c.actualizar);
router.patch('/:id/estado', conId, validar(schemas.cambioEstado), confirmarSiCancelaPagado,
  auditar('pedido_estado', (req) => `Pasó el pedido P-${String(req.params.id).padStart(6, '0')} a "${req.body.estado}"`), c.cambiarEstado);

module.exports = router;
