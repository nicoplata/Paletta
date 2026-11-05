const express = require('express');
const c = require('../controllers/colegiosController');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

// 🔐 Administración (rutas fijas antes que /:id)
router.get('/admin', soloAdmin, c.getColegios);
router.get('/admin/:id', soloAdmin, conId, c.getColegioById);
router.post('/', soloAdmin, validar(schemas.colegio), c.createColegio);
router.put('/:id', soloAdmin, conId, validar(schemas.colegio), c.updateColegio);
router.delete('/:id', soloAdmin, conId, c.deleteColegio);

// 🔓 Público: solo colegios activos
router.get('/', c.getColegiosPublicos);
router.get('/:id', conId, c.getColegioPublicoById);
router.get('/:id/productos', conId, c.getProductosPorColegio);

module.exports = router;
