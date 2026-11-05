const express = require('express');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/tiendaController');
const ENV = require('../config/env');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conToken = validar(schemas.tokenParam, 'params');

const limitePedidos = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => ENV.PEDIDOS_POR_HORA,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos desde esta conexión. Intentá más tarde o contactanos.' },
});

router.get('/tienda/config', c.config);

router.post('/pedidos', limitePedidos, validar(schemas.pedido), c.crearPedido);
router.get('/pedidos/:token', conToken, c.verPedido);
router.post('/pedidos/:token/pagar', limitePedidos, conToken, c.iniciarPago);
router.post('/pedidos/:token/verificar-pago', conToken, validar(schemas.verificarPago), c.verificarPago);

router.post('/pagos/webhook', c.webhookMercadoPago);

module.exports = router;
