const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { User } = require('../models');
const { JWT_SECRET } = require('../config/env');

// Endpoint de login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validación básica
  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Email y contraseña son requeridos' });
  }

  try {
    // Buscar el usuario por email
    const usuario = await User.findOne({ where: { email } });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Comparar la contraseña
    const passwordValida = await usuario.compararPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // Generar el token JWT
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token, rol: usuario.rol });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
});

module.exports = router;

