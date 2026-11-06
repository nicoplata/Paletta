const rateLimit = require('express-rate-limit');

const base = { standardHeaders: true, legacyHeaders: false };

const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { error: 'Demasiadas solicitudes, intentá nuevamente en unos minutos.' },
});

const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de inicio de sesión. Intentá nuevamente en 15 minutos.' },
});

const contactoLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { error: 'Ya recibimos varios mensajes tuyos. Intentá nuevamente más tarde.' },
});

// Ingreso de familias de egresados (link + DNI): limita los intentos fallidos
const ingresoEgresadosLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.EGR_INGRESOS_POR_15MIN) || 10,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos. Esperá 15 minutos y volvé a probar, o escribinos por WhatsApp.' },
});

module.exports = { apiLimiter, loginLimiter, contactoLimiter, ingresoEgresadosLimiter };
