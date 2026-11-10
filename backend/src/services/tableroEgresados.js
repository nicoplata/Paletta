// Tablero de la comisión: etapas de la promo, avance, pendientes por alumno y logros.
// Muestra nombres y estados, nunca DNI, datos de contacto ni montos de las familias.
const { EgrAlumno, EgrSeleccion, EgrCuota, EgrDiseno } = require('../models');
const { serializarDiseno } = require('./disenosEgresados');
const ENV = require('../config/env');
const { hoyAR, progreso, estadoCuota, datosCompletos, contratoPublico } = require('./egresados');

const EN_PRODUCCION = ['en_produccion', 'listo', 'entregado'];

const linkFamilias = (promo) => `${ENV.EGRESADOS_URL}/mi-promo/${promo.slug}`;
const linkComision = (promo) => `${ENV.EGRESADOS_URL}/mi-promo/comision/${promo.comisionToken}`;

function motivoDatos(a) {
  if (!a.ultimoIngreso && !a.dni) return 'nunca entró al link';
  if (!a.dni) return 'falta el DNI';
  return 'faltan los datos del adulto responsable';
}

function motivoPrendas(a) {
  if (!a.ultimoIngreso && !a.dni) return 'nunca entró al link';
  return 'no eligió prendas ni talles';
}

function motivoSena(a, p) {
  if (!a.ultimoIngreso && !a.dni) return 'nunca entró al link';
  if (!p.prendas) return 'falta elegir prendas';
  if (!p.plan) return 'falta elegir el plan de pago';
  return 'cuota 1 pendiente';
}

const ACCIONES = {
  datos: 'completar los datos',
  prendas: 'elegir prendas y talles',
  sena: 'pagar la cuota 1',
};

// publico = vista de "Mi curso" que abre cualquier familia con el código: los pagos van solo en totales
async function tableroComision(promo, { hoy = hoyAR(), publico = false } = {}) {
  const alumnos = await EgrAlumno.findAll({
    where: { promoId: promo.id },
    include: [
      { model: EgrSeleccion, as: 'selecciones', attributes: ['id'] },
      { model: EgrCuota, as: 'cuotas', attributes: ['id', 'numero', 'estado', 'vencimiento'] },
    ],
    order: [['nombre', 'ASC']],
  });

  const filas = alumnos.map((a) => {
    const p = progreso(a, a.selecciones, a.cuotas);
    return { a, p, vencidas: a.cuotas.filter((c) => estadoCuota(c, hoy) === 'vencida').length };
  });
  const N = filas.length;
  const paso = (clave, motivo) => {
    const pendientes = filas.filter((f) => !f.p[clave]).map((f) => ({ id: f.a.id, nombre: f.a.nombre, motivo: motivo(f.a, f.p) }));
    return { hechos: N - pendientes.length, total: N, completo: N > 0 && pendientes.length === 0, pendientes };
  };
  const pasos = {
    datos: paso('datos', motivoDatos),
    prendas: paso('prendas', motivoPrendas),
    sena: paso('sena', motivoSena),
  };

  const conPlan = filas.filter((f) => f.p.plan);
  const pagos = {
    conPlan: conPlan.length,
    alDia: conPlan.filter((f) => f.vencidas === 0).length,
    pendientes: conPlan.filter((f) => f.vencidas > 0).map((f) => ({ id: f.a.id, nombre: f.a.nombre })),
  };

  const integrantes = promo.comisionIntegrantes || [];
  const cargaCompleta = pasos.datos.completo && pasos.prendas.completo && pasos.sena.completo;
  const disenoAprobado = Boolean(promo.disenoAprobadoEl);
  const enProduccion = EN_PRODUCCION.includes(promo.estadoProduccion);
  const entregado = promo.estadoProduccion === 'entregado';

  const etapas = [
    { clave: 'creada', titulo: 'Promo creada', quien: 'Paletta', completa: true },
    { clave: 'comision', titulo: 'Comisión lista', quien: integrantes.length ? `${integrantes.length} integrante${integrantes.length === 1 ? '' : 's'}` : 'Comisión', completa: integrantes.length > 0 },
    { clave: 'datos', titulo: 'Datos de alumnos', quien: `${pasos.datos.hechos} de ${N}`, completa: pasos.datos.completo },
    { clave: 'prendas', titulo: 'Prendas y talles', quien: `${pasos.prendas.hechos} de ${N}`, completa: pasos.prendas.completo },
    { clave: 'sena', titulo: 'Cuota 1', quien: `${pasos.sena.hechos} de ${N}`, completa: pasos.sena.completo },
    { clave: 'diseno', titulo: 'Diseño final', quien: disenoAprobado ? `Aprobó ${promo.disenoAprobadoPor || 'la comisión'}` : 'Aprueba la comisión', completa: disenoAprobado, bloqueada: !disenoAprobado && !cargaCompleta },
    { clave: 'produccion', titulo: 'En producción', quien: 'Paletta', completa: enProduccion, bloqueada: !enProduccion && !disenoAprobado },
    {
      clave: 'entrega',
      titulo: 'Entrega',
      quien: entregado ? '¡Entregado!' : promo.estadoProduccion === 'listo' ? 'Listo para entregar' : promo.fechaEntrega ? `Estimada ${promo.fechaEntrega.split('-').reverse().join('/')}` : 'Fecha a confirmar',
      completa: entregado,
      bloqueada: !entregado && !enProduccion,
    },
  ];
  const actual = etapas.find((e) => !e.completa);
  etapas.forEach((e) => {
    e.estado = e.completa ? 'completa' : e === actual ? 'actual' : e.bloqueada ? 'bloqueada' : 'pendiente';
    delete e.bloqueada;
  });

  // Avance: hitos de la promo + 3 pasos por alumno (datos, prendas, cuota 1)
  const hitos = etapas.filter((e) => !['datos', 'prendas', 'sena'].includes(e.clave));
  const total = hitos.length + 3 * N;
  const hechos = hitos.filter((e) => e.completa).length + pasos.datos.hechos + pasos.prendas.hechos + pasos.sena.hechos;
  const porcentaje = total ? Math.round((hechos / total) * 100) : 0;

  let mensaje;
  if (!actual) mensaje = '¡Promo entregada! Gracias por elegirnos. 🎉';
  else if (actual.clave === 'comision') mensaje = 'Primer paso: sumen a la comisión con sus nombres, más abajo.';
  else if (['datos', 'prendas', 'sena'].includes(actual.clave)) {
    if (N === 0) mensaje = 'Compartan el link de la promo en el grupo del curso para que las familias empiecen a cargar.';
    else {
      const faltan = pasos[actual.clave].pendientes.length;
      const intro = porcentaje >= 75 ? '¡Ya casi!' : porcentaje >= 45 ? '¡Van por la mitad!' : '¡Arrancamos!';
      mensaje = `${intro} Faltan ${faltan} familia${faltan === 1 ? '' : 's'} para ${ACCIONES[actual.clave]}.`;
    }
  } else if (actual.clave === 'diseno') mensaje = '¡Todo cargado! Ya pueden aprobar el diseño final.';
  else if (actual.clave === 'produccion') mensaje = 'Diseño aprobado. Paletta está por empezar la producción.';
  else mensaje = promo.estadoProduccion === 'listo' ? '¡Las prendas están listas! Coordinamos la entrega.' : '¡Las prendas están en producción!';

  const completosTodo = filas.filter((f) => f.p.datos && f.p.prendas && f.p.plan).length;
  const logros = [
    { clave: 'comision', titulo: 'Comisión armada', icono: '🎽', logrado: integrantes.length > 0 },
    { clave: 'primeros10', titulo: N >= 10 ? 'Primeros 10 en cargar' : 'Primeros en cargar', icono: '🚀', logrado: N > 0 && pasos.datos.hechos >= Math.min(10, N) },
    { clave: 'mitad', titulo: 'Media promo con todo cargado', icono: '⚡', logrado: N > 0 && completosTodo >= N / 2 },
    { clave: 'talles', titulo: 'Todos los talles', icono: '💯', logrado: pasos.prendas.completo },
    { clave: 'sena', titulo: 'Cuota 1 al 100%', icono: '🧾', logrado: pasos.sena.completo },
    { clave: 'aldia', titulo: 'Todos al día', icono: '✅', logrado: N > 0 && pagos.conPlan === N && pagos.pendientes.length === 0 },
    { clave: 'diseno', titulo: 'Diseño aprobado', icono: '🎨', logrado: disenoAprobado },
  ];

  return {
    promo: {
      colegio: promo.colegio,
      curso: promo.curso,
      anio: promo.anio,
      fechaCierre: promo.fechaCierre,
      fechaEntrega: promo.fechaEntrega,
      estadoProduccion: promo.estadoProduccion,
      disenoAprobadoEl: promo.disenoAprobadoEl,
      disenoAprobadoPor: promo.disenoAprobadoPor,
      // El contrato firmado solo lo ve la comisión con su clave (no la vista pública con el código)
      contrato: publico ? null : contratoPublico(promo),
    },
    linkFamilias: linkFamilias(promo),
    publico,
    integrantes: publico ? integrantes.map((i) => ({ nombre: i.nombre })) : integrantes,
    alumnos: N,
    porcentaje,
    mensaje,
    etapas,
    pasos: publico ? { ...pasos, sena: { ...pasos.sena, pendientes: [] } } : pasos,
    pagos: publico ? { ...pagos, pendientes: [] } : pagos,
    logros,
    puedeAprobarDiseno: cargaCompleta && !disenoAprobado,
    // Diseños de la promo (armados en el diseñador): los ve la comisión al aprobar el diseño final
    disenos: (await EgrDiseno.findAll({ where: { promoId: promo.id }, order: [['createdAt', 'DESC']], limit: 4 })).map(serializarDiseno),
  };
}

module.exports = { tableroComision, linkFamilias, linkComision, datosCompletos };
