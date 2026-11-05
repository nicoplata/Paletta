const { Cupon, ZonaEnvio } = require('../models');
const { AppError } = require('../utils/errorHandler');

// --- Cupones ---
exports.listarCupones = async (req, res) => {
  res.json(await Cupon.findAll({ order: [['activo', 'DESC'], ['createdAt', 'DESC']] }));
};

exports.crearCupon = async (req, res) => {
  res.status(201).json(await Cupon.create(req.body));
};

exports.actualizarCupon = async (req, res) => {
  const cupon = await Cupon.findByPk(req.params.id);
  if (!cupon) throw new AppError('Cupón no encontrado', 404);
  await cupon.update(req.body);
  res.json(cupon);
};

exports.eliminarCupon = async (req, res) => {
  const cupon = await Cupon.findByPk(req.params.id);
  if (!cupon) throw new AppError('Cupón no encontrado', 404);
  if (cupon.usos > 0) {
    throw new AppError('El cupón ya se usó en pedidos: desactivalo en lugar de eliminarlo', 409);
  }
  await cupon.destroy();
  res.json({ mensaje: 'Cupón eliminado' });
};

// --- Zonas de envío ---
exports.listarZonas = async (req, res) => {
  res.json(await ZonaEnvio.findAll({ order: [['cpDesde', 'ASC']] }));
};

exports.crearZona = async (req, res) => {
  res.status(201).json(await ZonaEnvio.create(req.body));
};

exports.actualizarZona = async (req, res) => {
  const zona = await ZonaEnvio.findByPk(req.params.id);
  if (!zona) throw new AppError('Zona no encontrada', 404);
  await zona.update(req.body);
  res.json(zona);
};

exports.eliminarZona = async (req, res) => {
  const zona = await ZonaEnvio.findByPk(req.params.id);
  if (!zona) throw new AppError('Zona no encontrada', 404);
  await zona.destroy();
  res.json({ mensaje: 'Zona eliminada' });
};
