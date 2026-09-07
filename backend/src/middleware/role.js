const { ROLES } = require('../config/roles');

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !user.rol) {
      return res.status(403).json({ message: 'Acceso denegado: usuario no autenticado o sin rol definido.' });
    }

    if (!allowedRoles.includes(user.rol)) {
      return res.status(403).json({ message: 'Acceso denegado: rol no autorizado.' });
    }

    next();
  };
}

module.exports = authorizeRoles;
