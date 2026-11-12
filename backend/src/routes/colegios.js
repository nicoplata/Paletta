const express = require('express');
const c = require('../controllers/colegiosController');
const { soloAdmin, soloPanel, requiereConfirmacion } = require('../middleware/auth');
const { auditar } = require('../services/actividad');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

// 🔐 Administración (rutas fijas antes que /:id)
router.get('/admin', soloPanel, c.getColegios);
router.get('/admin/:id', soloPanel, conId, c.getColegioById);
router.post('/', soloPanel, validar(schemas.colegio), c.createColegio);
router.put('/:id', soloPanel, conId, validar(schemas.colegio), c.updateColegio);
router.delete('/:id', soloAdmin, conId, requiereConfirmacion, auditar('colegios_borrado', (req) => `Borró el colegio #${req.params.id}`, { sensible: true }), c.deleteColegio);

// 🔓 Público: solo colegios activos
router.get('/', c.getColegiosPublicos);
router.get('/:id', conId, c.getColegioPublicoById);
router.get('/:id/productos', conId, c.getProductosPorColegio);

module.exports = router;
