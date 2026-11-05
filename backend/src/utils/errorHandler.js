class AppError extends Error {
  constructor(message, statusCode = 500, detalles) {
    super(message);
    this.statusCode = statusCode;
    this.detalles = detalles;
    this.isOperational = true;
  }
}

// Envuelve controladores async para que los errores lleguen al middleware de errores.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, asyncHandler };
