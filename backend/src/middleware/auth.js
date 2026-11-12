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
    if (decoded.conf) throw new Error('el permiso de confirmación no es una sesión');
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

// administrador: todo el panel · encargado: el trabajo diario (ver docs de roles en README)
const ROLES_PANEL = ['administrador', 'encargado'];
const soloAdmin = [verificarToken, verificarRolesPermitidos(['administrador'])];
const soloPanel = [verificarToken, verificarRolesPermitidos(ROLES_PANEL)];
// Para rutas que ya pasaron por soloPanel: deja seguir solo al administrador
const soloAdministrador = verificarRolesPermitidos(['administrador']);

// Acciones sensibles: piden haber reingresado la contraseña hace menos de 10 minutos.
// El frontend recibe 428 con requiereConfirmacion, pide la contraseña y reintenta con el header.
const MINUTOS_CONFIRMACION = 10;
const firmarConfirmacion = (usuario) => jwt.sign({ id: usuario.id, conf: true }, ENV.JWT_SECRET, { expiresIn: `${MINUTOS_CONFIRMACION}m` });
function requiereConfirmacion(req, res, next) {
  const token = req.get('x-confirmacion');
  try {
    const datos = token ? jwt.verify(token, ENV.JWT_SECRET) : null;
    if (datos && datos.conf && datos.id === req.usuario?.id) return next();
  } catch { /* vencido o inválido */ }
  return res.status(428).json({ error: 'Por seguridad, confirmá con tu contraseña para seguir.', requiereConfirmacion: true });
}

function firmarToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  });
}

module.exports = {
  verificarToken, verificarRolesPermitidos, soloAdmin, soloPanel, soloAdministrador, requiereConfirmacion, firmarConfirmacion, firmarToken,
  ROLES_PANEL, MINUTOS_CONFIRMACION,
};
