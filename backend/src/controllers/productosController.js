const fs = require('fs/promises');
const path = require('path');
const { Producto, Categoria, Imagen, Colegio, Variante, sequelize } = require('../models');
const { AppError } = require('../utils/errorHandler');
const { UPLOADS_DIR } = require('../middleware/upload');

const includeBase = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
  { model: Colegio, as: 'colegio', attributes: ['id', 'nombre', 'ciudad'] },
  { model: Imagen, as: 'imagenes', attributes: ['id', 'url', 'descripcion'] },
];
const atributosVariante = ['id', 'talle', 'stock', 'orden', 'activo'];
const includeAdmin = [...includeBase, { model: Variante, as: 'variantes', attributes: atributosVariante }];
const includePublico = [
  ...includeBase,
  { model: Variante, as: 'variantes', attributes: atributosVariante, where: { activo: true }, required: false },
];
const orden = [
  ['nombre', 'ASC'],
  [{ model: Imagen, as: 'imagenes' }, 'id', 'ASC'],
  [{ model: Variante, as: 'variantes' }, 'orden', 'ASC'],
  [{ model: Variante, as: 'variantes' }, 'id', 'ASC'],
];

const filtrosDesdeQuery = (query) => {
  const where = {};
  if (query.colegioId) where.colegioId = Number(query.colegioId);
  if (query.categoriaId) where.categoriaId = Number(query.categoriaId);
  return where;
};

async function validarRelaciones({ categoriaId, colegioId }) {
  const [categoria, colegio] = await Promise.all([Categoria.findByPk(categoriaId), Colegio.findByPk(colegioId)]);
  if (!categoria) throw new AppError('La categoría no existe', 400);
  if (!colegio) throw new AppError('El colegio no existe', 400);
}

// Sincroniza las variantes del producto: actualiza las que vienen con id, crea las nuevas
// y elimina las que ya no están. Los pedidos guardan una copia del talle, así que borrar es seguro.
async function sincronizarVariantes(productoId, variantes, transaction) {
  const actuales = await Variante.findAll({ where: { productoId }, transaction, lock: transaction.LOCK.UPDATE });
  const porId = new Map(actuales.map((v) => [v.id, v]));

  const conId = variantes.filter((v) => v.id);
  for (const v of conId) {
    if (!porId.has(v.id)) throw new AppError(`La variante ${v.id} no pertenece a este producto`, 400);
  }

  // 1) borrar las que ya no están (antes de renombrar, para no chocar con el índice único de talle)
  const conservar = new Set(conId.map((v) => v.id));
  const aEliminar = actuales.filter((v) => !conservar.has(v.id)).map((v) => v.id);
  if (aEliminar.length) await Variante.destroy({ where: { id: aEliminar }, transaction });

  // 2) actualizar existentes y 3) crear nuevas, respetando el orden recibido
  for (const [i, datos] of variantes.entries()) {
    const campos = { talle: datos.talle, stock: datos.stock, activo: datos.activo, orden: i };
    if (datos.id) await porId.get(datos.id).update(campos, { transaction });
    else await Variante.create({ productoId, ...campos }, { transaction });
  }
}

// 🔓 Catálogo público: solo productos activos
exports.getProductosPublicos = async (req, res) => {
  const productos = await Producto.findAll({
    where: { ...filtrosDesdeQuery(req.query), activo: true },
    include: includePublico,
    order: orden,
  });
  res.json(productos);
};

exports.getProductoPublicoById = async (req, res) => {
  const producto = await Producto.findOne({ where: { id: req.params.id, activo: true }, include: includePublico, order: orden });
  if (!producto) throw new AppError('Producto no encontrado', 404);
  res.json(producto);
};

// 🔐 Admin
exports.getProductos = async (req, res) => {
  const productos = await Producto.findAll({ where: filtrosDesdeQuery(req.query), include: includeAdmin, order: orden });
  res.json(productos);
};

exports.getProductoById = async (req, res) => {
  const producto = await Producto.findByPk(req.params.id, { include: includeAdmin, order: orden });
  if (!producto) throw new AppError('Producto no encontrado', 404);
  res.json(producto);
};

const recargar = (id) => Producto.findByPk(id, { include: includeAdmin, order: orden });

exports.createProducto = async (req, res) => {
  const { variantes, ...datos } = req.body;
  await validarRelaciones(datos);
  const id = await sequelize.transaction(async (transaction) => {
    const producto = await Producto.create(datos, { transaction });
    await sincronizarVariantes(producto.id, variantes, transaction);
    return producto.id;
  });
  res.status(201).json(await recargar(id));
};

exports.updateProducto = async (req, res) => {
  const producto = await Producto.findByPk(req.params.id);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  const { variantes, ...datos } = req.body;
  await validarRelaciones(datos);
  await sequelize.transaction(async (transaction) => {
    await producto.update(datos, { transaction });
    await sincronizarVariantes(producto.id, variantes, transaction);
  });
  res.json(await recargar(producto.id));
};

exports.deleteProducto = async (req, res) => {
  const producto = await Producto.findByPk(req.params.id);
  if (!producto) throw new AppError('Producto no encontrado', 404);

  const imagenes = await Imagen.findAll({ where: { tipoEntidad: 'producto', entidadId: producto.id } });
  await sequelize.transaction(async (transaction) => {
    await Imagen.destroy({ where: { tipoEntidad: 'producto', entidadId: producto.id }, transaction });
    await Variante.destroy({ where: { productoId: producto.id }, transaction });
    await producto.destroy({ transaction });
  });
  await Promise.all(
    imagenes.map((img) => fs.unlink(path.join(UPLOADS_DIR, path.basename(img.url))).catch(() => {}))
  );
  res.json({ mensaje: 'Producto eliminado' });
};

exports.includePublico = includePublico;
exports.ordenProductos = orden;
