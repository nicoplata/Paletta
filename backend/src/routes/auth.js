const express = require('express');
const { login, me } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();

router.post('/login', loginLimiter, validar(schemas.login), login);
router.get('/me', verificarToken, me);

module.exports = router;
