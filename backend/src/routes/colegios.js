const express = require('express');
const router = express.Router();
const { verificarToken, verificarRolesPermitidos } = require('../middleware/auth');
const colegiosController = require('../controllers/colegiosController');

// ✅ Ruta pública para obtener todos los colegios (sin autenticación)
router.get('/', colegiosController.getColegios);

// Obtener un colegio por ID (usuarios y administradores)
router.get('/:id', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), colegiosController.getColegioById);

// Crear un nuevo colegio (solo administradores)
router.post('/', verificarToken, verificarRolesPermitidos(['administrador']), colegiosController.createColegio);

// Actualizar un colegio (solo administradores)
router.put('/:id', verificarToken, verificarRolesPermitidos(['administrador']), colegiosController.updateColegio);

// Eliminar un colegio (solo administradores)
router.delete('/:id', verificarToken, verificarRolesPermitidos(['administrador']), colegiosController.deleteColegio);

// Obtener productos por colegio (usuarios y administradores)
router.get('/:id/productos', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), colegiosController.getProductosPorColegio);

module.exports = router;