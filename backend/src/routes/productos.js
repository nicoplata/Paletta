const express = require('express');
const c = require('../controllers/productosController');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

// 🔓 Catálogo público
router.get('/public', c.getProductosPublicos);
router.get('/public/:id', conId, c.getProductoPublicoById);

// 🔐 Administración
router.get('/', soloAdmin, c.getProductos);
router.get('/:id', soloAdmin, conId, c.getProductoById);
router.post('/', soloAdmin, validar(schemas.producto), c.createProducto);
router.put('/:id', soloAdmin, conId, validar(schemas.producto), c.updateProducto);
router.delete('/:id', soloAdmin, conId, c.deleteProducto);

module.exports = router;
