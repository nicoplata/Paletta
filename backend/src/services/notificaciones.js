// Notificaciones internas del panel (campanita). Se crean cuando pasa algo que el equipo tiene que ver.
// "clave" evita repetir el mismo aviso; soloAdmin las oculta al rol encargado.
const { Op } = require('sequelize');
const { Notificacion, User } = require('../models');

async function notificar({ tipo, titulo, texto = null, link = null, clave = null, soloAdmin = false }) {
  try {
    if (clave && await Notificacion.count({ where: { clave } })) return null;
    return await Notificacion.create({ tipo, titulo: titulo.slice(0, 200), texto: texto ? String(texto).slice(0, 500) : null, link, clave, soloAdmin });
  } catch (err) {
    if (err.name !== 'SequelizeUniqueConstraintError') console.error('[notificaciones]', err.message);
    return null;
  }
}

const visiblesPara = (usuario) => (usuario.rol === 'administrador' ? {} : { soloAdmin: false });

async function listarPara(usuarioId, { limite = 40 } = {}) {
  const usuario = await User.findByPk(usuarioId);
  const where = visiblesPara(usuario);
  const desde = usuario.notifLeidasHasta || new Date(0);
  const [items, noLeidas] = await Promise.all([
    Notificacion.findAll({ where, order: [['createdAt', 'DESC']], limit: limite }),
    Notificacion.count({ where: { ...where, createdAt: { [Op.gt]: desde } } }),
  ]);
  return {
    noLeidas,
    items: items.map((n) => ({ id: n.id, tipo: n.tipo, titulo: n.titulo, texto: n.texto, link: n.link, fecha: n.createdAt, leida: n.createdAt <= desde })),
  };
}

async function marcarLeidas(usuarioId) {
  await User.update({ notifLeidasHasta: new Date() }, { where: { id: usuarioId } });
}

module.exports = { notificar, listarPara, marcarLeidas };
