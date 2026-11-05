const fs = require('fs/promises');
const path = require('path');
const { Colegio, Producto, Imagen, sequelize } = require('../models');
const { AppError } = require('../utils/errorHandler');
const { UPLOADS_DIR } = require('../middleware/upload');
const { includePublico, ordenProductos } = require('./productosController');

const includeImagenes = { model: Imagen, as: 'imagenes', attributes: ['id', 'url', 'descripcion'] };
const orden = [['nombre', 'ASC'], [{ model: Imagen, as: 'imagenes' }, 'id', 'ASC']];

// 🔓 Público: colegios activos
exports.getColegiosPublicos = async (req, res) => {
  const colegios = await Colegio.findAll({ where: { activo: true }, include: [includeImagenes], order: orden });
  res.json(colegios);
};

exports.getColegioPublicoById = async (req, res) => {
  const colegio = await Colegio.findOne({
    where: { id: req.params.id, activo: true },
    include: [includeImagenes],
    order: orden,
  });
  if (!colegio) throw new AppError('Colegio no encontrado', 404);
  res.json(colegio);
};

exports.getProductosPorColegio = async (req, res) => {
  const colegio = await Colegio.findOne({ where: { id: req.params.id, activo: true } });
  if (!colegio) throw new AppError('Colegio no encontrado', 404);
  const productos = await Producto.findAll({
    where: { colegioId: colegio.id, activo: true },
    include: includePublico,
    order: ordenProductos,
  });
  res.json(productos);
};

// 🔐 Admin: todos (incluye inactivos)
exports.getColegios = async (req, res) => {
  const colegios = await Colegio.findAll({ include: [includeImagenes], order: orden });
  res.json(colegios);
};

exports.getColegioById = async (req, res) => {
  const colegio = await Colegio.findByPk(req.params.id, { include: [includeImagenes], order: orden });
  if (!colegio) throw new AppError('Colegio no encontrado', 404);
  res.json(colegio);
};

exports.createColegio = async (req, res) => {
  const colegio = await Colegio.create(req.body);
  res.status(201).json(colegio);
};

exports.updateColegio = async (req, res) => {
  const colegio = await Colegio.findByPk(req.params.id);
  if (!colegio) throw new AppError('Colegio no encontrado', 404);
  await colegio.update(req.body);
  res.json(colegio);
};

exports.deleteColegio = async (req, res) => {
  const colegio = await Colegio.findByPk(req.params.id);
  if (!colegio) throw new AppError('Colegio no encontrado', 404);
  const enUso = await Producto.count({ where: { colegioId: colegio.id } });
  if (enUso > 0) {
    throw new AppError(`No se puede eliminar: el colegio tiene ${enUso} producto(s). Podés desactivarlo.`, 409);
  }
  const imagenes = await Imagen.findAll({ where: { tipoEntidad: 'colegio', entidadId: colegio.id } });
  await sequelize.transaction(async (transaction) => {
    await Imagen.destroy({ where: { tipoEntidad: 'colegio', entidadId: colegio.id }, transaction });
    await colegio.destroy({ transaction });
  });
  await Promise.all(
    imagenes.map((img) => fs.unlink(path.join(UPLOADS_DIR, path.basename(img.url))).catch(() => {}))
  );
  res.json({ mensaje: 'Colegio eliminado' });
};
