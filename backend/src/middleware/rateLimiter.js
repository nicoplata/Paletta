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

// Subida de comprobantes desde el portal de familias
const comprobantesLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.EGR_COMPROBANTES_POR_HORA) || 20,
  message: { error: 'Subiste muchos archivos seguidos. Probá de nuevo en un rato o escribinos por WhatsApp.' },
});

// Búsqueda de promos por código: limita los intentos con códigos inexistentes
const codigoPromoLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.EGR_CODIGOS_POR_15MIN) || 20,
  skipSuccessfulRequests: true,
  message: { error: 'Probaste muchos códigos. Esperá unos minutos y revisá el código con la comisión.' },
});

// Diseñador de egresados: diseños guardados y pedidos de presupuesto
const disenosLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.EGR_DISENOS_POR_HORA) || 40,
  message: { error: 'Guardaste muchos diseños seguidos. Probá de nuevo en un rato.' },
});
const presupuestosLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.EGR_PRESUPUESTOS_POR_HORA) || 6,
  message: { error: 'Ya recibimos varios pedidos tuyos. Si es urgente, escribinos por WhatsApp.' },
});

module.exports = {
  apiLimiter, loginLimiter, contactoLimiter, ingresoEgresadosLimiter, comprobantesLimiter, codigoPromoLimiter, disenosLimiter, presupuestosLimiter,
};
