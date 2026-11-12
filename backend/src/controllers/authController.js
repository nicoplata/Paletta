const { User } = require('../models');
const { firmarToken, firmarConfirmacion, MINUTOS_CONFIRMACION } = require('../middleware/auth');
const { registrar } = require('../services/actividad');
const { AppError } = require('../utils/errorHandler');

const bcrypt = require('bcrypt');

// Hash de referencia para igualar tiempos cuando el email no existe (evita enumerar usuarios).
const HASH_FALSO = bcrypt.hashSync('paletta-hash-de-referencia', 10);

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const usuario = await User.scope('conPassword').findOne({ where: { email: email.toLowerCase() } });

  const valida = usuario
    ? await usuario.compararPassword(password)
    : await bcrypt.compare(password, HASH_FALSO).then(() => false);

  if (!valida) throw new AppError('Email o contraseña incorrectos', 401);

  res.json({
    token: firmarToken(usuario),
    rol: usuario.rol,
    usuario: usuario.toJSON(),
  });
};

exports.me = async (req, res) => {
  res.json({ usuario: req.usuario });
};

// Reingreso de la contraseña antes de una acción sensible: devuelve un permiso corto (10 minutos)
exports.confirmar = async (req, res) => {
  const usuario = await User.scope('conPassword').findByPk(req.usuario.id);
  if (!usuario || !await usuario.compararPassword(req.body.password)) {
    await registrar(req, { accion: 'confirmacion_fallida', descripcion: 'Contraseña incorrecta al confirmar una acción sensible', sensible: true });
    throw new AppError('La contraseña no es correcta', 401);
  }
  res.json({ token: firmarConfirmacion(usuario), minutos: MINUTOS_CONFIRMACION });
};
