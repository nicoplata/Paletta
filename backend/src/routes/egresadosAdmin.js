// Panel: gestión de promos de egresados, prendas, alumnos y cobranza.
const express = require('express');
const { Op } = require('sequelize');
const { sequelize, EgrPromo, EgrPrenda, EgrAlumno, EgrSeleccion, EgrCuota, EgrComprobante, EgrDiseno, EgrPresupuesto, ProdModelo, ProdMaterial, EgrFoto } = require('../models');
const multer = require('multer');
const galeria = require('../services/galeriaEgresados');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const v = require('../validators/egresados');
const { AppError } = require('../utils/errorHandler');
const ENV = require('../config/env');
const egr = require('../services/egresados');
const { linkComision, tableroComision } = require('../services/tableroEgresados');
const { ejecutarRecordatorios } = require('../services/recordatoriosEgresados');
const { mailConfigurado } = require('../services/mail');
const crypto = require('crypto');
const fs = require('fs');
const { enviarComprobante, recibirContrato, enviarContrato, rutaContrato } = require('../middleware/comprobante');
const contrato = require('../services/contratoEgresados');
const { generarCsv } = require('../utils/csv');
const avisos = require('../services/mailsEgresados');
const { serializarDiseno } = require('../services/disenosEgresados');

const nuevoTokenComision = () => crypto.randomBytes(16).toString('base64url');

async function codigoLibre(codigo, idActual) {
  const otra = await EgrPromo.findOne({ where: { codigoBusqueda: EgrPromo.normalizarCodigo(codigo) } });
  if (otra && otra.id !== Number(idActual)) throw new AppError(`El código ${codigo} ya lo usa otra promo (${otra.colegio} ${otra.curso} ${otra.anio}).`, 409);
}

const router = express.Router();
router.use(soloAdmin);
const conId = validar(v.idParam, 'params');

const linkPromo = (promo) => `${ENV.EGRESADOS_URL}/mi-promo/${promo.slug}`;
const conLinks = (promo) => ({
  ...promo.toJSON(), link: linkPromo(promo), linkComision: linkComision(promo), linkPortal: `${ENV.EGRESADOS_URL}/mi-promo/`,
});
const vacioANull = (obj, campos) => campos.forEach((c) => { if (obj[c] === '') obj[c] = null; });

async function buscarOFallar(Modelo, id, mensaje, opciones = {}) {
  const fila = await Modelo.findByPk(id, opciones);
  if (!fila) throw new AppError(mensaje, 404);
  return fila;
}

const includeAlumno = [
  { model: EgrSeleccion, as: 'selecciones', include: [{ model: EgrPrenda, as: 'prenda' }] },
  { model: EgrCuota, as: 'cuotas', include: [{ model: EgrComprobante, as: 'comprobantes' }] },
];

// Resumen de una promo a partir de sus alumnos ya serializados
function resumenPromo(alumnos) {
  const n = alumnos.length;
  const contar = (k) => alumnos.filter((a) => a.progreso[k]).length;
  return {
    alumnos: n,
    ingresaron: contar('ingreso'),
    datos: contar('datos'),
    prendas: contar('prendas'),
    plan: contar('plan'),
    sena: contar('sena'),
    total: alumnos.reduce((a, x) => a + (x.progreso.plan ? x.totales.total : 0), 0),
    cobrado: alumnos.reduce((a, x) => a + x.totales.pagado, 0),
    vencidas: alumnos.reduce((a, x) => a + x.cuotas.filter((c) => c.estado === 'vencida').length, 0),
  };
}

async function alumnosDe(promo) {
  const alumnos = await EgrAlumno.findAll({
    where: { promoId: promo.id },
    include: includeAlumno,
    order: [['nombre', 'ASC'], [{ model: EgrCuota, as: 'cuotas' }, 'numero', 'ASC']],
  });
  const hoy = egr.hoyAR();
  return alumnos.map((a) => { a.promo = promo; return egr.resumenAlumno(a, hoy); });
}

// ---------- promos ----------
router.get('/promos', async (req, res) => {
  const promos = await EgrPromo.findAll({ order: [['anio', 'DESC'], ['colegio', 'ASC'], ['curso', 'ASC']] });
  const salida = [];
  for (const promo of promos) {
    salida.push({ ...conLinks(promo), resumen: resumenPromo(await alumnosDe(promo)) });
  }
  res.json(salida);
});

router.post('/promos', validar(v.promoNueva), async (req, res) => {
  vacioANull(req.body, ['fechaCierre', 'fechaEntrega']);
  if (req.body.codigo) await codigoLibre(req.body.codigo);
  const { presupuestoId, ...datosPromo } = req.body;
  const presupuesto = presupuestoId ? await buscarOFallar(EgrPresupuesto, presupuestoId, 'Pedido de presupuesto no encontrado') : null;
  const promo = await EgrPromo.create({
    ...datosPromo,
    codigo: req.body.codigo || await egr.generarCodigo(req.body.anio),
    slug: egr.generarSlug(),
    comisionToken: nuevoTokenComision(),
    comisionClave: egr.generarClaveComision(),
  });
  if (presupuesto) {
    await presupuesto.update({ promoId: promo.id, estado: 'convertido' });
    if (presupuesto.disenoId) await EgrDiseno.update({ promoId: promo.id }, { where: { id: presupuesto.disenoId } });
  }
  res.status(201).json(conLinks(promo));
});

router.get('/promos/:id', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  const prendas = await EgrPrenda.findAll({ where: { promoId: promo.id }, order: [['orden', 'ASC'], ['id', 'ASC']] });
  const alumnos = await alumnosDe(promo);
  const tablero = await tableroComision(promo);
  const disenos = await EgrDiseno.findAll({ where: { promoId: promo.id }, order: [['createdAt', 'DESC']] });
  res.json({ ...conLinks(promo), disenos: disenos.map(serializarDiseno), prendas, alumnos, resumen: resumenPromo(alumnos), tablero: { porcentaje: tablero.porcentaje, etapas: tablero.etapas, mensaje: tablero.mensaje } });
});

router.put('/promos/:id', conId, validar(v.promoEdicion), async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  vacioANull(req.body, ['fechaCierre', 'fechaEntrega']);
  const cambiaCalendario = req.body.primerVencimiento && req.body.primerVencimiento !== promo.primerVencimiento;
  const cambiaDescuento = req.body.descuentoContado !== undefined && Number(req.body.descuentoContado) !== promo.descuentoContado;
  const { disenoAprobado, ...cambios } = req.body;
  if (cambios.codigo) await codigoLibre(cambios.codigo, promo.id);
  if (disenoAprobado === true && !promo.disenoAprobadoEl) Object.assign(cambios, { disenoAprobadoEl: new Date(), disenoAprobadoPor: 'Paletta' });
  if (disenoAprobado === false) Object.assign(cambios, { disenoAprobadoEl: null, disenoAprobadoPor: null });
  const estadoAnterior = promo.estadoProduccion;
  await promo.update(cambios);
  if (cambios.estadoProduccion && cambios.estadoProduccion !== estadoAnterior) {
    avisos.enSegundoPlano(avisos.avisarEtapa(promo.id, cambios.estadoProduccion), 'el aviso de etapa');
  }
  // Si cambian el calendario o el descuento, se rearman las cuotas pendientes de quienes ya eligieron plan
  if (cambiaCalendario || cambiaDescuento) {
    const ids = (await EgrAlumno.findAll({ where: { promoId: promo.id, plan: { [Op.ne]: null } }, attributes: ['id'] })).map((a) => a.id);
    for (const id of ids) {
      await sequelize.transaction((transaction) => egr.regenerarCuotas(id, { transaction }));
    }
  }
  res.json(conLinks(promo));
});

// Genera una clave nueva para la comisión (las sesiones abiertas con la anterior se cierran)
router.post('/promos/:id/comision/clave', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  await promo.update({ comisionClave: egr.generarClaveComision() });
  res.json(conLinks(promo));
});

// Genera un link nuevo para la comisión (el anterior deja de funcionar)
router.post('/promos/:id/comision/regenerar', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  await promo.update({ comisionToken: nuevoTokenComision() });
  res.json(conLinks(promo));
});

router.delete('/promos/:id', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  const pagos = await EgrCuota.count({ where: { estado: 'pagada' }, include: [{ model: EgrAlumno, as: 'alumno', where: { promoId: promo.id } }] });
  if (pagos) throw new AppError('La promo tiene pagos registrados: desactivala en lugar de borrarla.', 409);
  await sequelize.transaction(async (transaction) => {
    const ids = (await EgrAlumno.findAll({ where: { promoId: promo.id }, attributes: ['id'], transaction })).map((a) => a.id);
    if (ids.length) await EgrSeleccion.destroy({ where: { alumnoId: ids }, transaction });
    await promo.destroy({ transaction });
  });
  res.json({ mensaje: 'Promo eliminada' });
});

// ---------- prendas ----------
// Verifica la ficha técnica y los materiales elegidos para producción (y descarta los vacíos)
async function datosProduccion(datos) {
  if (datos.modeloId) await buscarOFallar(ProdModelo, datos.modeloId, 'La ficha técnica no existe');
  if (datos.materiales) {
    datos.materiales = Object.fromEntries(Object.entries(datos.materiales).filter(([, idMat]) => idMat));
    const ids = [...new Set(Object.values(datos.materiales))];
    if (ids.length && await ProdMaterial.count({ where: { id: ids } }) !== ids.length) throw new AppError('Alguno de los materiales elegidos no existe', 400);
  }
  return datos;
}

router.post('/promos/:id/prendas', conId, validar(v.prendaNueva), async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  res.status(201).json(await EgrPrenda.create({ ...await datosProduccion(req.body), promoId: promo.id }));
});

router.put('/prendas/:id', conId, validar(v.prendaEdicion), async (req, res) => {
  const prenda = await buscarOFallar(EgrPrenda, req.params.id, 'Prenda no encontrada');
  await prenda.update(await datosProduccion(req.body));
  res.json(prenda);
});

router.delete('/prendas/:id', conId, async (req, res) => {
  const prenda = await buscarOFallar(EgrPrenda, req.params.id, 'Prenda no encontrada');
  const usos = await EgrSeleccion.count({ where: { prendaId: prenda.id } });
  if (usos) throw new AppError(`${usos} alumno(s) ya eligieron esta prenda: desactivala en lugar de borrarla.`, 409);
  await prenda.destroy();
  res.json({ mensaje: 'Prenda eliminada' });
});

// ---------- alumnos ----------
router.post('/promos/:id/alumnos', conId, validar(v.alumnosNuevos), async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  const creados = await sequelize.transaction(async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(:clave)', { replacements: { clave: 7000000 + promo.id }, transaction });
    const existentes = await EgrAlumno.findAll({ where: { promoId: promo.id }, attributes: ['nombre', 'numero'], transaction });
    const ya = new Set(existentes.map((a) => a.nombre.toLowerCase()));
    let numero = existentes.reduce((m, a) => Math.max(m, a.numero), 0);
    const filas = [];
    for (const nombre of req.body.nombres) {
      const clave = nombre.toLowerCase();
      if (ya.has(clave)) continue;
      ya.add(clave);
      numero += 1;
      filas.push({ promoId: promo.id, nombre, numero });
    }
    return EgrAlumno.bulkCreate(filas, { transaction });
  });
  res.status(201).json({ creados: creados.length, omitidos: req.body.nombres.length - creados.length });
});

async function detalleAlumno(id) {
  const alumno = await egr.cargarAlumno(id);
  return egr.resumenAlumno(alumno);
}

router.get('/alumnos/:id', conId, async (req, res) => {
  const resumen = await detalleAlumno(req.params.id);
  const alumno = await EgrAlumno.findByPk(req.params.id, { include: [{ model: EgrPromo, as: 'promo' }] });
  const prendas = await EgrPrenda.findAll({ where: { promoId: alumno.promoId }, order: [['orden', 'ASC'], ['id', 'ASC']] });
  res.json({ ...resumen, promo: { id: alumno.promo.id, colegio: alumno.promo.colegio, curso: alumno.promo.curso, anio: alumno.promo.anio, planes: alumno.promo.planes }, prendas });
});

router.put('/alumnos/:id', conId, validar(v.alumnoAdmin), async (req, res) => {
  const alumno = await buscarOFallar(EgrAlumno, req.params.id, 'Alumno no encontrado');
  const { plan, ...resto } = req.body;
  if (resto.dni === '') resto.dni = null;
  if (resto.dni && resto.dni !== alumno.dni) {
    const repetido = await EgrAlumno.findOne({ where: { promoId: alumno.promoId, dni: resto.dni, id: { [Op.ne]: alumno.id } } });
    if (repetido) throw new AppError(`Ese DNI ya está registrado para ${repetido.nombre}.`, 409);
  }
  const cambiaAjuste = resto.ajuste !== undefined && resto.ajuste !== alumno.ajuste;
  await alumno.update(resto);
  if (plan !== undefined && plan !== alumno.plan) await egr.elegirPlan(alumno.id, plan, { comoAdmin: true });
  else if (cambiaAjuste) await sequelize.transaction((transaction) => egr.regenerarCuotas(alumno.id, { transaction }));
  res.json(await detalleAlumno(alumno.id));
});

router.put('/alumnos/:id/prendas', conId, validar(v.prendas), async (req, res) => {
  await buscarOFallar(EgrAlumno, req.params.id, 'Alumno no encontrado');
  await egr.guardarSelecciones(req.params.id, req.body.items, { comoAdmin: true });
  res.json(await detalleAlumno(req.params.id));
});

router.delete('/alumnos/:id', conId, async (req, res) => {
  const alumno = await buscarOFallar(EgrAlumno, req.params.id, 'Alumno no encontrado');
  const pagos = await EgrCuota.count({ where: { alumnoId: alumno.id, estado: 'pagada' } });
  if (pagos) throw new AppError('El alumno tiene pagos registrados: no se puede borrar.', 409);
  await sequelize.transaction(async (transaction) => {
    await EgrSeleccion.destroy({ where: { alumnoId: alumno.id }, transaction });
    await alumno.destroy({ transaction });
  });
  res.json({ mensaje: 'Alumno eliminado' });
});

// ---------- cobranza ----------
async function registrarPago(cuotaId, { medio, fecha, cobrarRecargo, nota }, transaction) {
  const cuota = await buscarOFallar(EgrCuota, cuotaId, 'Cuota no encontrada', { transaction, lock: transaction.LOCK.UPDATE });
  if (cuota.estado === 'pagada') throw new AppError('Esa cuota ya figura como pagada', 409);
  const alumno = await EgrAlumno.findByPk(cuota.alumnoId, { transaction });
  const promo = await EgrPromo.findByPk(alumno.promoId, { transaction });
  const dia = fecha || egr.hoyAR();
  // El recargo se calcula como si estuviera pendiente al día del pago
  const recargo = cobrarRecargo ? egr.recargoDe(promo, { ...cuota.get(), estado: 'pendiente' }, dia) : 0;
  await cuota.update({ estado: 'pagada', pagadaEl: dia, medio, recargo, nota }, { transaction });
  await EgrComprobante.update({ estado: 'aprobado', revisadoEl: new Date() }, { where: { cuotaId: cuota.id, estado: 'pendiente' }, transaction });
  return cuota;
}

router.post('/cuotas/:id/pago', conId, validar(v.pago), async (req, res) => {
  const cuota = await sequelize.transaction((transaction) => registrarPago(req.params.id, req.body, transaction));
  avisos.enSegundoPlano(avisos.avisarPagoConfirmado(cuota.id), 'el aviso de pago');
  res.json(await detalleAlumno(cuota.alumnoId));
});

router.delete('/cuotas/:id/pago', conId, async (req, res) => {
  const cuota = await buscarOFallar(EgrCuota, req.params.id, 'Cuota no encontrada');
  if (cuota.estado !== 'pagada') throw new AppError('Esa cuota no figura como pagada', 409);
  await cuota.update({ estado: 'pendiente', pagadaEl: null, medio: null, recargo: 0, nota: null });
  res.json(await detalleAlumno(cuota.alumnoId));
});

// Busca por código de cuota o alumno (EGR-27-014-07-2), DNI o nombre
router.get('/buscar', validar(v.buscar, 'query'), async (req, res) => {
  const q = req.query.q.trim();
  const codigo = q.toUpperCase().match(egr.REGEX_CODIGO);
  let where;
  if (codigo) {
    where = { promoId: Number(codigo[2]), numero: Number(codigo[3]) };
  } else if (/^[\d.\s]{7,10}$/.test(q)) {
    where = { dni: q.replace(/\D/g, '') };
  } else {
    where = { nombre: { [Op.iLike]: `%${q.replace(/[%_\\]/g, '\\$&')}%` } };
  }
  const alumnos = await EgrAlumno.findAll({
    where,
    include: [{ model: EgrPromo, as: 'promo' }, ...includeAlumno],
    order: [['nombre', 'ASC'], [{ model: EgrCuota, as: 'cuotas' }, 'numero', 'ASC']],
    limit: 20,
  });
  const hoy = egr.hoyAR();
  res.json(alumnos
    .filter((a) => !codigo || String(a.promo.anio).slice(-2) === codigo[1])
    .map((a) => ({
      ...egr.resumenAlumno(a, hoy),
      promo: { id: a.promo.id, colegio: a.promo.colegio, curso: a.promo.curso, anio: a.promo.anio },
      cuotaBuscada: codigo && codigo[4] ? Number(codigo[4]) : null,
    })));
});

// ---------- comprobantes de transferencia ----------
const fechaAR = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(d);

router.get('/comprobantes', validar(v.listarComprobantes, 'query'), async (req, res) => {
  const lista = await EgrComprobante.findAll({
    where: { estado: req.query.estado },
    include: [{
      model: EgrCuota,
      as: 'cuota',
      include: [{ model: EgrAlumno, as: 'alumno', include: [{ model: EgrPromo, as: 'promo' }] }],
    }],
    order: [['createdAt', req.query.estado === 'pendiente' ? 'ASC' : 'DESC']],
    limit: 200,
  });
  const hoy = egr.hoyAR();
  res.json(lista.map((c) => {
    const { cuota } = c;
    const { alumno } = cuota;
    const { promo } = alumno;
    const subidoEl = fechaAR(c.createdAt);
    return {
      id: c.id,
      estado: c.estado,
      motivoRechazo: c.motivoRechazo,
      tipo: c.tipo,
      nombreOriginal: c.nombreOriginal,
      subidoEl: c.createdAt,
      revisadoEl: c.revisadoEl,
      cuota: {
        ...egr.serializarCuota(promo, alumno, cuota, hoy),
        // lo que corresponde cobrar según el día en que subió el comprobante
        recargoAlSubir: egr.recargoDe(promo, { ...cuota.get(), estado: 'pendiente' }, subidoEl),
        estadoReal: cuota.estado,
      },
      subidoElDia: subidoEl,
      alumno: { id: alumno.id, nombre: alumno.nombre, codigo: egr.codigoAlumno(promo, alumno) },
      promo: { id: promo.id, colegio: promo.colegio, curso: promo.curso, anio: promo.anio },
    };
  }));
});

router.get('/comprobantes/:id/archivo', conId, async (req, res) => {
  enviarComprobante(res, await buscarOFallar(EgrComprobante, req.params.id, 'Comprobante no encontrado'));
});

router.post('/comprobantes/:id/aprobar', conId, validar(v.aprobarComprobante), async (req, res) => {
  const cuota = await sequelize.transaction(async (transaction) => {
    const comp = await buscarOFallar(EgrComprobante, req.params.id, 'Comprobante no encontrado', { transaction, lock: transaction.LOCK.UPDATE });
    if (comp.estado !== 'pendiente') throw new AppError('Ese comprobante ya fue revisado', 409);
    // Por defecto, la fecha de pago es el día en que la familia subió el comprobante
    return registrarPago(comp.cuotaId, { medio: 'transferencia', fecha: req.body.fecha || fechaAR(comp.createdAt), cobrarRecargo: true }, transaction);
  });
  avisos.enSegundoPlano(avisos.avisarPagoConfirmado(cuota.id), 'el aviso de pago');
  res.json(await detalleAlumno(cuota.alumnoId));
});

router.post('/comprobantes/:id/rechazar', conId, validar(v.rechazarComprobante), async (req, res) => {
  const comp = await sequelize.transaction(async (transaction) => {
    const c = await buscarOFallar(EgrComprobante, req.params.id, 'Comprobante no encontrado', { transaction, lock: transaction.LOCK.UPDATE });
    if (c.estado !== 'pendiente') throw new AppError('Ese comprobante ya fue revisado', 409);
    await c.update({ estado: 'rechazado', motivoRechazo: req.body.motivo, revisadoEl: new Date() }, { transaction });
    await EgrCuota.update({ estado: 'pendiente' }, { where: { id: c.cuotaId, estado: 'informada' }, transaction });
    return c;
  });
  avisos.enSegundoPlano(avisos.avisarComprobanteRechazado(comp), 'el aviso de rechazo');
  const cuota = await EgrCuota.findByPk(comp.cuotaId);
  res.json(await detalleAlumno(cuota.alumnoId));
});

// ---------- planillas (CSV para Excel) ----------
function enviarCsv(res, nombre, columnas, filas) {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${nombre}"`,
    'Cache-Control': 'no-store',
  });
  res.send(generarCsv(columnas, filas));
}

const nombreArchivo = (promo, tipo) => `egresados-${promo.anio}-${promo.colegio}-${promo.curso}-${tipo}.csv`
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9.-]+/g, '-').toLowerCase();

router.get('/promos/:id/exportar/:tipo', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  const alumnos = await alumnosDe(promo);

  if (req.params.tipo === 'prendas') {
    // Una fila por prenda elegida: para producción (corte, bordado, embolsado)
    const filas = alumnos.flatMap((a) => a.selecciones.map((s) => ({ a, s })));
    return enviarCsv(res, nombreArchivo(promo, 'prendas'), [
      { titulo: 'Alumno', valor: (f) => f.a.nombre },
      { titulo: 'Código', valor: (f) => f.a.codigo },
      { titulo: 'Prenda', valor: (f) => f.s.prenda },
      { titulo: 'Talle', valor: (f) => f.s.talle },
      { titulo: 'Bordado', valor: (f) => f.s.bordado || '' },
      { titulo: 'Cantidad', valor: (f) => f.s.cantidad },
      { titulo: 'Cuota 1 paga', valor: (f) => (f.a.progreso.sena ? 'Sí' : 'No') },
    ], filas);
  }
  if (req.params.tipo === 'talles') {
    // Resumen para cortar: cantidad por prenda y talle
    const conteo = new Map();
    alumnos.forEach((a) => a.selecciones.forEach((s) => {
      const clave = `${s.prenda}\u0000${s.talle}`;
      conteo.set(clave, (conteo.get(clave) || 0) + s.cantidad);
    }));
    const prendas = await EgrPrenda.findAll({ where: { promoId: promo.id } });
    const ordenTalle = (prenda, talle) => {
      const p = prendas.find((x) => x.nombre === prenda);
      return p ? p.talles.indexOf(talle) : 999;
    };
    const filas = [...conteo.entries()].map(([k, cantidad]) => {
      const [prenda, talle] = k.split('\u0000');
      return { prenda, talle, cantidad };
    }).sort((a, b) => a.prenda.localeCompare(b.prenda) || ordenTalle(a.prenda, a.talle) - ordenTalle(b.prenda, b.talle));
    return enviarCsv(res, nombreArchivo(promo, 'talles'), [
      { titulo: 'Prenda', valor: (f) => f.prenda },
      { titulo: 'Talle', valor: (f) => f.talle },
      { titulo: 'Cantidad', valor: (f) => f.cantidad },
    ], filas);
  }
  if (req.params.tipo === 'cobranza') {
    return enviarCsv(res, nombreArchivo(promo, 'cobranza'), [
      { titulo: 'Alumno', valor: (a) => a.nombre },
      { titulo: 'Código', valor: (a) => a.codigo },
      { titulo: 'DNI', valor: (a) => a.dni || '' },
      { titulo: 'Adulto responsable', valor: (a) => a.responsableNombre || '' },
      { titulo: 'WhatsApp', valor: (a) => a.responsableTelefono || '' },
      { titulo: 'Email', valor: (a) => a.responsableEmail || '' },
      { titulo: 'Plan', valor: (a) => (a.plan ? (a.plan === 1 ? 'Contado' : `${a.plan} cuotas`) : 'Sin elegir') },
      { titulo: 'Total', valor: (a) => (a.progreso.plan ? a.totales.total : null) },
      { titulo: 'Pagado', valor: (a) => a.totales.pagado },
      { titulo: 'Saldo', valor: (a) => (a.progreso.plan ? a.totales.saldo : null) },
      { titulo: 'Cuotas pagas', valor: (a) => a.cuotas.filter((c) => c.estado === 'pagada').length },
      { titulo: 'Cuotas vencidas', valor: (a) => a.cuotas.filter((c) => c.estado === 'vencida').length },
      { titulo: 'Comprobantes en revisión', valor: (a) => a.cuotas.filter((c) => c.estado === 'informada').length },
      { titulo: 'Pendiente', valor: (a) => a.pendientes.join(' · ') },
    ], alumnos);
  }
  throw new AppError('Planilla desconocida (prendas, talles o cobranza)', 404);
});

// ---------- galería de buzos (sitio de egresados) ----------
const MAX_FOTOS = 12;
const recibirFotos = (req, res, next) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: MAX_FOTOS },
  fileFilter: (r, file, cb) => (/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.mimetype)
    ? cb(null, true) : cb(new AppError(`“${file.originalname}” no es una foto (JPG, PNG, WEBP o AVIF).`, 400))),
}).array('fotos', MAX_FOTOS)(req, res, (err) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('Cada foto puede pesar hasta 15 MB.', 400));
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return next(new AppError(`Subí hasta ${MAX_FOTOS} fotos por vez.`, 400));
  }
  return next(err instanceof AppError ? err : new AppError('No se pudieron recibir las fotos', 400));
});

router.get('/fotos', async (req, res) => {
  const fotos = await EgrFoto.findAll({ order: [['orden', 'ASC'], ['id', 'DESC']] });
  res.json(fotos.map((f) => galeria.serializarFoto(f, { admin: true })));
});

// Subida en tanda: cada foto se optimiza y queda al principio de la galería con los datos comunes de la tanda
router.post('/fotos', recibirFotos, validar(v.fotosNuevas), async (req, res) => {
  if (!req.files?.length) throw new AppError('Elegí al menos una foto.', 400);
  const procesadas = [];
  const errores = [];
  for (const f of req.files) {
    try {
      procesadas.push({ ...await galeria.procesarFoto(f.buffer), nombre: f.originalname });
    } catch (err) {
      errores.push(`${f.originalname}: ${err.message}`);
    }
  }
  const primero = (await EgrFoto.min('orden')) ?? 0;
  const creadas = [];
  for (const [i, p] of procesadas.entries()) {
    creadas.push(await EgrFoto.create({
      archivo: p.archivo, ancho: p.ancho, alto: p.alto,
      tipo: req.body.tipo, anio: req.body.anio, colegio: req.body.colegio, visible: req.body.visible,
      alt: req.body.alt || [req.body.tipo === 'diseno' ? 'Diseño de buzo de egresados' : 'Buzo de egresados', req.body.colegio, req.body.anio].filter(Boolean).join(' · '),
      orden: primero - procesadas.length + i,
    }));
  }
  res.status(creadas.length ? 201 : 400).json({ fotos: creadas.map((f) => galeria.serializarFoto(f, { admin: true })), errores });
});

router.put('/fotos/orden', validar(v.ordenFotos), async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    for (const [i, id] of req.body.ids.entries()) await EgrFoto.update({ orden: i }, { where: { id }, transaction });
  });
  res.status(204).end();
});

router.put('/fotos/:id', conId, validar(v.fotoEdicion), async (req, res) => {
  const foto = await buscarOFallar(EgrFoto, req.params.id, 'Foto no encontrada');
  await foto.update(req.body);
  res.json(galeria.serializarFoto(foto, { admin: true }));
});

router.delete('/fotos/:id', conId, async (req, res) => {
  const foto = await buscarOFallar(EgrFoto, req.params.id, 'Foto no encontrada');
  await foto.destroy();
  galeria.borrarArchivos(foto.archivo);
  res.status(204).end();
});

// ---------- contrato ----------
// Datos para armar el contrato imprimible
router.get('/promos/:id/contrato/datos', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada', {
    include: [{ model: EgrPrenda, as: 'prendas' }, { model: EgrDiseno, as: 'disenos' }],
  });
  res.json({
    promo: { ...conLinks(promo), prendas: promo.prendas.filter((p) => p.activo).sort((a, b) => a.orden - b.orden || a.id - b.id) },
    disenos: promo.disenos.map(serializarDiseno),
    clausulas: await contrato.clausulas(),
    cuenta: await egr.cuentaEgresados(),
  });
});

router.get('/contrato/clausulas', async (req, res) => res.json({ clausulas: await contrato.clausulas(), base: contrato.CLAUSULAS_BASE }));
router.put('/contrato/clausulas', validar(v.clausulas), async (req, res) => res.json({ clausulas: await contrato.guardarClausulas(req.body.clausulas) }));

// Contrato firmado (escaneo o foto): reemplaza al anterior
router.post('/promos/:id/contrato', conId, recibirContrato, async (req, res) => {
  const promo = await EgrPromo.findByPk(req.params.id);
  if (!promo) {
    fs.rmSync(req.file.path, { force: true });
    throw new AppError('Promo no encontrada', 404);
  }
  const anterior = promo.contratoArchivo;
  await promo.update({ contratoArchivo: req.file.filename, contratoTipo: req.file.mimetype, contratoSubidoEl: new Date() });
  if (anterior) fs.rmSync(rutaContrato(anterior), { force: true });
  res.status(201).json({ contratoSubidoEl: promo.contratoSubidoEl, contratoTipo: promo.contratoTipo });
});

router.get('/promos/:id/contrato', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  if (!promo.contratoArchivo) throw new AppError('La promo no tiene contrato firmado cargado', 404);
  enviarContrato(res, promo);
});

router.delete('/promos/:id/contrato', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  if (promo.contratoArchivo) fs.rmSync(rutaContrato(promo.contratoArchivo), { force: true });
  await promo.update({ contratoArchivo: null, contratoTipo: null, contratoSubidoEl: null });
  res.status(204).end();
});

// ---------- diseños y pedidos de presupuesto (diseñador de egresados) ----------
const incluirPedido = [
  { model: EgrDiseno, as: 'diseno' },
  { model: EgrPromo, as: 'promo', attributes: ['id', 'codigo', 'colegio', 'curso', 'anio'] },
];

router.get('/presupuestos', validar(v.listarPresupuestos, 'query'), async (req, res) => {
  const where = req.query.estado === 'todos' ? {} : { estado: req.query.estado };
  const lista = await EgrPresupuesto.findAll({ where, include: incluirPedido, order: [['createdAt', 'DESC']], limit: 300 });
  res.json(lista.map((p) => ({ ...p.toJSON(), diseno: p.diseno ? serializarDiseno(p.diseno) : null })));
});

router.patch('/presupuestos/:id', conId, validar(v.presupuestoAdmin), async (req, res) => {
  const p = await buscarOFallar(EgrPresupuesto, req.params.id, 'Pedido de presupuesto no encontrado');
  await p.update(req.body);
  res.json(p);
});

// Adjunta a la promo un diseño guardado (por ejemplo, uno que mandaron por WhatsApp con su link)
router.post('/promos/:id/disenos', conId, validar(v.adjuntarDiseno), async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  const codigo = req.body.codigo.trim().split('/').pop().toLowerCase();
  const diseno = await EgrDiseno.findOne({ where: { codigo } });
  if (!diseno) throw new AppError('No encontramos ese diseño. Pegá el link (…/d/xxxxxxxx) o su código.', 404);
  await diseno.update({ promoId: promo.id });
  res.status(201).json(serializarDiseno(diseno));
});

router.delete('/promos/:id/disenos/:codigo', conId, async (req, res) => {
  const diseno = await EgrDiseno.findOne({ where: { codigo: String(req.params.codigo), promoId: req.params.id } });
  if (!diseno) throw new AppError('Ese diseño no está en la promo', 404);
  await diseno.update({ promoId: null });
  res.json({ mensaje: 'Diseño quitado de la promo' });
});

// ---------- recordatorios por mail ----------
router.post('/recordatorios', async (req, res) => {
  if (!mailConfigurado()) throw new AppError('El correo no está configurado (MAIL_* en backend/.env): no se pueden enviar recordatorios.', 409);
  res.json(await ejecutarRecordatorios());
});

// ---------- cuenta para transferencias ----------
router.get('/cuenta', async (req, res) => res.json(await egr.cuentaEgresados()));
router.put('/cuenta', validar(v.cuenta), async (req, res) => res.json(await egr.guardarCuentaEgresados(req.body)));

module.exports = router;
