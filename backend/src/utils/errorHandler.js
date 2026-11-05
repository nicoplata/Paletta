class AppError extends Error {
  constructor(message, statusCode = 500, detalles) {
    super(message);
    this.statusCode = statusCode;
    this.detalles = detalles;
    this.isOperational = true;
  }
}

// Nota: Express 5 propaga automáticamente los errores de los controladores async; no hace falta envolverlos.
module.exports = { AppError };
