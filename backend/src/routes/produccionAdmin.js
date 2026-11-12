// Panel: producción de egresados (materiales, fichas técnicas, calculadora y lista de compras).
const express = require('express');
const { ProdMaterial, ProdModelo, ProdTaller, ProdOrden, EgrPrenda, EgrPromo, sequelize } = require('../models');
const egr = require('../services/egresados');
const { soloPanel, soloAdministrador } = require('../middleware/auth');
const { auditar } = require('../services/actividad');
const validar = require('../middleware/validator');
const v = require('../validators/produccion');
const { AppError } = require('../utils/errorHandler');
const prod = require('../services/produccion');

const router = express.Router();
router.use(soloPanel);
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
router.delete('/materiales/:id', conId, soloAdministrador, auditar('material_borrado', (req) => `Borró el material #${req.params.id}`, { sensible: true }), async (req, res) => {
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
router.delete('/modelos/:id', conId, soloAdministrador, auditar('ficha_borrada', (req) => `Borró la ficha técnica #${req.params.id}`, { sensible: true }), async (req, res) => {
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

// ---------- talleres ----------
router.get('/talleres', async (req, res) => {
  res.json(await ProdTaller.findAll({ order: [['activo', 'DESC'], ['nombre', 'ASC']] }));
});
router.post('/talleres', validar(v.tallerNuevo), async (req, res) => res.status(201).json(await ProdTaller.create(req.body)));
router.put('/talleres/:id', conId, validar(v.tallerEdicion), async (req, res) => {
  const t = await buscar(ProdTaller, req.params.id, 'Taller no encontrado');
  res.json(await t.update(req.body));
});
router.delete('/talleres/:id', conId, soloAdministrador, auditar('taller_borrado', (req) => `Borró el taller #${req.params.id}`, { sensible: true }), async (req, res) => {
  const t = await buscar(ProdTaller, req.params.id, 'Taller no encontrado');
  const ordenes = await ProdOrden.count({ where: { tallerId: t.id } });
  if (ordenes) throw new AppError(`El taller tiene ${ordenes} orden${ordenes === 1 ? '' : 'es'}: desactivalo en lugar de borrarlo.`, 409);
  await t.destroy();
  res.status(204).end();
});

// ---------- órdenes de taller ----------
const limpiarCantidades = (obj) => (obj ? Object.fromEntries(Object.entries(obj).filter(([, n]) => n > 0)) : obj);
const vacioANull = (d) => ['enviadaEl', 'compromisoEl', 'recibidaEl'].forEach((k) => { if (d[k] === '') d[k] = null; });

// Al enviar o recibir una orden, la prenda avanza sola en el seguimiento (nunca retrocede)
async function avanzarPrenda(prendaId, transaction) {
  const prenda = await EgrPrenda.findByPk(prendaId, { transaction, include: [{ model: ProdOrden, as: 'ordenes' }] });
  const ordenes = prenda.ordenes;
  let destino = null;
  if (ordenes.length && ordenes.every((o) => o.estado === 'recibida')) destino = 'control';
  else if (ordenes.some((o) => o.estado !== 'preparando')) destino = 'taller';
  if (destino && prod.ETAPAS.indexOf(destino) > prod.ETAPAS.indexOf(prenda.etapa)) {
    await prenda.update(prod.moverEtapa(prenda, destino, egr.hoyAR()), { transaction });
  }
}

function fechasPorEstado(datos, orden = {}) {
  const hoy = egr.hoyAR();
  if (datos.estado === 'enviada' && !datos.enviadaEl && !orden.enviadaEl) datos.enviadaEl = hoy;
  if (datos.estado === 'recibida') {
    if (!datos.recibidaEl && !orden.recibidaEl) datos.recibidaEl = hoy;
    if (!datos.enviadaEl && !orden.enviadaEl) datos.enviadaEl = hoy;
  }
  return datos;
}

const includeOrden = [{ model: ProdTaller, as: 'taller' }, { model: EgrPrenda, as: 'prenda', include: [{ model: EgrPromo, as: 'promo' }] }];
const ordenConContexto = (o) => ({
  ...prod.serializarOrden(o),
  prenda: o.prenda ? { id: o.prenda.id, nombre: o.prenda.nombre } : null,
  promo: o.prenda?.promo ? { id: o.prenda.promo.id, colegio: o.prenda.promo.colegio, curso: o.prenda.promo.curso, anio: o.prenda.promo.anio } : null,
});

router.get('/ordenes', async (req, res) => {
  const where = {};
  if (req.query.tallerId) where.tallerId = Number(req.query.tallerId);
  if (['preparando', 'enviada', 'recibida'].includes(req.query.estado)) where.estado = req.query.estado;
  const ordenes = await ProdOrden.findAll({ where, include: includeOrden, order: [['compromisoEl', 'ASC'], ['id', 'DESC']], limit: 500 });
  res.json(ordenes.map(ordenConContexto));
});

router.post('/ordenes', validar(v.ordenNueva), async (req, res) => {
  const datos = { ...req.body, cantidades: limpiarCantidades(req.body.cantidades) };
  vacioANull(datos);
  const prenda = await EgrPrenda.findByPk(datos.prendaId, { include: [{ model: ProdModelo, as: 'modelo' }] });
  if (!prenda) throw new AppError('Prenda no encontrada', 404);
  await buscar(ProdTaller, datos.tallerId, 'Taller no encontrado');
  if (!prod.sumar(datos.cantidades)) throw new AppError('Indicá cuántas prendas de cada talle van al taller', 400);
  const fuera = Object.keys(datos.cantidades).filter((t) => !prenda.talles.includes(t));
  if (fuera.length) throw new AppError(`La prenda no tiene el talle ${fuera.join(', ')}`, 400);
  if (datos.precioUnitario === undefined) datos.precioUnitario = prenda.modelo?.costoConfeccion || 0;
  const orden = await sequelize.transaction(async (transaction) => {
    const o = await ProdOrden.create(fechasPorEstado(datos), { transaction });
    await avanzarPrenda(prenda.id, transaction);
    return o;
  });
  res.status(201).json(ordenConContexto(await ProdOrden.findByPk(orden.id, { include: includeOrden })));
});

router.put('/ordenes/:id', conId, validar(v.ordenEdicion), async (req, res) => {
  const orden = await ProdOrden.findByPk(req.params.id, { include: [{ model: EgrPrenda, as: 'prenda' }] });
  if (!orden) throw new AppError('Orden no encontrada', 404);
  const datos = { ...req.body };
  ['cantidades', 'recibidas', 'falladas'].forEach((k) => { if (datos[k]) datos[k] = limpiarCantidades(datos[k]); });
  vacioANull(datos);
  if (datos.tallerId) await buscar(ProdTaller, datos.tallerId, 'Taller no encontrado');
  const talles = Object.keys({ ...datos.cantidades, ...datos.recibidas, ...datos.falladas });
  const fuera = talles.filter((t) => !orden.prenda.talles.includes(t));
  if (fuera.length) throw new AppError(`La prenda no tiene el talle ${fuera.join(', ')}`, 400);
  await sequelize.transaction(async (transaction) => {
    await orden.update(fechasPorEstado(datos, orden), { transaction });
    await avanzarPrenda(orden.prendaId, transaction);
  });
  res.json(ordenConContexto(await ProdOrden.findByPk(orden.id, { include: includeOrden })));
});

router.delete('/ordenes/:id', conId, auditar('orden_borrada', (req) => `Borró la orden de taller #${req.params.id}`), async (req, res) => {
  const orden = await buscar(ProdOrden, req.params.id, 'Orden no encontrada');
  // El equipo puede borrar órdenes en preparación; las ya enviadas o recibidas solo el administrador
  if (orden.estado !== 'preparando' && req.usuario.rol !== 'administrador') {
    throw new AppError('La orden ya se envió al taller: solo el administrador puede borrarla.', 403);
  }
  await orden.destroy();
  res.status(204).end();
});

// Datos de la ficha de taller: la orden, la prenda (modelo, materiales e insumos para esa cantidad) y los bordados
router.get('/ordenes/:id/ficha', conId, async (req, res) => {
  const orden = await ProdOrden.findByPk(req.params.id, { include: includeOrden });
  if (!orden) throw new AppError('Orden no encontrada', 404);
  const datos = await prod.produccionDePromo(orden.prenda.promoId);
  const p = datos.prendas.find((x) => x.prendaId === orden.prendaId) || null;
  const curva = orden.prenda.talles.filter((t) => orden.cantidades[t]).map((t) => ({ talle: t, cantidad: orden.cantidades[t] }));
  const calculo = p ? prod.calcularPrenda({ prenda: orden.prenda, modelo: p.modeloFicha, materiales: await prod.cargarMateriales(), curva }) : null;
  // Los bordados van solo si la orden lleva todas las unidades de la prenda (si se reparte, no se sabe cuáles van)
  const completa = p && prod.sumar(orden.cantidades) >= p.unidades;
  res.json({
    orden: ordenConContexto(orden),
    taller: orden.taller,
    promo: datos.promo,
    disenos: datos.disenos,
    prenda: p && {
      nombre: p.nombre, descripcion: p.descripcion, conBordado: p.conBordado, fichaNotas: p.fichaNotas,
      modelo: p.modeloFicha ? { nombre: p.modeloFicha.nombre, pasos: p.modeloFicha.pasos } : null,
      lineas: calculo?.lineas || [], curva,
      bordados: completa ? p.bordados : null,
    },
  });
});

// ---------- seguimiento interno ----------
router.put('/prendas/:id/etapa', conId, validar(v.etapa), async (req, res) => {
  const prenda = await buscar(EgrPrenda, req.params.id, 'Prenda no encontrada');
  await prenda.update(prod.moverEtapa(prenda, req.body.etapa, req.body.fecha || egr.hoyAR()));
  res.json({ id: prenda.id, etapa: prenda.etapa, seguimiento: prenda.seguimiento });
});

router.get('/seguimiento', async (req, res) => {
  const promos = await EgrPromo.findAll({
    where: { activo: true },
    include: [{ model: EgrPrenda, as: 'prendas', where: { activo: true }, required: false, include: [{ model: ProdOrden, as: 'ordenes', include: [{ model: ProdTaller, as: 'taller' }] }] }],
    order: [['fechaEntrega', 'ASC'], ['anio', 'DESC'], ['colegio', 'ASC']],
  });
  const hoy = egr.hoyAR();
  const conteos = await sequelize.query(
    `SELECT s."prendaId", SUM(s.cantidad)::int AS unidades FROM "EgrSelecciones" s GROUP BY s."prendaId"`,
    { type: sequelize.QueryTypes.SELECT },
  );
  const unidades = new Map(conteos.map((c) => [c.prendaId, c.unidades]));
  res.json({
    etapas: prod.ETAPAS.map((k) => ({ clave: k, nombre: prod.NOMBRE_ETAPA[k] })),
    promos: promos.filter((p) => p.estadoProduccion !== 'entregado').map((p) => ({
      id: p.id, colegio: p.colegio, curso: p.curso, anio: p.anio, codigo: p.codigo, fechaEntrega: p.fechaEntrega, estadoProduccion: p.estadoProduccion,
      disenoAprobado: Boolean(p.disenoAprobadoEl), contrato: Boolean(p.contratoArchivo),
      prendas: p.prendas.sort((a, b) => a.orden - b.orden || a.id - b.id).map((x) => {
        const ordenes = x.ordenes.map(prod.serializarOrden);
        return {
          id: x.id, nombre: x.nombre, etapa: x.etapa, seguimiento: x.seguimiento, unidades: unidades.get(x.id) || 0,
          enTaller: ordenes.filter((o) => o.estado === 'enviada').reduce((a, o) => a + o.enviadas, 0),
          atrasadas: ordenes.filter((o) => o.estado !== 'recibida' && o.compromisoEl && o.compromisoEl < hoy).map((o) => ({ numero: o.numero, taller: o.taller?.nombre, compromisoEl: o.compromisoEl })),
          ordenes: ordenes.length,
        };
      }),
    })),
  });
});

module.exports = router;
