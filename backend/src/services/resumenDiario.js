// Pendientes del panel (para la campanita y el resumen diario por mail) y avisos de órdenes atrasadas.
const { Op } = require('sequelize');
const ENV = require('../config/env');
const { EgrPresupuesto, EgrCuota, Pedido, MensajeContacto, ProdOrden, ProdTaller, EgrPrenda, EgrPromo, User, Configuracion } = require('../models');
const { enviarMail, mailConfigurado } = require('./mail');
const { notificar } = require('./notificaciones');
const { hoyAR } = require('./egresados');
const { ROLES_PANEL } = require('../middleware/auth');

const ADMIN = `${ENV.SITE_URL}/admin/dashboard`;

async function pendientes(hoy = hoyAR()) {
  const [presupuestos, comprobantes, pedidosParaPreparar, mensajes, atrasadas] = await Promise.all([
    EgrPresupuesto.count({ where: { estado: 'nuevo' } }),
    EgrCuota.count({ where: { estado: 'informada' } }),
    Pedido.count({ where: { estado: 'pagado' } }),
    MensajeContacto.count({ where: { leido: false } }),
    ProdOrden.count({ where: { estado: { [Op.ne]: 'recibida' }, compromisoEl: { [Op.lt]: hoy } } }),
  ]);
  return [
    { clave: 'presupuestos', cantidad: presupuestos, texto: 'pedidos de presupuesto sin contestar', link: '/admin/dashboard/egresados/presupuestos' },
    { clave: 'comprobantes', cantidad: comprobantes, texto: 'comprobantes de pago para revisar', link: '/admin/dashboard/egresados/comprobantes' },
    { clave: 'pedidos', cantidad: pedidosParaPreparar, texto: 'pedidos de la tienda pagados para preparar', link: '/admin/dashboard/pedidos' },
    { clave: 'mensajes', cantidad: mensajes, texto: 'mensajes de contacto sin leer', link: '/admin/dashboard/mensajes' },
    { clave: 'atrasadas', cantidad: atrasadas, texto: 'órdenes de taller atrasadas', link: '/admin/dashboard/produccion?tab=talleres' },
  ];
}

// Una notificación por cada orden de taller que pasó su fecha de compromiso (una sola vez por orden y fecha)
async function avisarAtrasadas(hoy = hoyAR()) {
  const ordenes = await ProdOrden.findAll({
    where: { estado: { [Op.ne]: 'recibida' }, compromisoEl: { [Op.lt]: hoy } },
    include: [{ model: ProdTaller, as: 'taller' }, { model: EgrPrenda, as: 'prenda', include: [{ model: EgrPromo, as: 'promo' }] }],
  });
  for (const o of ordenes) {
    await notificar({
      tipo: 'atrasada', clave: `orden-atrasada-${o.id}-${o.compromisoEl}`,
      titulo: `Orden T-${String(o.id).padStart(4, '0')} atrasada (${o.taller?.nombre || 'taller'})`,
      texto: `${o.prenda?.nombre || ''} de ${o.prenda?.promo ? `${o.prenda.promo.colegio} ${o.prenda.promo.curso}` : 'una promo'}: tenía que volver el ${o.compromisoEl.split('-').reverse().join('/')}.`,
      link: o.prenda?.promo ? `/admin/dashboard/egresados/${o.prenda.promo.id}/produccion?ficha=talleres` : '/admin/dashboard/produccion?tab=talleres',
    });
  }
  return ordenes.length;
}

const CLAVE = 'resumen.diario';

// Mail a la mañana con lo pendiente, una vez por día, al administrador y al equipo
async function enviarResumen({ hoy = hoyAR(), forzar = false } = {}) {
  if (!mailConfigurado()) return { enviado: false, motivo: 'mail sin configurar' };
  const estado = await Configuracion.findByPk(CLAVE);
  if (!forzar && estado?.valor?.fecha === hoy) return { enviado: false, motivo: 'ya enviado hoy' };
  const lista = (await pendientes(hoy)).filter((p) => p.cantidad > 0);
  await Configuracion.upsert({ clave: CLAVE, valor: { fecha: hoy } });
  if (!lista.length) return { enviado: false, motivo: 'nada pendiente' };
  const destinatarios = await destinatariosResumen();
  if (!destinatarios.length) return { enviado: false, motivo: 'sin destinatarios' };
  const filas = lista.map((p) => `<li style="margin:6px 0"><a href="${ENV.SITE_URL}${p.link}" style="color:#8f141b;font-weight:700;text-decoration:none">${p.cantidad} ${p.texto}</a></li>`).join('');
  await enviarMail({
    to: destinatarios.join(', '),
    subject: `Paletta: lo pendiente de hoy (${lista.reduce((a, p) => a + p.cantidad, 0)})`,
    text: `Lo pendiente de hoy:\n${lista.map((p) => `- ${p.cantidad} ${p.texto}`).join('\n')}\n\nEntrá al panel: ${ADMIN}`,
    html: `<div style="font-family:Arial,sans-serif;color:#111;max-width:520px"><h2 style="margin:0 0 10px">Lo pendiente de hoy</h2><ul style="padding-left:18px">${filas}</ul><p><a href="${ADMIN}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#8f141b;color:#fff;text-decoration:none;font-weight:700">Abrir el panel</a></p><p style="color:#777;font-size:12px">Te llega porque estás en la lista del resumen diario del panel de Paletta.</p></div>`,
  });
  return { enviado: true, destinatarios: destinatarios.length, pendientes: lista.length };
}

// Usuarios del panel marcados para recibir el resumen (un usuario sin acceso al panel nunca lo recibe)
async function destinatariosResumen() {
  return (await User.findAll({ where: { rol: ROLES_PANEL, recibeResumen: true }, order: [['id', 'ASC']] })).map((u) => u.email);
}

function programarResumen() {
  const correr = () => {
    const hora = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hour12: false }).format(new Date()));
    avisarAtrasadas().catch((err) => console.error('[atrasadas]', err.message));
    if (hora >= 8 && hora < 20) enviarResumen().catch((err) => console.error('[resumen diario]', err.message));
  };
  setTimeout(correr, 90 * 1000).unref();
  setInterval(correr, 60 * 60 * 1000).unref();
}

module.exports = { pendientes, avisarAtrasadas, enviarResumen, programarResumen, destinatariosResumen };
