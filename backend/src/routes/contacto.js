const express = require('express');
const c = require('../controllers/contactoController');
const { soloPanel } = require('../middleware/auth');
const { contactoLimiter } = require('../middleware/rateLimiter');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

// 🔓 Formulario público
router.post('/', contactoLimiter, validar(schemas.contacto), c.recibirMensaje);

// 🔐 Bandeja de mensajes
router.get('/', soloPanel, c.listarMensajes);
router.patch('/:id', soloPanel, conId, c.marcarLeido);
router.delete('/:id', soloPanel, conId, c.eliminarMensaje);

module.exports = router;
