const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 solicitudes por ventana por IP
  message: 'Demasiadas solicitudes desde esta IP, por favor intente nuevamente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // límite de 5 intentos de login por hora
  message: 'Demasiados intentos de inicio de sesión. Por favor, intente nuevamente en 1 hora.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  limiter,
  loginLimiter
};
