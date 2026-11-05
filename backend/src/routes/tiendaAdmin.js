const express = require('express');
const c = require('../controllers/cuponesAdminController');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const schemas = require('../validators/schemas');

const router = express.Router();
const conId = validar(schemas.idParam, 'params');

router.use(soloAdmin);

router.get('/cupones', c.listarCupones);
router.post('/cupones', validar(schemas.cupon), c.crearCupon);
router.put('/cupones/:id', conId, validar(schemas.cupon), c.actualizarCupon);
router.delete('/cupones/:id', conId, c.eliminarCupon);

router.get('/zonas-envio', c.listarZonas);
router.post('/zonas-envio', validar(schemas.zonaEnvio), c.crearZona);
router.put('/zonas-envio/:id', conId, validar(schemas.zonaEnvio), c.actualizarZona);
router.delete('/zonas-envio/:id', conId, c.eliminarZona);

module.exports = router;
