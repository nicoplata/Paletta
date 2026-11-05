const fs = require('fs/promises');
const path = require('path');
const { Producto, Categoria, Imagen, Colegio, sequelize } = require('../models');
const { AppError } = require('../utils/errorHandler');
const { UPLOADS_DIR } = require('../middleware/upload');

const includeCompleto = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
  { model: Colegio, as: 'colegio', attributes: ['id', 'nombre', 'ciudad'] },
  { model: Imagen, as: 'imagenes', attributes: ['id', 'url', 'descripcion'] },
];
const orden = [['nombre', 'ASC'], [{ model: Imagen, as: 'imagenes' }, 'id', 'ASC']];

const filtrosDesdeQuery = (query) => {
  const where = {};
  if (query.colegioId) where.colegioId = Number(query.colegioId);
  if (query.categoriaId) where.categoriaId = Number(query.categoriaId);
  return where;
};

async function validarRelaciones({ categoriaId, colegioId }) {
  const [categoria, colegio] = await Promise.all([
    Categoria.findByPk(categoriaId),
    Colegio.findByPk(colegioId),
  ]);
  if (!categoria) throw new AppError('La categoría no existe', 400);
  if (!colegio) throw new AppError('El colegio no existe', 400);
}

// 🔓 Catálogo público: solo productos activos
exports.getProductosPublicos = async (req, res) => {
  const productos = await Producto.findAll({
    where: { ...filtrosDesdeQuery(req.query), activo: true },
    include: includeCompleto,
    order: orden,
  });
  res.json(productos);
};

exports.getProductoPublicoById = async (req, res) => {
  const producto = await Producto.findOne({
    where: { id: req.params.id, activo: true },
    include: includeCompleto,
    order: orden,
  });
  if (!producto) throw new AppError('Producto no encontrado', 404);
  res.json(producto);
};

// 🔐 Admin
exports.getProductos = async (req, res) => {
  const productos = await Producto.findAll({
    where: filtrosDesdeQuery(req.query),
    include: includeCompleto,
    order: orden,
  });
  res.json(productos);
};

exports.getProductoById = async (req, res) => {
  const producto = await Producto.findByPk(req.params.id, { include: includeCompleto, order: orden });
  if (!producto) throw new AppError('Producto no encontrado', 404);
  res.json(producto);
};

exports.createProducto = async (req, res) => {
  await validarRelaciones(req.body);
  const producto = await Producto.create(req.body);
  res.status(201).json(producto);
};

exports.updateProducto = async (req, res) => {
  const producto = await Producto.findByPk(req.params.id);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  await validarRelaciones(req.body);
  await producto.update(req.body);
  res.json(producto);
};

exports.deleteProducto = async (req, res) => {
  const producto = await Producto.findByPk(req.params.id);
  if (!producto) throw new AppError('Producto no encontrado', 404);

  const imagenes = await Imagen.findAll({ where: { tipoEntidad: 'producto', entidadId: producto.id } });
  await sequelize.transaction(async (transaction) => {
    await Imagen.destroy({ where: { tipoEntidad: 'producto', entidadId: producto.id }, transaction });
    await producto.destroy({ transaction });
  });
  await Promise.all(
    imagenes.map((img) => fs.unlink(path.join(UPLOADS_DIR, path.basename(img.url))).catch(() => {}))
  );
  res.json({ mensaje: 'Producto eliminado' });
};
