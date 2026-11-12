const express = require('express');
const c = require('../controllers/usuariosController');
const { soloAdmin, requiereConfirmacion } = require('../middleware/auth');
const { auditar } = require('../services/actividad');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

router.use(soloAdmin);

router.get('/', c.obtenerUsuarios);
router.get('/:id', conId, c.obtenerUsuarioPorId);
router.post('/', requiereConfirmacion, validar(schemas.usuarioCrear), auditar('usuario_creado', (req) => `Creó el usuario ${req.body.email} (${req.body.rol})`, { sensible: true }), c.crearUsuario);
router.put('/:id', conId, requiereConfirmacion, validar(schemas.usuarioActualizar), auditar('usuario_editado', (req) => `Editó el usuario #${req.params.id}${req.body.rol ? ` (rol: ${req.body.rol})` : ''}${req.body.password ? ' y cambió su contraseña' : ''}`, { sensible: true }), c.actualizarUsuario);
router.delete('/:id', conId, requiereConfirmacion, auditar('usuario_borrado', (req) => `Borró el usuario #${req.params.id}`, { sensible: true }), c.eliminarUsuario);

module.exports = router;
