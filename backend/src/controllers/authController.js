const { User } = require('../models');
const { firmarToken } = require('../middleware/auth');
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
