// Portal de familias de egresados (egresados.paletta.com.ar/mi-promo/<slug>).
const express = require('express');
const { Op } = require('sequelize');
const fs = require('fs');
const { sequelize, EgrPromo, EgrAlumno, EgrCuota, EgrComprobante } = require('../models');
const validar = require('../middleware/validator');
const v = require('../validators/egresados');
const { ingresoEgresadosLimiter, comprobantesLimiter } = require('../middleware/rateLimiter');
const { recibirComprobante, enviarComprobante } = require('../middleware/comprobante');
const { firmarTokenFamilia, verificarFamilia } = require('../middleware/authFamilia');
const { AppError } = require('../utils/errorHandler');
const egr = require('../services/egresados');
const { tableroComision } = require('../services/tableroEgresados');

const router = express.Router();

async function promoPorSlug(slug, transaction) {
  const promo = await EgrPromo.findOne({ where: { slug, activo: true }, transaction });
  if (!promo) throw new AppError('No encontramos esa promo. Revisá el link que te pasó la comisión.', 404);
  return promo;
}

const promoCerrada = (promo) => Boolean(promo.fechaCierre && promo.fechaCierre < egr.hoyAR());

async function registrarIngreso(alumno, res, transaction, extra = {}) {
  await alumno.update({ ...extra, ultimoIngreso: new Date() }, { transaction });
  res.json({ token: firmarTokenFamilia(alumno), alumnoId: alumno.id });
}

// 🔓 Datos públicos de la promo: para elegir al alumno en la pantalla de ingreso
router.get('/promos/:slug', validar(v.slugParam, 'params'), async (req, res) => {
  const promo = await promoPorSlug(req.params.slug);
  const alumnos = await EgrAlumno.findAll({ where: { promoId: promo.id }, order: [['nombre', 'ASC']], attributes: ['id', 'nombre', 'dni'] });
  res.json({
    colegio: promo.colegio,
    curso: promo.curso,
    anio: promo.anio,
    fechaCierre: promo.fechaCierre,
    cerrada: promoCerrada(promo),
    alumnos: alumnos.map((a) => ({ id: a.id, nombre: a.nombre, registrado: Boolean(a.dni) })),
  });
});

// 🔓 Ingreso con el DNI del alumno. La primera vez, el DNI queda registrado.
router.post('/promos/:slug/ingresar', ingresoEgresadosLimiter, validar(v.slugParam, 'params'), validar(v.ingresar), async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const promo = await promoPorSlug(req.params.slug, transaction);
    const alumno = await EgrAlumno.findOne({
      where: { id: req.body.alumnoId, promoId: promo.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!alumno) throw new AppError('No encontramos a ese alumno en la promo', 404);

    if (alumno.dni) {
      if (alumno.dni !== req.body.dni) {
        throw new AppError('El DNI no coincide con el del alumno. Si es un error, escribinos y lo corregimos.', 401);
      }
    } else {
      const repetido = await EgrAlumno.findOne({ where: { promoId: promo.id, dni: req.body.dni, id: { [Op.ne]: alumno.id } }, transaction });
      if (repetido) throw new AppError(`Ese DNI ya está registrado para ${repetido.nombre}. Si es un error, escribinos.`, 409);
    }
    await registrarIngreso(alumno, res, transaction, alumno.dni ? {} : { dni: req.body.dni });
  });
});

// 🔓 "No encuentro a mi hijo/a en la lista": la familia se suma sola
router.post('/promos/:slug/alumnos', ingresoEgresadosLimiter, validar(v.slugParam, 'params'), validar(v.sumarme), async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const promo = await promoPorSlug(req.params.slug, transaction);
    if (promoCerrada(promo)) throw new AppError('La promo ya cerró la carga de alumnos. Escribinos por WhatsApp.', 409);
    // Serializa altas concurrentes de la misma promo (número correlativo)
    await sequelize.query('SELECT pg_advisory_xact_lock(:clave)', { replacements: { clave: 7000000 + promo.id }, transaction });
    const repetido = await EgrAlumno.findOne({ where: { promoId: promo.id, dni: req.body.dni }, transaction });
    if (repetido) throw new AppError(`Ese DNI ya está registrado para ${repetido.nombre}: ingresá eligiéndolo de la lista.`, 409);
    const numero = ((await EgrAlumno.max('numero', { where: { promoId: promo.id }, transaction })) || 0) + 1;
    const alumno = await EgrAlumno.create({
      promoId: promo.id, numero, nombre: req.body.nombre, dni: req.body.dni, agregadoPorFamilia: true,
    }, { transaction });
    res.status(201);
    await registrarIngreso(alumno, res, transaction);
  });
});

// 🔑 Comisión: tablero de la promo con el link secreto de la comisión
async function promoPorToken(token) {
  const promo = await EgrPromo.findOne({ where: { comisionToken: token, activo: true } });
  if (!promo) throw new AppError('Este link de la comisión no es válido. Pedile el link nuevo a Paletta.', 404);
  return promo;
}

router.get('/comision/:token', validar(v.tokenParam, 'params'), async (req, res) => {
  res.json(await tableroComision(await promoPorToken(req.params.token)));
});

router.put('/comision/:token/integrantes', validar(v.tokenParam, 'params'), validar(v.integrantes), async (req, res) => {
  const promo = await promoPorToken(req.params.token);
  await promo.update({ comisionIntegrantes: req.body.integrantes });
  res.json(await tableroComision(promo));
});

router.post('/comision/:token/diseno', validar(v.tokenParam, 'params'), validar(v.aprobarDiseno), async (req, res) => {
  const promo = await promoPorToken(req.params.token);
  if (promo.disenoAprobadoEl) throw new AppError('El diseño ya está aprobado.', 409);
  const tablero = await tableroComision(promo);
  if (!tablero.puedeAprobarDiseno) {
    const faltan = ['datos', 'prendas', 'sena'].filter((k) => !tablero.pasos[k].completo)
      .map((k) => ({ datos: 'datos', prendas: 'prendas y talles', sena: 'cuota 1' }[k]));
    throw new AppError(`Para aprobar el diseño tiene que estar completa toda la promo (falta: ${faltan.join(', ')}).`, 409);
  }
  await promo.update({ disenoAprobadoEl: new Date(), disenoAprobadoPor: req.body.nombre });
  res.json(await tableroComision(promo));
});

// 🔐 Familia: todo lo del alumno (datos, prendas, plan, cuponera)
router.get('/mi-promo', verificarFamilia, async (req, res) => {
  res.json(await egr.vistaFamilia(req.alumno.id));
});

router.put('/mi-promo/datos', verificarFamilia, validar(v.datosFamilia), async (req, res) => {
  const alumno = req.alumno;
  const { dni, ...resto } = req.body;
  if (dni !== alumno.dni) {
    const repetido = await EgrAlumno.findOne({ where: { promoId: alumno.promoId, dni, id: { [Op.ne]: alumno.id } } });
    if (repetido) throw new AppError('Ese DNI ya está registrado para otro alumno de la promo.', 409);
  }
  await alumno.update({ ...resto, dni });
  res.json(await egr.vistaFamilia(alumno.id));
});

router.put('/mi-promo/prendas', verificarFamilia, validar(v.prendas), async (req, res) => {
  await egr.guardarSelecciones(req.alumno.id, req.body.items);
  res.json(await egr.vistaFamilia(req.alumno.id));
});

router.put('/mi-promo/plan', verificarFamilia, validar(v.plan), async (req, res) => {
  await egr.elegirPlan(req.alumno.id, req.body.plan);
  res.json(await egr.vistaFamilia(req.alumno.id));
});

// 🔐 Familia: subir el comprobante de una transferencia (la cuota queda "en revisión")
router.post('/mi-promo/cuotas/:id/comprobante', verificarFamilia, comprobantesLimiter, validar(v.idParam, 'params'), recibirComprobante, async (req, res) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const cuota = await EgrCuota.findOne({ where: { id: req.params.id, alumnoId: req.alumno.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!cuota) throw new AppError('No encontramos esa cuota', 404);
      if (cuota.estado === 'pagada') throw new AppError('Esa cuota ya figura como paga.', 409);
      if (cuota.estado === 'informada') throw new AppError('Ya hay un comprobante en revisión para esa cuota.', 409);
      await EgrComprobante.create({
        cuotaId: cuota.id,
        archivo: req.file.filename,
        nombreOriginal: req.file.originalname.slice(0, 200),
        tipo: req.file.mimetype,
        tamano: req.file.size,
      }, { transaction });
      await cuota.update({ estado: 'informada' }, { transaction });
    });
  } catch (err) {
    fs.rmSync(req.file.path, { force: true });
    throw err;
  }
  res.status(201).json(await egr.vistaFamilia(req.alumno.id));
});

// 🔐 Familia: ver un comprobante propio
router.get('/mi-promo/comprobantes/:id/archivo', verificarFamilia, validar(v.idParam, 'params'), async (req, res) => {
  const comprobante = await EgrComprobante.findByPk(req.params.id, { include: [{ model: EgrCuota, as: 'cuota', attributes: ['alumnoId'] }] });
  if (!comprobante || comprobante.cuota.alumnoId !== req.alumno.id) throw new AppError('Comprobante no encontrado', 404);
  enviarComprobante(res, comprobante);
});

module.exports = router;
