const express = require('express');
const c = require('../controllers/usuariosController');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

router.use(soloAdmin);

router.get('/', c.obtenerUsuarios);
router.get('/:id', conId, c.obtenerUsuarioPorId);
router.post('/', validar(schemas.usuarioCrear), c.crearUsuario);
router.put('/:id', conId, validar(schemas.usuarioActualizar), c.actualizarUsuario);
router.delete('/:id', conId, c.eliminarUsuario);

module.exports = router;
