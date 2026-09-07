const express = require('express');
const router = express.Router();
const { verificarToken, verificarRolesPermitidos } = require('../middleware/auth');
const { Perfil } = require('../models');

// Crear perfil
router.post('/', verificarToken, verificarRolesPermitidos(['administrador']), async (req, res) => {
  try {
    const nuevoPerfil = await Perfil.create(req.body);
    res.status(201).json(nuevoPerfil);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear perfil', error });
  }
});

// Listar todos los perfiles
router.get('/', verificarToken, verificarRolesPermitidos(['administrador']), async (req, res) => {
  const perfiles = await Perfil.findAll();
  res.json(perfiles);
});

// Obtener perfil por ID
router.get('/:id', verificarToken, verificarRolesPermitidos(['administrador']), async (req, res) => {
  const perfil = await Perfil.findByPk(req.params.id);
  if (!perfil) return res.status(404).json({ mensaje: 'Perfil no encontrado' });
  res.json(perfil);
});

// Actualizar perfil
router.put('/:id', verificarToken, verificarRolesPermitidos(['administrador']), async (req, res) => {
  try {
    const perfil = await Perfil.findByPk(req.params.id);
    if (!perfil) return res.status(404).json({ mensaje: 'Perfil no encontrado' });

    await perfil.update(req.body);
    res.json(perfil);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar perfil', error });
  }
});

// Eliminar perfil
router.delete('/:id', verificarToken, verificarRolesPermitidos(['administrador']), async (req, res) => {
  try {
    const perfil = await Perfil.findByPk(req.params.id);
    if (!perfil) return res.status(404).json({ mensaje: 'Perfil no encontrado' });

    await perfil.destroy();
    res.json({ mensaje: 'Perfil eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar perfil', error });
  }
});

module.exports = router;
