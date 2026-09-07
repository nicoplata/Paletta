const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verificarToken, verificarRolesPermitidos } = require('../middleware/auth');

// Add error logging middleware
router.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Obtener todos los usuarios
router.get('/',
  verificarToken,
  verificarRolesPermitidos(['administrador']),
  (req, res, next) => {
    console.log('Verificando acceso a usuarios...');
    next();
  },
  usuariosController.obtenerUsuarios
);

// Obtener un usuario por ID
router.get('/:id',
  verificarToken,
  verificarRolesPermitidos(['administrador']),
  usuariosController.obtenerUsuarioPorId
);

// Crear usuario
router.post('/',
  verificarToken,
  verificarRolesPermitidos(['administrador']),
  usuariosController.crearUsuario
);

// Actualizar usuario
router.put('/:id',
  verificarToken,
  verificarRolesPermitidos(['administrador']),
  usuariosController.actualizarUsuario
);

// Eliminar usuario
router.delete('/:id',
  verificarToken,
  verificarRolesPermitidos(['administrador']),
  usuariosController.eliminarUsuario
);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Error en rutas de usuarios:', err);
  res.status(500).json({ error: err.message });
});

module.exports = router;
