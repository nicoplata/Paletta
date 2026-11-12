const express = require('express');
const c = require('../controllers/productosController');
const { soloAdmin, soloPanel, requiereConfirmacion } = require('../middleware/auth');
const { auditar } = require('../services/actividad');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

// 🔓 Catálogo público
router.get('/public', c.getProductosPublicos);
router.get('/public/:id', conId, c.getProductoPublicoById);

// 🔐 Administración
router.get('/', soloPanel, c.getProductos);
router.get('/:id', soloPanel, conId, c.getProductoById);
router.post('/', soloPanel, validar(schemas.producto), c.createProducto);
router.put('/:id', soloPanel, conId, validar(schemas.producto), c.updateProducto);
router.delete('/:id', soloAdmin, conId, requiereConfirmacion, auditar('productos_borrado', (req) => `Borró el producto #${req.params.id}`, { sensible: true }), c.deleteProducto);

module.exports = router;
