// Diseñador de egresados: guardar y compartir diseños, y pedir presupuesto con el diseño adjunto.
const express = require('express');
const multer = require('multer');
const Joi = require('joi');
const { EgrDiseno, EgrPresupuesto, EgrPromo } = require('../models');
const validar = require('../middleware/validator');
const { disenosLimiter, presupuestosLimiter } = require('../middleware/rateLimiter');
const { AppError } = require('../utils/errorHandler');
const ENV = require('../config/env');
const d = require('../services/disenosEgresados');

const router = express.Router();

const subirImagen = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 5, fieldSize: 80 * 1024 } }).single('imagen');
const recibir = (req, res, next) => subirImagen(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('La imagen del diseño es demasiado grande.', 400));
  return next(new AppError('No se pudo recibir el diseño.', 400));
});

const codigoParam = validar(Joi.object({ codigo: Joi.string().pattern(/^[a-z0-9]{8}$/).required() }), 'params');

async function disenoPorCodigo(codigo) {
  const diseno = await EgrDiseno.findOne({ where: { codigo } });
  if (!diseno) throw new AppError('No encontramos ese diseño.', 404);
  return diseno;
}

// 🔓 Guarda el diseño (imagen + configuración) y devuelve su link para compartir
router.post('/disenos', disenosLimiter, recibir, async (req, res) => {
  const diseno = await d.guardarDiseno({ imagen: req.file && req.file.buffer, config: req.body.config, titulo: req.body.titulo });
  res.status(201).json(d.serializarDiseno(diseno));
});

// 🔓 Configuración de un diseño guardado (el diseñador lo vuelve a abrir)
router.get('/disenos/:codigo', codigoParam, async (req, res) => {
  const diseno = await disenoPorCodigo(req.params.codigo);
  res.json({ ...d.serializarDiseno(diseno), config: diseno.config });
});

router.get('/d/:codigo/imagen.png', codigoParam, async (req, res) => {
  const diseno = await disenoPorCodigo(req.params.codigo);
  res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.sendFile(d.rutaImagen(diseno.imagen));
});

// Página del link compartido (vista previa en WhatsApp y redirección al diseñador)
router.get('/d/:codigo', codigoParam, async (req, res) => {
  const diseno = await disenoPorCodigo(req.params.codigo);
  res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' });
  res.send(d.paginaDiseno(diseno));
});

const telefono = Joi.string().trim().pattern(/^[+\d][\d\s()-]{7,28}$/).message('el WhatsApp no parece válido');
const esquemaPresupuesto = Joi.object({
  nombre: Joi.string().trim().min(3).max(120).required(),
  telefono: telefono.required(),
  email: Joi.string().trim().lowercase().email().max(200).allow('', null).empty('').default(null),
  colegio: Joi.string().trim().min(2).max(150).required(),
  curso: Joi.string().trim().max(60).allow('', null).empty('').default(null),
  cantidad: Joi.number().integer().min(1).max(1000).allow('', null).empty('').default(null),
  anio: Joi.number().integer().min(2020).max(2100).allow('', null).empty('').default(null),
  mensaje: Joi.string().trim().max(1000).allow('', null).empty('').default(null),
  disenoCodigo: Joi.string().pattern(/^[a-z0-9]{8}$/).required(),
  promoCodigo: Joi.string().trim().pattern(/^[A-Za-z0-9 -]{4,24}$/).allow('', null).empty('').default(null),
  sitio: Joi.any(), // honeypot
});

// 🔓 Pedido de presupuesto con el diseño adjunto. Si traen el código de su promo, el diseño queda en la promo.
router.post('/presupuestos', presupuestosLimiter, validar(esquemaPresupuesto), async (req, res) => {
  const { sitio, disenoCodigo, promoCodigo, ...datos } = req.body;
  if (sitio) return res.status(201).json({ ok: true }); // bot: se responde igual, sin guardar
  const diseno = await disenoPorCodigo(disenoCodigo);
  let promo = null;
  if (promoCodigo) {
    promo = await EgrPromo.findOne({ where: { codigoBusqueda: EgrPromo.normalizarCodigo(promoCodigo), activo: true } });
    if (!promo) throw new AppError('No encontramos una promo con ese código. Revisalo o dejalo vacío.', 404);
    await diseno.update({ promoId: promo.id });
  }
  const presupuesto = await EgrPresupuesto.create({ ...datos, disenoId: diseno.id, promoId: promo ? promo.id : null });
  d.avisarPresupuesto(presupuesto, diseno, promo).catch((err) => { if (!ENV.isTest) console.error('Aviso de presupuesto:', err.message); });
  res.status(201).json({
    ok: true,
    diseno: d.serializarDiseno(diseno),
    promo: promo ? { codigo: promo.codigo, colegio: promo.colegio, curso: promo.curso } : null,
  });
});

module.exports = router;
