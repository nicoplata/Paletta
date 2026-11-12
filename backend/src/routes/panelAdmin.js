// Panel: notificaciones (campanita), pendientes y registro de actividad
const express = require('express');
const { Op } = require('sequelize');
const { Actividad } = require('../models');
const { soloPanel, soloAdministrador } = require('../middleware/auth');
const notificaciones = require('../services/notificaciones');
const { pendientes } = require('../services/resumenDiario');

const router = express.Router();
router.use(soloPanel);

router.get('/notificaciones', async (req, res) => {
  const [lista, pend] = await Promise.all([notificaciones.listarPara(req.usuario.id), pendientes()]);
  res.set('Cache-Control', 'no-store');
  res.json({ ...lista, pendientes: pend.filter((p) => p.cantidad > 0) });
});

router.post('/notificaciones/leidas', async (req, res) => {
  await notificaciones.marcarLeidas(req.usuario.id);
  res.status(204).end();
});

// Registro de actividad: solo el administrador
router.get('/actividad', soloAdministrador, async (req, res) => {
  const where = {};
  if (req.query.sensibles === 'true') where.sensible = true;
  if (/^\d+$/.test(req.query.usuarioId || '')) where.usuarioId = Number(req.query.usuarioId);
  if (/^\d+$/.test(req.query.antesDe || '')) where.id = { [Op.lt]: Number(req.query.antesDe) };
  const filas = await Actividad.findAll({ where, order: [['id', 'DESC']], limit: 100 });
  res.json(filas);
});

module.exports = router;
