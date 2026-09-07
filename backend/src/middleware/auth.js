const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

// Middleware para verificar que el token JWT sea válido
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token no proporcionado o formato incorrecto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded; // { id, rol }
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(403).json({ mensaje: 'Token inválido o expirado' });
  }
}

// Middleware para verificar que el usuario tenga alguno de los roles permitidos
function verificarRolesPermitidos(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: `Acceso denegado: se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`
      });
    }
    next();
  };
}

module.exports = {
  verificarToken,
  verificarRolesPermitidos
};

