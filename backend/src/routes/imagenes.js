const express = require('express');
const router = express.Router();
const imagenesController = require('../controllers/imagenesController');
const { verificarToken, verificarRolesPermitidos } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { Imagen } = require('../models');

// Logging middleware específico para rutas de imágenes
router.use((req, res, next) => {
  console.log(`Imagen route: ${req.method} ${req.originalUrl}`);
  next();
});

// DELETE debe ir antes que las rutas con parámetros genéricos
router.delete(
  '/:imagenId',
  verificarToken,
  verificarRolesPermitidos(['administrador']),
  (req, res, next) => {
    console.log('Procesando DELETE imagen:', req.params.imagenId);
    next();
  },
  imagenesController.eliminarImagen
);

router.post(
  '/',
  verificarToken,
  verificarRolesPermitidos(['administrador', 'usuario']),
  upload.single('imagen'),
  imagenesController.subirImagen // 👈 nuevo nombre para claridad
);

router.get('/:productoId', imagenesController.getImagenesPorProducto);

router.get('/', async (req, res) => {
  const { tipoEntidad } = req.query;

  try {
    if (!tipoEntidad) {
      return res.status(400).json({ error: 'Falta el parámetro tipoEntidad' });
    }

    const imagenes = await Imagen.findAll({
      where: { tipoEntidad },
    });

    res.json(imagenes);
  } catch (error) {
    console.error('Error al obtener imágenes por tipoEntidad:', error);
    res.status(500).json({ error: 'Error al obtener imágenes' });
  }
});

module.exports = router;
