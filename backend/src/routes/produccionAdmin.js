// Panel: producción de egresados (materiales, fichas técnicas, calculadora y lista de compras).
const express = require('express');
const { ProdMaterial, ProdModelo, EgrPrenda } = require('../models');
const { soloAdmin } = require('../middleware/auth');
const validar = require('../middleware/validator');
const v = require('../validators/produccion');
const { AppError } = require('../utils/errorHandler');
const prod = require('../services/produccion');

const router = express.Router();
router.use(soloAdmin);
const conId = validar(v.idParam, 'params');

async function buscar(Modelo, id, mensaje) {
  const fila = await Modelo.findByPk(id);
  if (!fila) throw new AppError(mensaje, 404);
  return fila;
}

// ---------- materiales ----------
router.get('/materiales', async (req, res) => {
  res.json(await ProdMaterial.findAll({ order: [['tipo', 'DESC'], ['nombre', 'ASC'], ['color', 'ASC']] }));
});
router.post('/materiales', validar(v.materialNuevo), async (req, res) => {
  res.status(201).json(await ProdMaterial.create(req.body));
});
router.put('/materiales/:id', conId, validar(v.materialEdicion), async (req, res) => {
  const m = await buscar(ProdMaterial, req.params.id, 'Material no encontrado');
  res.json(await m.update(req.body));
});
router.delete('/materiales/:id', conId, async (req, res) => {
  const m = await buscar(ProdMaterial, req.params.id, 'Material no encontrado');
  await m.destroy();
  res.status(204).end();
});

// ---------- fichas técnicas (modelos) ----------
// Talles del consumo que no están en el modelo se descartan para no dejar datos huérfanos
function limpiarModelo(datos, tallesActuales) {
  const talles = datos.talles || tallesActuales;
  if (datos.piezas && talles) {
    datos.piezas = datos.piezas.map((p) => ({
      rol: p.rol,
      porTalle: Object.fromEntries(Object.entries(p.porTalle || {}).filter(([t, n]) => talles.includes(t) && n > 0)),
    }));
  }
  return datos;
}

router.get('/modelos', async (req, res) => {
  res.json(await ProdModelo.findAll({ order: [['activo', 'DESC'], ['nombre', 'ASC']] }));
});
router.post('/modelos', validar(v.modeloNuevo), async (req, res) => {
  res.status(201).json(await ProdModelo.create(limpiarModelo(req.body)));
});
router.put('/modelos/:id', conId, validar(v.modeloEdicion), async (req, res) => {
  const m = await buscar(ProdModelo, req.params.id, 'Ficha técnica no encontrada');
  res.json(await m.update(limpiarModelo(req.body, m.talles)));
});
router.delete('/modelos/:id', conId, async (req, res) => {
  const m = await buscar(ProdModelo, req.params.id, 'Ficha técnica no encontrada');
  const enUso = await EgrPrenda.count({ where: { modeloId: m.id } });
  if (enUso) throw new AppError(`La usan ${enUso} prenda${enUso === 1 ? '' : 's'} de promos: desactivala en lugar de borrarla.`, 409);
  await m.destroy();
  res.status(204).end();
});

// ---------- calculadora, fichas y compras ----------
router.get('/promos/:id', conId, validar(v.calculo, 'query'), async (req, res) => {
  const datos = await prod.produccionDePromo(req.params.id, { confirmados: req.query.confirmados });
  if (!datos) throw new AppError('Promo no encontrada', 404);
  res.json(datos);
});

router.get('/compras', validar(v.compras, 'query'), async (req, res) => {
  const ids = [...new Set(req.query.promos.split(',').map(Number))];
  const materiales = await prod.cargarMateriales();
  const promos = [];
  for (const id of ids) {
    const datos = await prod.produccionDePromo(id, { confirmados: req.query.confirmados, materiales });
    if (datos) promos.push(datos);
  }
  if (!promos.length) throw new AppError('No se encontraron las promos', 404);
  const compras = prod.listaDeCompras(promos.flatMap((p) => p.prendas), materiales);
  res.json({
    promos: promos.map((p) => ({ ...p.promo, unidades: p.totales.unidades, costo: p.totales.costo, avisos: p.prendas.flatMap((x) => x.avisos.map((a) => `${x.nombre}: ${a}`)) })),
    confirmados: req.query.confirmados,
    ...compras,
  });
});

module.exports = router;
