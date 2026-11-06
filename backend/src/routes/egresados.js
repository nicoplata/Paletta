// Portal de familias de egresados (egresados.paletta.com.ar/mi-promo/<slug>).
const express = require('express');
const { Op } = require('sequelize');
const { sequelize, EgrPromo, EgrAlumno } = require('../models');
const validar = require('../middleware/validator');
const v = require('../validators/egresados');
const { ingresoEgresadosLimiter } = require('../middleware/rateLimiter');
const { firmarTokenFamilia, verificarFamilia } = require('../middleware/authFamilia');
const { AppError } = require('../utils/errorHandler');
const egr = require('../services/egresados');

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

module.exports = router;
