// controllers/categoriasController.js
const { Categoria, Producto } = require('../models');

// Obtener todas las categorías con sus productos asociados
exports.getCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.findAll({
      include: [{ model: Producto }],
    });
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

// Obtener una categoría por ID
exports.getCategoriaById = async (req, res) => {
  const { id } = req.params;
  try {
    const categoria = await Categoria.findByPk(id, {
      include: [{ model: Producto }],
    });
    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(categoria);
  } catch (error) {
    console.error('Error al obtener la categoría:', error);
    res.status(500).json({ error: 'Error al obtener la categoría' });
  }
};

// Crear una nueva categoría
exports.createCategoria = async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  try {
    const nuevaCategoria = await Categoria.create({ nombre, descripcion });
    res.status(201).json(nuevaCategoria);
  } catch (error) {
    console.error('Error al crear la categoría:', error);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
};

// Actualizar una categoría existente
exports.updateCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  try {
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    if (nombre) categoria.nombre = nombre;
    if (descripcion !== undefined) categoria.descripcion = descripcion;
    await categoria.save();
    res.json(categoria);
  } catch (error) {
    console.error('Error al actualizar la categoría:', error);
    res.status(500).json({ error: 'Error al actualizar la categoría' });
  }
};

// Eliminar una categoría
exports.deleteCategoria = async (req, res) => {
  const { id } = req.params;
  try {
    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    await categoria.destroy();
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) {
    console.error('Error al eliminar la categoría:', error);
    res.status(500).json({ error: 'Error al eliminar la categoría' });
  }
};
