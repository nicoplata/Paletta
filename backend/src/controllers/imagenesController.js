const fs = require('fs/promises');
const path = require('path');
const { Imagen, Producto, Colegio } = require('../models');
const { AppError } = require('../utils/errorHandler');
const { UPLOADS_DIR } = require('../middleware/upload');

const MODELOS = { producto: Producto, colegio: Colegio };

const borrarArchivo = (nombre) => fs.unlink(path.join(UPLOADS_DIR, path.basename(nombre))).catch(() => {});

exports.subirImagen = async (req, res) => {
  if (!req.file) throw new AppError('No se recibió ninguna imagen', 400);

  const { tipoEntidad, entidadId, descripcion } = req.body;
  const entidad = await MODELOS[tipoEntidad].findByPk(entidadId);
  if (!entidad) {
    await borrarArchivo(req.file.filename);
    throw new AppError(`El ${tipoEntidad} no existe`, 400);
  }

  const imagen = await Imagen.create({
    url: `/uploads/${req.file.filename}`,
    descripcion,
    tipoEntidad,
    entidadId,
  });
  res.status(201).json(imagen);
};

exports.getImagenes = async (req, res) => {
  const { tipoEntidad, entidadId } = req.query;
  if (!MODELOS[tipoEntidad]) throw new AppError('tipoEntidad inválido', 400);
  const where = { tipoEntidad };
  if (entidadId) where.entidadId = Number(entidadId);
  const imagenes = await Imagen.findAll({ where, order: [['id', 'ASC']] });
  res.json(imagenes);
};

exports.eliminarImagen = async (req, res) => {
  const imagen = await Imagen.findByPk(req.params.id);
  if (!imagen) throw new AppError('Imagen no encontrada', 404);
  await imagen.destroy();
  await borrarArchivo(imagen.url);
  res.json({ success: true, mensaje: 'Imagen eliminada' });
};
