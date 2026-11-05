const { Categoria, Producto } = require('../models');
const { AppError } = require('../utils/errorHandler');

exports.getCategorias = async (req, res) => {
  const categorias = await Categoria.findAll({ order: [['nombre', 'ASC']] });
  res.json(categorias);
};

exports.getCategoriaById = async (req, res) => {
  const categoria = await Categoria.findByPk(req.params.id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404);
  res.json(categoria);
};

exports.createCategoria = async (req, res) => {
  const categoria = await Categoria.create(req.body);
  res.status(201).json(categoria);
};

exports.updateCategoria = async (req, res) => {
  const categoria = await Categoria.findByPk(req.params.id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404);
  await categoria.update(req.body);
  res.json(categoria);
};

exports.deleteCategoria = async (req, res) => {
  const categoria = await Categoria.findByPk(req.params.id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404);
  const enUso = await Producto.count({ where: { categoriaId: categoria.id } });
  if (enUso > 0) {
    throw new AppError(`No se puede eliminar: hay ${enUso} producto(s) en esta categoría`, 409);
  }
  await categoria.destroy();
  res.json({ mensaje: 'Categoría eliminada' });
};
