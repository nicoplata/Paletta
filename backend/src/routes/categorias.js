const express = require('express');
const c = require('../controllers/categoriasController');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

// 🔓 Lectura pública (se usa en los filtros del catálogo)
router.get('/', c.getCategorias);
router.get('/:id', conId, c.getCategoriaById);

// 🔐 Administración
router.post('/', soloAdmin, validar(schemas.categoria), c.createCategoria);
router.put('/:id', soloAdmin, conId, validar(schemas.categoria), c.updateCategoria);
router.delete('/:id', soloAdmin, conId, c.deleteCategoria);

module.exports = router;
