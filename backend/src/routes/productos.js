const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { verificarToken, verificarRolesPermitidos } = require('../middleware/auth');

// 🔓 Rutas públicas para el catálogo online
router.get('/public', productosController.getProductosPublicos);
router.get('/public/:id', productosController.getProductoPublicoById);

// 🔐 Rutas protegidas para usuarios autenticados (usuario y administrador)
router.get('/', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), productosController.getProductos);
router.get('/:id', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), productosController.getProductoById);
router.post('/', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), productosController.createProducto);
router.put('/:id', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), productosController.updateProducto);
router.delete('/:id', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), productosController.deleteProducto);

module.exports = router;
