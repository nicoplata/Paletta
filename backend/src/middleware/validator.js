const { AppError } = require('../utils/errorHandler');

// Valida y normaliza req[origen] con un esquema Joi. Descarta campos no declarados.
const validar = (schema, origen = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[origen], {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    return next(new AppError('Datos inválidos', 400, error.details.map((d) => d.message)));
  }
  // En Express 5 req.query es un getter de solo lectura: se redefine en la instancia
  Object.defineProperty(req, origen, { value, writable: true, configurable: true, enumerable: true });
  next();
};

module.exports = validar;
