// Panel: gestión de promos de egresados, prendas, alumnos y cobranza.
const express = require('express');
const { Op } = require('sequelize');
const { sequelize, EgrPromo, EgrPrenda, EgrAlumno, EgrSeleccion, EgrCuota } = require('../models');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const v = require('../validators/egresados');
const { AppError } = require('../utils/errorHandler');
const ENV = require('../config/env');
const egr = require('../services/egresados');

const router = express.Router();
router.use(soloAdmin);
const conId = validar(v.idParam, 'params');

const linkPromo = (promo) => `${ENV.EGRESADOS_URL}/mi-promo/${promo.slug}`;
const vacioANull = (obj, campos) => campos.forEach((c) => { if (obj[c] === '') obj[c] = null; });

async function buscarOFallar(Modelo, id, mensaje, opciones = {}) {
  const fila = await Modelo.findByPk(id, opciones);
  if (!fila) throw new AppError(mensaje, 404);
  return fila;
}

const includeAlumno = [
  { model: EgrSeleccion, as: 'selecciones', include: [{ model: EgrPrenda, as: 'prenda' }] },
  { model: EgrCuota, as: 'cuotas' },
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
    salida.push({ ...promo.toJSON(), link: linkPromo(promo), resumen: resumenPromo(await alumnosDe(promo)) });
  }
  res.json(salida);
});

router.post('/promos', validar(v.promoNueva), async (req, res) => {
  vacioANull(req.body, ['fechaCierre', 'fechaEntrega']);
  const promo = await EgrPromo.create({ ...req.body, slug: egr.generarSlug() });
  res.status(201).json({ ...promo.toJSON(), link: linkPromo(promo) });
});

router.get('/promos/:id', conId, async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  const prendas = await EgrPrenda.findAll({ where: { promoId: promo.id }, order: [['orden', 'ASC'], ['id', 'ASC']] });
  const alumnos = await alumnosDe(promo);
  res.json({ ...promo.toJSON(), link: linkPromo(promo), prendas, alumnos, resumen: resumenPromo(alumnos) });
});

router.put('/promos/:id', conId, validar(v.promoEdicion), async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  vacioANull(req.body, ['fechaCierre', 'fechaEntrega']);
  const cambiaCalendario = req.body.primerVencimiento && req.body.primerVencimiento !== promo.primerVencimiento;
  const cambiaDescuento = req.body.descuentoContado !== undefined && Number(req.body.descuentoContado) !== promo.descuentoContado;
  await promo.update(req.body);
  // Si cambian el calendario o el descuento, se rearman las cuotas pendientes de quienes ya eligieron plan
  if (cambiaCalendario || cambiaDescuento) {
    const ids = (await EgrAlumno.findAll({ where: { promoId: promo.id, plan: { [Op.ne]: null } }, attributes: ['id'] })).map((a) => a.id);
    for (const id of ids) {
      await sequelize.transaction((transaction) => egr.regenerarCuotas(id, { transaction }));
    }
  }
  res.json({ ...promo.toJSON(), link: linkPromo(promo) });
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
router.post('/promos/:id/prendas', conId, validar(v.prendaNueva), async (req, res) => {
  const promo = await buscarOFallar(EgrPromo, req.params.id, 'Promo no encontrada');
  res.status(201).json(await EgrPrenda.create({ ...req.body, promoId: promo.id }));
});

router.put('/prendas/:id', conId, validar(v.prendaEdicion), async (req, res) => {
  const prenda = await buscarOFallar(EgrPrenda, req.params.id, 'Prenda no encontrada');
  await prenda.update(req.body);
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
router.post('/cuotas/:id/pago', conId, validar(v.pago), async (req, res) => {
  const alumnoId = await sequelize.transaction(async (transaction) => {
    const cuota = await buscarOFallar(EgrCuota, req.params.id, 'Cuota no encontrada', { transaction, lock: transaction.LOCK.UPDATE });
    if (cuota.estado === 'pagada') throw new AppError('Esa cuota ya figura como pagada', 409);
    const alumno = await EgrAlumno.findByPk(cuota.alumnoId, { transaction });
    const promo = await EgrPromo.findByPk(alumno.promoId, { transaction });
    const fecha = req.body.fecha || egr.hoyAR();
    const recargo = req.body.cobrarRecargo ? egr.recargoDe(promo, cuota, fecha) : 0;
    await cuota.update({ estado: 'pagada', pagadaEl: fecha, medio: req.body.medio, recargo, nota: req.body.nota }, { transaction });
    return alumno.id;
  });
  res.json(await detalleAlumno(alumnoId));
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

// ---------- cuenta para transferencias ----------
router.get('/cuenta', async (req, res) => res.json(await egr.cuentaEgresados()));
router.put('/cuenta', validar(v.cuenta), async (req, res) => res.json(await egr.guardarCuentaEgresados(req.body)));

module.exports = router;
