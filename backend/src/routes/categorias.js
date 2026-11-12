const express = require('express');
const c = require('../controllers/categoriasController');
const { soloAdmin, soloPanel, requiereConfirmacion } = require('../middleware/auth');
const { auditar } = require('../services/actividad');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

// 🔓 Lectura pública (se usa en los filtros del catálogo)
router.get('/', c.getCategorias);
router.get('/:id', conId, c.getCategoriaById);

// 🔐 Administración
router.post('/', soloPanel, validar(schemas.categoria), c.createCategoria);
router.put('/:id', soloPanel, conId, validar(schemas.categoria), c.updateCategoria);
router.delete('/:id', soloAdmin, conId, requiereConfirmacion, auditar('categorias_borrado', (req) => `Borró la categoría #${req.params.id}`, { sensible: true }), c.deleteCategoria);

module.exports = router;
