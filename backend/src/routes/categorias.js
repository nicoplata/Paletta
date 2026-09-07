const express = require('express');
const router = express.Router();
const { verificarToken, verificarRolesPermitidos } = require('../middleware/auth');
const categoriasController = require('../controllers/categoriasController');

// Obtener todas las categorías (usuarios y administradores)
router.get('/', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), categoriasController.getCategorias);

// Obtener una categoría por ID (usuarios y administradores)
router.get('/:id', verificarToken, verificarRolesPermitidos(['usuario', 'administrador']), categoriasController.getCategoriaById);

// Crear una nueva categoría (solo administradores)
router.post('/', verificarToken, verificarRolesPermitidos(['administrador']), categoriasController.createCategoria);

// Actualizar una categoría (solo administradores)
router.put('/:id', verificarToken, verificarRolesPermitidos(['administrador']), categoriasController.updateCategoria);

// Eliminar una categoría (solo administradores)
router.delete('/:id', verificarToken, verificarRolesPermitidos(['administrador']), categoriasController.deleteCategoria);

module.exports = router;
