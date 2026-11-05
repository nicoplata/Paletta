const jwt = require('jsonwebtoken');
const ENV = require('../config/env');
const { User } = require('../models');

// Verifica el JWT y que el usuario siga existiendo (un usuario borrado no puede seguir operando).
async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), ENV.JWT_SECRET);
    const usuario = await User.findByPk(decoded.id);
    if (!usuario) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }
    req.usuario = { id: usuario.id, rol: usuario.rol, email: usuario.email, nombre: usuario.nombre };
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

function verificarRolesPermitidos(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tenés permisos para esta acción' });
    }
    next();
  };
}

const soloAdmin = [verificarToken, verificarRolesPermitidos(['administrador'])];

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });
}

module.exports = { verificarToken, verificarRolesPermitidos, soloAdmin, firmarToken };
