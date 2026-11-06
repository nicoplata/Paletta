// Mails a las familias de egresados: plantilla común, envío sin repetir (EgrAvisos)
// y avisos puntuales (etapas de la promo, pago confirmado, comprobante rechazado).
const { Op, UniqueConstraintError } = require('sequelize');
const { EgrPromo, EgrAlumno, EgrCuota, EgrAviso } = require('../models');
const ENV = require('../config/env');
const { enviarMail, mailConfigurado } = require('./mail');
const { codigoCuota } = require('./egresados');

const linkFamilias = (promo) => `${ENV.EGRESADOS_URL}/mi-promo/${promo.slug}`;
const fecha = (iso) => String(iso).slice(0, 10).split('-').reverse().join('/');
const pesos = (n) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const escapar = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function armarMail({ alumno, promo, titulo, parrafos, boton }) {
  const link = linkFamilias(promo);
  const saludo = `Hola${alumno.responsableNombre ? `, ${alumno.responsableNombre.split(' ')[0]}` : ''}:`;
  const pie = `Paletta Egresados · ${promo.colegio} ${promo.curso} · Promo ${promo.anio}`;
  return {
    subject: titulo,
    text: [saludo, '', ...parrafos, '', `${boton}: ${link}`, '', pie].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0E0E12;max-width:560px">
      <p style="font-size:20px;font-weight:800;margin:0 0 12px">Paletta <span style="color:#D6362A;font-size:12px;letter-spacing:1px">EGRESADOS</span></p>
      <p>${escapar(saludo)}</p>${parrafos.map((p) => `<p>${escapar(p)}</p>`).join('')}
      <p><a href="${link}" style="display:inline-block;background:#8F141B;color:#F5F1E8;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">${escapar(boton)}</a></p>
      <p style="color:#55525B;font-size:13px">${escapar(pie)}</p></div>`,
  };
}

// Registra el aviso y lo envía; si el envío falla, lo borra para poder reintentar.
async function enviarUnaVez(alumno, clave, mail, enviar = enviarMail) {
  let aviso;
  try {
    aviso = await EgrAviso.create({ alumnoId: alumno.id, clave, email: alumno.responsableEmail });
  } catch (err) {
    if (err instanceof UniqueConstraintError) return false;
    throw err;
  }
  try {
    await enviar({ to: alumno.responsableEmail, ...mail });
    return true;
  } catch (err) {
    await aviso.destroy();
    throw err;
  }
}

// Ejecuta un aviso sin demorar la respuesta de la API (los errores solo se registran)
function enSegundoPlano(promesa, que) {
  promesa.catch((err) => { if (!ENV.isTest) console.error(`No se pudo enviar ${que}:`, err.message); });
}

const ETAPAS = {
  en_produccion: {
    titulo: (p) => `¡Arrancó la producción de la promo ${p.anio}!`,
    parrafos: () => ['Ya cerramos el pedido de la promo y las prendas entraron en producción.', 'Te vamos a avisar cuando estén listas para entregar.'],
  },
  listo: {
    titulo: () => '¡Las prendas de la promo están listas!',
    parrafos: (p) => [`Las prendas ya están terminadas.${p.fechaEntrega ? ` La entrega está prevista para el ${fecha(p.fechaEntrega)}.` : ' En breve coordinamos la entrega con la comisión.'}`, 'Recordá que para recibirlas tienen que estar todas las cuotas pagas.'],
  },
  entregado: {
    titulo: () => '¡Promo entregada! Gracias por elegirnos',
    parrafos: () => ['Las prendas de la promo ya fueron entregadas. ¡Que las disfruten!', 'Si algo no está bien, escribinos y lo resolvemos.'],
  },
};

async function avisarEtapa(promoId, estado, { enviar = enviarMail } = {}) {
  const etapa = ETAPAS[estado];
  if (!etapa || (!mailConfigurado() && enviar === enviarMail)) return 0;
  const promo = await EgrPromo.findByPk(promoId);
  const alumnos = await EgrAlumno.findAll({ where: { promoId, responsableEmail: { [Op.ne]: null } } });
  let enviados = 0;
  for (const alumno of alumnos) {
    const mail = armarMail({ alumno, promo, titulo: etapa.titulo(promo), parrafos: etapa.parrafos(promo), boton: 'Ver el estado del pedido' });
    try {
      if (await enviarUnaVez(alumno, `etapa-${estado}`, mail, enviar)) enviados += 1;
    } catch (err) {
      if (!ENV.isTest) console.error(`Aviso de etapa a ${alumno.responsableEmail} falló:`, err.message);
    }
  }
  return enviados;
}

async function datosCuota(cuotaId) {
  const cuota = await EgrCuota.findByPk(cuotaId);
  const alumno = await EgrAlumno.findByPk(cuota.alumnoId);
  const promo = await EgrPromo.findByPk(alumno.promoId);
  return { cuota, alumno, promo, codigo: codigoCuota(promo, alumno, cuota.numero) };
}

async function avisarPagoConfirmado(cuotaId, { enviar = enviarMail } = {}) {
  if (!mailConfigurado() && enviar === enviarMail) return false;
  const { cuota, alumno, promo, codigo } = await datosCuota(cuotaId);
  if (!alumno.responsableEmail || cuota.estado !== 'pagada') return false;
  const mail = armarMail({
    alumno,
    promo,
    titulo: `Recibimos el pago de la cuota ${cuota.numero} de ${alumno.nombre}`,
    parrafos: [
      `Registramos el pago de ${pesos(cuota.importe + (cuota.recargo || 0))} de la cuota ${cuota.numero} (código ${codigo}) el ${fecha(cuota.pagadaEl)}.`,
      '¡Gracias! En la cuponera del portal ya figura como paga.',
    ],
    boton: 'Ver mi cuponera',
  });
  return enviarUnaVez(alumno, `pago-${cuota.id}-${cuota.pagadaEl}`, mail, enviar);
}

async function avisarComprobanteRechazado(comprobante, { enviar = enviarMail } = {}) {
  if (!mailConfigurado() && enviar === enviarMail) return false;
  const { cuota, alumno, promo, codigo } = await datosCuota(comprobante.cuotaId);
  if (!alumno.responsableEmail) return false;
  const mail = armarMail({
    alumno,
    promo,
    titulo: `Revisá el comprobante de la cuota ${cuota.numero}`,
    parrafos: [
      `No pudimos confirmar el comprobante que subiste para la cuota ${cuota.numero} de ${alumno.nombre} (código ${codigo}).`,
      `Motivo: ${comprobante.motivoRechazo}`,
      'Podés subir uno nuevo desde la cuponera, o escribirnos por WhatsApp si tenés dudas.',
    ],
    boton: 'Subir otro comprobante',
  });
  return enviarUnaVez(alumno, `rechazo-${comprobante.id}`, mail, enviar);
}

module.exports = {
  linkFamilias,
  fecha,
  pesos,
  armarMail,
  enviarUnaVez,
  enSegundoPlano,
  avisarEtapa,
  avisarPagoConfirmado,
  avisarComprobanteRechazado,
};
