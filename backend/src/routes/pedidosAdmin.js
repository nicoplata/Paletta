const express = require('express');
const c = require('../controllers/pedidosAdminController');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

router.use(soloAdmin);
router.get('/', c.listar);
router.get('/resumen', c.resumen);
router.get('/exportar', validar(schemas.exportarPedidos, 'query'), c.exportar);
router.get('/:id', conId, c.obtener);
router.patch('/:id', conId, validar(schemas.pedidoAdmin), c.actualizar);
router.patch('/:id/estado', conId, validar(schemas.cambioEstado), c.cambiarEstado);

module.exports = router;
