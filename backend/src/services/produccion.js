// Producción de egresados: curva de talles, consumo de tela e insumos, costos y lista de compras.
// Las funciones de cálculo son puras (reciben los datos ya cargados) para poder testearlas.
const { EgrPromo, EgrPrenda, EgrAlumno, EgrSeleccion, EgrCuota, EgrComprobante, EgrDiseno, ProdMaterial, ProdModelo } = require('../models');
const egr = require('./egresados');
const { serializarDiseno } = require('./disenosEgresados');

const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;

// Cantidad por talle de una prenda a partir de las selecciones de los alumnos
function curvaDe(prenda, alumnos) {
  const conteo = new Map(prenda.talles.map((t) => [t, 0]));
  alumnos.forEach((a) => a.selecciones.forEach((s) => {
    if (s.prendaId === prenda.id) conteo.set(s.talle, (conteo.get(s.talle) || 0) + s.cantidad);
  }));
  return [...conteo.entries()].map(([talle, cantidad]) => ({ talle, cantidad }));
}

// Consumo y costo de una prenda. materiales: Map id -> material (plano)
function calcularPrenda({ prenda, modelo, materiales, curva }) {
  const unidades = curva.reduce((a, c) => a + c.cantidad, 0);
  const avisos = [];
  const lineas = [];
  if (!modelo) {
    if (unidades > 0) avisos.push('No tiene ficha técnica asignada: no se puede calcular la tela.');
    return { prendaId: prenda.id, nombre: prenda.nombre, modelo: null, unidades, curva, lineas, costoMateriales: 0, costoConfeccion: 0, costoTotal: 0, costoUnitario: 0, avisos };
  }
  const asignados = prenda.materiales || {};
  const desperdicio = Number(modelo.desperdicio) || 0;
  const material = (rol) => {
    const id = asignados[rol];
    const m = id ? materiales.get(Number(id)) : null;
    if (!m && unidades > 0) avisos.push(`Falta elegir el material de “${rol}”.`);
    return m || null;
  };

  (modelo.piezas || []).forEach((pieza) => {
    let base = 0;
    curva.forEach(({ talle, cantidad }) => {
      if (!cantidad) return;
      const consumo = Number(pieza.porTalle?.[talle]);
      if (!consumo) avisos.push(`Falta el consumo de “${pieza.rol}” para el talle ${talle}.`);
      else base += consumo * cantidad;
    });
    const necesario = r2(base * (1 + desperdicio / 100));
    const m = material(pieza.rol);
    lineas.push({ rol: pieza.rol, tipo: 'tela', materialId: m?.id || null, material: m, porTalle: pieza.porTalle || {}, necesario, costo: r2(necesario * (m?.precio || 0)) });
  });
  (modelo.insumos || []).forEach((ins) => {
    const necesario = r3(Number(ins.cantidad || 0) * unidades);
    const m = material(ins.rol);
    lineas.push({ rol: ins.rol, tipo: 'insumo', materialId: m?.id || null, material: m, porPrenda: Number(ins.cantidad || 0), necesario, costo: r2(necesario * (m?.precio || 0)) });
  });

  const costoMateriales = r2(lineas.reduce((a, l) => a + l.costo, 0));
  const costoConfeccion = r2(Number(modelo.costoConfeccion || 0) * unidades);
  const costoTotal = r2(costoMateriales + costoConfeccion);
  return {
    prendaId: prenda.id, nombre: prenda.nombre, modelo: { id: modelo.id, nombre: modelo.nombre, desperdicio },
    unidades, curva, lineas, costoMateriales, costoConfeccion, costoTotal,
    costoUnitario: unidades ? r2(costoTotal / unidades) : 0,
    avisos: [...new Set(avisos)],
  };
}

// Suma lo necesario de cada material en varias prendas y descuenta el stock
function listaDeCompras(calculos, materiales) {
  const porMaterial = new Map();
  const sinMaterial = [];
  calculos.forEach((c) => c.lineas.forEach((l) => {
    if (!l.necesario) return;
    if (!l.materialId) { sinMaterial.push({ prenda: c.nombre, rol: l.rol, necesario: l.necesario }); return; }
    const fila = porMaterial.get(l.materialId) || { material: materiales.get(l.materialId), necesario: 0, usos: [] };
    fila.necesario += l.necesario;
    fila.usos.push({ prenda: c.nombre, promo: c.promo, rol: l.rol, necesario: l.necesario });
    porMaterial.set(l.materialId, fila);
  }));
  const filas = [...porMaterial.values()].map((f) => {
    const necesario = r2(f.necesario);
    const stock = Number(f.material.stock) || 0;
    const comprar = r2(Math.max(0, necesario - stock));
    return { ...f, necesario, stock, comprar, costo: r2(comprar * (Number(f.material.precio) || 0)) };
  }).sort((a, b) => (a.material.tipo === b.material.tipo ? 0 : a.material.tipo === 'tela' ? -1 : 1)
    || (a.material.proveedor || '').localeCompare(b.material.proveedor || '') || a.material.nombre.localeCompare(b.material.nombre));
  return { filas, sinMaterial, total: r2(filas.reduce((a, f) => a + f.costo, 0)) };
}

const plano = (m) => (m ? m.get({ plain: true }) : m);

async function cargarMateriales() {
  const lista = await ProdMaterial.findAll();
  return new Map(lista.map((m) => [m.id, plano(m)]));
}

async function alumnosDe(promo, { confirmados = false } = {}) {
  const alumnos = await EgrAlumno.findAll({
    where: { promoId: promo.id },
    include: [
      { model: EgrSeleccion, as: 'selecciones', include: [{ model: EgrPrenda, as: 'prenda' }] },
      { model: EgrCuota, as: 'cuotas', include: [{ model: EgrComprobante, as: 'comprobantes' }] },
    ],
    order: [['nombre', 'ASC'], [{ model: EgrCuota, as: 'cuotas' }, 'numero', 'ASC']],
  });
  const hoy = egr.hoyAR();
  const lista = alumnos.map((a) => { a.promo = promo; return egr.resumenAlumno(a, hoy); });
  return confirmados ? lista.filter((a) => a.progreso.sena) : lista;
}

// Todo lo que necesitan la calculadora y las fichas de una promo
async function produccionDePromo(promoId, { confirmados = false, materiales } = {}) {
  const promo = await EgrPromo.findByPk(promoId, {
    include: [
      { model: EgrPrenda, as: 'prendas', include: [{ model: ProdModelo, as: 'modelo' }] },
      { model: EgrDiseno, as: 'disenos' },
    ],
    order: [[{ model: EgrPrenda, as: 'prendas' }, 'orden', 'ASC'], [{ model: EgrPrenda, as: 'prendas' }, 'id', 'ASC']],
  });
  if (!promo) return null;
  const mats = materiales || await cargarMateriales();
  const alumnos = await alumnosDe(promo, { confirmados });
  const etiqueta = `${promo.colegio} ${promo.curso} ${promo.anio}`;
  const prendas = promo.prendas.filter((p) => p.activo).map((p) => {
    const calculo = calcularPrenda({ prenda: p, modelo: plano(p.modelo), materiales: mats, curva: curvaDe(p, alumnos) });
    const bordados = p.conBordado
      ? alumnos.flatMap((a) => a.selecciones.filter((s) => s.prendaId === p.id).map((s) => ({ alumno: a.nombre, talle: s.talle, bordado: s.bordado || '', cantidad: s.cantidad })))
      : [];
    return { ...calculo, promo: etiqueta, descripcion: p.descripcion, conBordado: p.conBordado, fichaNotas: p.fichaNotas, modeloFicha: plano(p.modelo), bordados };
  });
  return {
    promo: { id: promo.id, codigo: promo.codigo, colegio: promo.colegio, curso: promo.curso, anio: promo.anio, fechaEntrega: promo.fechaEntrega, estadoProduccion: promo.estadoProduccion, notas: promo.notas },
    disenos: promo.disenos.map(serializarDiseno),
    alumnos: alumnos.length,
    confirmados,
    prendas,
    totales: {
      unidades: prendas.reduce((a, p) => a + p.unidades, 0),
      // El costo solo se puede calcular en las prendas que tienen ficha técnica
      unidadesConFicha: prendas.filter((p) => p.modelo).reduce((a, p) => a + p.unidades, 0),
      costo: r2(prendas.reduce((a, p) => a + p.costoTotal, 0)),
    },
  };
}

module.exports = { curvaDe, calcularPrenda, listaDeCompras, cargarMateriales, produccionDePromo };
