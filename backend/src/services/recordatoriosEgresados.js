// Recordatorios automáticos por mail a las familias de egresados:
//  - cierre de la carga: 7 y 2 días antes, a quienes no terminaron (prendas o plan);
//  - cuotas: hasta 3 días antes del vencimiento y una vez vencida (dentro de la semana).
// Cada aviso se registra en EgrAvisos con una clave única: nunca se manda dos veces.
const { Op, UniqueConstraintError } = require('sequelize');
const { EgrPromo, EgrAlumno, EgrSeleccion, EgrCuota, EgrAviso } = require('../models');
const ENV = require('../config/env');
const { enviarMail, mailConfigurado } = require('./mail');
const { hoyAR, progreso, serializarCuota } = require('./egresados');
const { linkFamilias } = require('./tableroEgresados');

const diasEntre = (desde, hasta) => Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000);
const fecha = (iso) => iso.split('-').reverse().join('/');
const pesos = (n) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
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

function avisoCierre(alumno, promo, dias, p) {
  const falta = !p.prendas ? 'elegir las prendas y los talles' : 'elegir el plan de pago';
  const cuando = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días (${fecha(promo.fechaCierre)})`;
  return armarMail({
    alumno,
    promo,
    titulo: `Falta poco: la carga de la promo cierra ${dias <= 1 ? cuando : `en ${dias} días`}`,
    parrafos: [
      `A ${alumno.nombre} le falta ${falta} en el portal de la promo. La carga cierra ${cuando}: después ya no se pueden hacer cambios.`,
      'Te lleva un par de minutos.',
    ],
    boton: 'Completar ahora',
  });
}

function avisoCuota(alumno, promo, cuota, vencida) {
  const datos = [`Cuota ${cuota.numero} de ${alumno.nombre}: ${pesos(cuota.aPagar)}${cuota.recargo ? ` (incluye ${pesos(cuota.recargo)} de recargo)` : ''}.`, `Código para el pago: ${cuota.codigo}.`];
  return armarMail({
    alumno,
    promo,
    titulo: vencida ? `La cuota ${cuota.numero} de ${alumno.nombre} está vencida` : `La cuota ${cuota.numero} vence el ${fecha(cuota.vencimiento)}`,
    parrafos: vencida
      ? [`La cuota venció el ${fecha(cuota.vencimiento)} y todavía no figura como paga.`, ...datos, 'Si ya la pagaste, avisanos desde el portal con el botón “Avisar que pagué”.']
      : [`Te recordamos que la cuota vence el ${fecha(cuota.vencimiento)}.`, ...datos, 'Podés pagar en efectivo en el local o por transferencia: los datos están en la cuponera.'],
    boton: 'Ver mi cuponera',
  });
}

// Registra el aviso y lo envía; si el envío falla, lo borra para reintentar en la próxima corrida.
async function enviarUnaVez(alumno, clave, mail, enviar) {
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

async function ejecutarRecordatorios({ hoy = hoyAR(), enviar = enviarMail, forzar = false } = {}) {
  if (!forzar && !mailConfigurado()) return { enviados: 0, errores: 0, sinMail: true };
  const promos = await EgrPromo.findAll({ where: { activo: true, estadoProduccion: { [Op.ne]: 'entregado' } } });
  let enviados = 0;
  let errores = 0;

  for (const promo of promos) {
    const alumnos = await EgrAlumno.findAll({
      where: { promoId: promo.id, responsableEmail: { [Op.ne]: null } },
      include: [
        { model: EgrSeleccion, as: 'selecciones', attributes: ['id'] },
        { model: EgrCuota, as: 'cuotas' },
      ],
    });
    const diasCierre = promo.fechaCierre ? diasEntre(hoy, promo.fechaCierre) : null;

    for (const alumno of alumnos) {
      const tareas = [];
      const p = progreso(alumno, alumno.selecciones, alumno.cuotas);

      if (diasCierre !== null && diasCierre >= 0 && diasCierre <= 7 && (!p.prendas || !p.plan)) {
        const clave = `cierre-${promo.fechaCierre}-${diasCierre <= 2 ? 2 : 7}`;
        tareas.push([clave, avisoCierre(alumno, promo, diasCierre, p)]);
      }
      for (const c of alumno.cuotas) {
        if (c.estado === 'pagada') continue;
        const d = diasEntre(hoy, c.vencimiento);
        const cuota = serializarCuota(promo, alumno, c, hoy);
        if (d >= 0 && d <= 3) tareas.push([`cuota-${c.id}-${c.vencimiento}-previo`, avisoCuota(alumno, promo, cuota, false)]);
        else if (d <= -1 && d >= -7) tareas.push([`cuota-${c.id}-${c.vencimiento}-vencida`, avisoCuota(alumno, promo, cuota, true)]);
      }

      for (const [clave, mail] of tareas) {
        try {
          if (await enviarUnaVez(alumno, clave, mail, enviar)) enviados += 1;
        } catch (err) {
          errores += 1;
          if (!ENV.isTest) console.error(`Recordatorio ${clave} a ${alumno.responsableEmail} falló:`, err.message);
        }
      }
    }
  }
  return { enviados, errores };
}

// Corre cada hora, solo de 9 a 21 (hora de Buenos Aires) y solo si hay mail configurado.
function programarRecordatorios() {
  const correr = () => {
    const hora = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hour12: false }).format(new Date()));
    if (hora < 9 || hora >= 21 || !mailConfigurado()) return;
    ejecutarRecordatorios()
      .then((r) => { if (r.enviados || r.errores) console.log(`Recordatorios de egresados: ${r.enviados} enviados, ${r.errores} con error`); })
      .catch((err) => console.error('Error en recordatorios de egresados:', err.message));
  };
  setTimeout(correr, 60 * 1000).unref();
  setInterval(correr, 60 * 60 * 1000).unref();
}

module.exports = { ejecutarRecordatorios, programarRecordatorios, diasEntre };
