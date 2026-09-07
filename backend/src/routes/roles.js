
// routes/roles.js
const express = require('express');
const router = express.Router();
const { verificarToken, verificarRolesPermitidos } = require('../middleware/auth');

// Ruta para obtener los roles disponibles
router.get('/', verificarToken, verificarRolesPermitidos(['administrador']), (req, res) => {
  const rolesDisponibles = ['usuario', 'administrador'];
  res.json(rolesDisponibles);
});

module.exports = router;

