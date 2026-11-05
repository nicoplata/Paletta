const multer = require('multer');
const { AppError } = require('../utils/errorHandler');
const ENV = require('../config/env');

const notFound = (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
};

 
const errorHandler = (err, req, res, next) => {
  let status = 500;
  let mensaje = 'Error interno del servidor';
  let detalles;

  if (err instanceof AppError) {
    status = err.statusCode;
    mensaje = err.message;
    detalles = err.detalles;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    mensaje = err.code === 'LIMIT_FILE_SIZE'
      ? `La imagen supera el máximo de ${ENV.UPLOAD_MAX_MB} MB`
      : 'Error al procesar el archivo';
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    mensaje = 'Ya existe un registro con esos datos';
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    status = 409;
    mensaje = 'La operación viola una relación existente';
  } else if (err.name === 'SequelizeValidationError') {
    status = 400;
    mensaje = 'Datos inválidos';
    detalles = err.errors?.map((e) => e.message);
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    mensaje = 'JSON inválido';
  } else if (err.message === 'No permitido por CORS') {
    status = 403;
    mensaje = err.message;
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(status).json({ error: mensaje, ...(detalles ? { detalles } : {}) });
};

module.exports = { notFound, errorHandler };
