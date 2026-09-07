class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (err, res) => {
  const { statusCode = 500, message } = err;
  
  res.status(statusCode).json({
    status: err.status || 'error',
    message: statusCode === 500 ? 'Error interno del servidor' : message
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  handleError,
  asyncHandler
};
