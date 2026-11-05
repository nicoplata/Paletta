const express = require('express');
const c = require('../controllers/imagenesController');
const { soloAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const fs = require('fs');

const router = express.Router();

// Si la validación falla después de que multer guardó el archivo, se borra para no dejar huérfanos.
const validarImagen = (req, res, next) =>
  validar(schemas.imagen)(req, res, (err) => {
    if (err && req.file) fs.unlink(req.file.path, () => {});
    next(err);
  });

router.get('/', c.getImagenes);
router.post('/', soloAdmin, upload.single('imagen'), validarImagen, c.subirImagen);
router.delete('/:id', soloAdmin, validar(schemas.idParam, 'params'), c.eliminarImagen);

module.exports = router;
