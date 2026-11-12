const express = require('express');
const { login, me, confirmar } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();

router.post('/login', loginLimiter, validar(schemas.login), login);
router.get('/me', verificarToken, me);
router.post('/confirmar', loginLimiter, verificarToken, validar(schemas.confirmar), confirmar);

module.exports = router;
