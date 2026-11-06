// Lógica del backoffice de egresados: totales, plan de cuotas, recargos, códigos y avance de cada alumno.
const crypto = require('crypto');
const { sequelize, Configuracion, EgrPromo, EgrPrenda, EgrAlumno, EgrSeleccion, EgrCuota, EgrComprobante } = require('../models');
const { AppError } = require('../utils/errorHandler');

const CLAVE_CUENTA = 'egresados.cuenta';
const DIAS_GRACIA_PRIMERA_CUOTA = 7;

// ---------- fechas (en hora de Buenos Aires, como texto YYYY-MM-DD) ----------
const hoyAR = (ahora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora);

const sumarDias = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

// Suma meses respetando fin de mes (31/01 + 1 mes = 28 o 29/02)
const sumarMeses = (fecha, meses) => {
  const [a, m, d] = fecha.split('-').map(Number);
  const base = new Date(Date.UTC(a, m - 1 + meses, 1, 12));
  const ultimo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 12)).getUTCDate();
  base.setUTCDate(Math.min(d, ultimo));
  return base.toISOString().slice(0, 10);
};

const redondear = (n) => Math.round(n);

// ---------- códigos ----------
const codigoAlumno = (promo, alumno) =>
  `EGR-${String(promo.anio).slice(-2)}-${String(promo.id).padStart(3, '0')}-${String(alumno.numero).padStart(2, '0')}`;
const codigoCuota = (promo, alumno, numero) => `${codigoAlumno(promo, alumno)}-${numero}`;
const REGEX_CODIGO = /^EGR-(\d{2})-(\d{1,6})-(\d{1,4})(?:-(\d{1,2}))?$/i;

const generarSlug = () => crypto.randomBytes(9).toString('base64url');

// ---------- montos ----------
function totalesAlumno(promo, alumno, selecciones) {
  const subtotal = selecciones.reduce((a, s) => a + s.precioUnitario * s.cantidad, 0);
  const ajuste = Number(alumno.ajuste) || 0;
  const base = Math.max(0, subtotal + ajuste);
  const descuento = alumno.plan === 1 ? redondear(base * (promo.descuentoContado / 100)) : 0;
  return { subtotal, ajuste, descuento, total: redondear(base - descuento) };
}

function recargoDe(promo, cuota, hoy = hoyAR()) {
  if (cuota.estado === 'pagada') return cuota.recargo || 0;
  if (cuota.estado === 'informada') return 0; // se calcula con la fecha del comprobante al confirmarlo
  if (!(cuota.vencimiento < hoy) || !promo.recargoTipo || !promo.recargoValor) return 0;
  return promo.recargoTipo === 'porcentaje'
    ? redondear(cuota.importe * (promo.recargoValor / 100))
    : redondear(promo.recargoValor);
}

const estadoCuota = (cuota, hoy = hoyAR()) => {
  if (cuota.estado === 'pagada' || cuota.estado === 'informada') return cuota.estado;
  return cuota.vencimiento < hoy ? 'vencida' : 'pendiente';
};

function serializarCuota(promo, alumno, cuota, hoy = hoyAR()) {
  const recargo = recargoDe(promo, cuota, hoy);
  const ultimo = (cuota.comprobantes || []).slice().sort((a, b) => b.id - a.id)[0];
  return {
    comprobante: ultimo ? {
      id: ultimo.id, estado: ultimo.estado, motivoRechazo: ultimo.motivoRechazo, subidoEl: ultimo.createdAt, tipo: ultimo.tipo,
    } : null,
    id: cuota.id,
    numero: cuota.numero,
    codigo: codigoCuota(promo, alumno, cuota.numero),
    importe: cuota.importe,
    vencimiento: cuota.vencimiento,
    estado: estadoCuota(cuota, hoy),
    recargo,
    aPagar: cuota.estado === 'pagada' ? cuota.importe + (cuota.recargo || 0) : cuota.importe + recargo,
    pagadaEl: cuota.pagadaEl,
    medio: cuota.medio,
  };
}

// ---------- reglas ----------
const datosCompletos = (a) => Boolean(a.dni && a.responsableNombre && a.responsableEmail && a.responsableTelefono);

function bloqueos(promo, cuotas, hoy = hoyAR()) {
  const cerrado = Boolean(promo.fechaCierre && promo.fechaCierre < hoy);
  // Con un pago (o un comprobante en revisión) el pedido queda confirmado
  const conPagos = cuotas.some((c) => c.estado !== 'pendiente');
  const puedeEditarPedido = promo.activo && !cerrado && !conPagos;
  return { cerrado, conPagos, puedeEditarPedido };
}

// Avance de un alumno (lo usan el panel y, en la entrega 2, el tablero de la comisión)
function progreso(alumno, selecciones, cuotas) {
  const primera = cuotas.find((c) => c.numero === 1);
  return {
    ingreso: Boolean(alumno.ultimoIngreso),
    datos: datosCompletos(alumno),
    prendas: selecciones.length > 0,
    plan: Boolean(alumno.plan) && cuotas.length > 0,
    sena: Boolean(primera && primera.estado === 'pagada'),
  };
}

// Qué le falta a un alumno, en palabras (para el panel y el tablero)
function pendientes(alumno, selecciones, cuotas) {
  const p = progreso(alumno, selecciones, cuotas);
  if (!p.ingreso && !alumno.dni) return ['nunca entró al link'];
  const faltan = [];
  if (!alumno.dni) faltan.push('falta DNI');
  if (!alumno.responsableNombre || !alumno.responsableEmail || !alumno.responsableTelefono) faltan.push('faltan datos del adulto responsable');
  if (!p.prendas) faltan.push('faltan prendas y talles');
  else if (!p.plan) faltan.push('falta elegir el plan de pago');
  else if (!p.sena) faltan.push('falta pagar la cuota 1');
  return faltan;
}

/**
 * Rearma las cuotas pendientes del alumno según su plan y su total.
 * Las cuotas pagadas no se tocan: lo que falta pagar se reparte entre las cuotas que quedan.
 */
async function regenerarCuotas(alumnoId, { transaction, hoy = hoyAR() } = {}) {
  const alumno = await EgrAlumno.findByPk(alumnoId, { transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  const promo = await EgrPromo.findByPk(alumno.promoId, { transaction });
  const selecciones = await EgrSeleccion.findAll({ where: { alumnoId }, transaction });
  const cuotas = await EgrCuota.findAll({ where: { alumnoId }, order: [['numero', 'ASC']], transaction });
  // Las cuotas pagadas o con comprobante en revisión no se tocan
  const pagadas = cuotas.filter((c) => c.estado !== 'pendiente');

  await EgrCuota.destroy({ where: { alumnoId, estado: 'pendiente' }, transaction });
  if (!alumno.plan || selecciones.length === 0) return;

  const { total } = totalesAlumno(promo, alumno, selecciones);
  const pagado = pagadas.reduce((a, c) => a + c.importe, 0);
  let restante = total - pagado;
  if (restante <= 0) return;

  const usados = new Set(pagadas.map((c) => c.numero));
  let numeros = [];
  for (let n = 1; n <= alumno.plan; n += 1) if (!usados.has(n)) numeros.push(n);
  // Ya pagó todas las cuotas del plan pero el total subió (ajuste o prendas): cuota adicional
  if (numeros.length === 0) numeros = [Math.max(alumno.plan, ...usados) + 1];

  // Calendario: mensual desde el primer vencimiento; si ya pasó, desde dentro de una semana
  const minimo = sumarDias(hoy, DIAS_GRACIA_PRIMERA_CUOTA);
  const inicio = promo.primerVencimiento < minimo && pagadas.length === 0 ? minimo : promo.primerVencimiento;
  const base = Math.floor(restante / numeros.length);

  const nuevas = numeros.map((numero, i) => {
    const importe = i === numeros.length - 1 ? restante : base;
    restante -= importe;
    let vencimiento = sumarMeses(inicio, numero - 1);
    if (vencimiento < hoy) vencimiento = minimo;
    return { alumnoId, numero, importe, vencimiento };
  });
  await EgrCuota.bulkCreate(nuevas, { transaction });
}

// ---------- configuración ----------
async function cuentaEgresados() {
  const fila = await Configuracion.findByPk(CLAVE_CUENTA);
  return fila ? fila.valor : {};
}

async function guardarCuentaEgresados(valor) {
  await Configuracion.upsert({ clave: CLAVE_CUENTA, valor });
  return valor;
}

// ---------- vistas ----------
async function cargarAlumno(alumnoId, transaction) {
  const alumno = await EgrAlumno.findByPk(alumnoId, {
    include: [
      { model: EgrPromo, as: 'promo' },
      { model: EgrSeleccion, as: 'selecciones', include: [{ model: EgrPrenda, as: 'prenda' }] },
      { model: EgrCuota, as: 'cuotas', include: [{ model: EgrComprobante, as: 'comprobantes' }] },
    ],
    order: [[{ model: EgrSeleccion, as: 'selecciones' }, 'id', 'ASC'], [{ model: EgrCuota, as: 'cuotas' }, 'numero', 'ASC']],
    transaction,
  });
  if (!alumno) throw new AppError('Alumno no encontrado', 404);
  return alumno;
}

function serializarSeleccion(s) {
  return {
    id: s.id,
    prendaId: s.prendaId,
    prenda: s.prenda ? s.prenda.nombre : undefined,
    talle: s.talle,
    bordado: s.bordado,
    cantidad: s.cantidad,
    precioUnitario: s.precioUnitario,
  };
}

function resumenAlumno(alumno, hoy = hoyAR()) {
  const { promo, selecciones = [], cuotas = [] } = alumno;
  const totales = totalesAlumno(promo, alumno, selecciones);
  const pagado = cuotas.filter((c) => c.estado === 'pagada').reduce((a, c) => a + c.importe, 0);
  return {
    id: alumno.id,
    numero: alumno.numero,
    codigo: codigoAlumno(promo, alumno),
    nombre: alumno.nombre,
    dni: alumno.dni,
    responsableNombre: alumno.responsableNombre,
    responsableEmail: alumno.responsableEmail,
    responsableTelefono: alumno.responsableTelefono,
    plan: alumno.plan,
    ajuste: alumno.ajuste,
    ajusteMotivo: alumno.ajusteMotivo,
    agregadoPorFamilia: alumno.agregadoPorFamilia,
    ultimoIngreso: alumno.ultimoIngreso,
    selecciones: selecciones.map(serializarSeleccion),
    cuotas: cuotas.map((c) => serializarCuota(promo, alumno, c, hoy)),
    totales: { ...totales, pagado, saldo: Math.max(0, totales.total - pagado) },
    progreso: progreso(alumno, selecciones, cuotas),
    pendientes: pendientes(alumno, selecciones, cuotas),
    bloqueos: bloqueos(promo, cuotas, hoy),
  };
}

const serializarPromoPublica = (promo, prendas = []) => ({
  colegio: promo.colegio,
  curso: promo.curso,
  anio: promo.anio,
  planes: promo.planes,
  descuentoContado: promo.descuentoContado,
  recargoTipo: promo.recargoTipo,
  recargoValor: promo.recargoValor,
  primerVencimiento: promo.primerVencimiento,
  fechaCierre: promo.fechaCierre,
  estadoProduccion: promo.estadoProduccion,
  fechaEntrega: promo.fechaEntrega,
  prendas: prendas.filter((p) => p.activo).sort((a, b) => a.orden - b.orden || a.id - b.id).map((p) => ({
    id: p.id, nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, talles: p.talles, conBordado: p.conBordado,
  })),
});

async function vistaFamilia(alumnoId) {
  const alumno = await cargarAlumno(alumnoId);
  const prendas = await EgrPrenda.findAll({ where: { promoId: alumno.promoId } });
  return {
    alumno: resumenAlumno(alumno),
    promo: serializarPromoPublica(alumno.promo, prendas),
    cuenta: await cuentaEgresados(),
  };
}

/**
 * Reemplaza las prendas elegidas por un alumno. Valida que cada prenda sea de su promo,
 * que el talle exista y que el bordado esté permitido. Rearma las cuotas.
 */
async function guardarSelecciones(alumnoId, items, { comoAdmin = false } = {}) {
  return sequelize.transaction(async (transaction) => {
    const alumno = await EgrAlumno.findByPk(alumnoId, { transaction, lock: transaction.LOCK.UPDATE });
    const promo = await EgrPromo.findByPk(alumno.promoId, { transaction });
    const cuotas = await EgrCuota.findAll({ where: { alumnoId }, transaction });
    if (!comoAdmin) {
      const b = bloqueos(promo, cuotas);
      if (!b.puedeEditarPedido) {
        throw new AppError(b.conPagos
          ? 'Ya hay pagos registrados: para cambiar prendas o talles escribinos.'
          : 'El pedido de la promo ya cerró: para cambios escribinos.', 409);
      }
    }
    const prendas = await EgrPrenda.findAll({ where: { promoId: promo.id }, transaction });
    const porId = new Map(prendas.map((p) => [p.id, p]));
    const filas = items.map((it) => {
      const prenda = porId.get(it.prendaId);
      if (!prenda || (!prenda.activo && !comoAdmin)) throw new AppError('Una de las prendas elegidas no está disponible', 400);
      if (!prenda.talles.includes(it.talle)) throw new AppError(`El talle ${it.talle} no existe para ${prenda.nombre}`, 400);
      const bordado = prenda.conBordado ? (it.bordado || '').trim() || null : null;
      return { alumnoId, prendaId: prenda.id, talle: it.talle, bordado, cantidad: it.cantidad || 1, precioUnitario: prenda.precio };
    });
    await EgrSeleccion.destroy({ where: { alumnoId }, transaction });
    if (filas.length) await EgrSeleccion.bulkCreate(filas, { transaction });
    await regenerarCuotas(alumnoId, { transaction });
  });
}

async function elegirPlan(alumnoId, plan, { comoAdmin = false } = {}) {
  return sequelize.transaction(async (transaction) => {
    const alumno = await EgrAlumno.findByPk(alumnoId, { transaction, lock: transaction.LOCK.UPDATE });
    const promo = await EgrPromo.findByPk(alumno.promoId, { transaction });
    if (plan !== null && !promo.planes.includes(plan) && !comoAdmin) throw new AppError('Ese plan de pago no está disponible para la promo', 400);
    if (!comoAdmin) {
      const cuotas = await EgrCuota.findAll({ where: { alumnoId }, transaction });
      const b = bloqueos(promo, cuotas);
      if (!b.puedeEditarPedido) {
        throw new AppError(b.conPagos ? 'Ya hay pagos registrados: para cambiar el plan escribinos.' : 'El pedido de la promo ya cerró.', 409);
      }
      if (!datosCompletos(alumno)) throw new AppError('Primero completá los datos del alumno y del adulto responsable.', 409);
      const n = await EgrSeleccion.count({ where: { alumnoId }, transaction });
      if (n === 0) throw new AppError('Primero elegí las prendas y los talles.', 409);
    }
    await alumno.update({ plan }, { transaction });
    await regenerarCuotas(alumnoId, { transaction });
  });
}

module.exports = {
  hoyAR,
  sumarDias,
  sumarMeses,
  codigoAlumno,
  codigoCuota,
  REGEX_CODIGO,
  generarSlug,
  totalesAlumno,
  recargoDe,
  estadoCuota,
  serializarCuota,
  datosCompletos,
  bloqueos,
  progreso,
  pendientes,
  regenerarCuotas,
  cuentaEgresados,
  guardarCuentaEgresados,
  cargarAlumno,
  resumenAlumno,
  serializarPromoPublica,
  vistaFamilia,
  guardarSelecciones,
  elegirPlan,
};
