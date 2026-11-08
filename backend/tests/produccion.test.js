const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { app, request, db, prepararEscenario, cerrar } = require('./helpers');
const prod = require('../src/services/produccion');
const egr = require('../src/services/egresados');

describe('Producción: cálculo', () => {
  const frisa = { id: 1, nombre: 'Frisa', tipo: 'tela', unidad: 'm', precio: 1000, stock: 2 };
  const rib = { id: 2, nombre: 'Rib', tipo: 'tela', unidad: 'm', precio: 500, stock: 0 };
  const cierre = { id: 3, nombre: 'Cierre', tipo: 'insumo', unidad: 'u', precio: 300, stock: 10 };
  const materiales = new Map([[1, frisa], [2, rib], [3, cierre]]);
  const modelo = {
    id: 9, nombre: 'Campera', desperdicio: 10, costoConfeccion: 2000,
    piezas: [{ rol: 'Cuerpo', porTalle: { S: 1, M: 1.2 } }, { rol: 'Puños', porTalle: { S: 0.1, M: 0.1 } }],
    insumos: [{ rol: 'Cierre', cantidad: 1 }],
  };
  const prenda = { id: 5, nombre: 'Campera', talles: ['S', 'M'], materiales: { Cuerpo: 1, 'Puños': 2, Cierre: 3 } };

  it('arma la curva de talles con las selecciones', () => {
    const alumnos = [
      { selecciones: [{ prendaId: 5, talle: 'S', cantidad: 1 }, { prendaId: 6, talle: 'S', cantidad: 1 }] },
      { selecciones: [{ prendaId: 5, talle: 'M', cantidad: 2 }] },
    ];
    assert.deepEqual(prod.curvaDe(prenda, alumnos), [{ talle: 'S', cantidad: 1 }, { talle: 'M', cantidad: 2 }]);
  });

  it('calcula metros por talle con desperdicio, insumos y costos', () => {
    const c = prod.calcularPrenda({ prenda, modelo, materiales, curva: [{ talle: 'S', cantidad: 1 }, { talle: 'M', cantidad: 2 }] });
    assert.equal(c.unidades, 3);
    const cuerpo = c.lineas.find((l) => l.rol === 'Cuerpo');
    assert.equal(cuerpo.necesario, 3.74); // (1 + 1.2*2) * 1.1
    assert.equal(cuerpo.costo, 3740);
    assert.equal(c.lineas.find((l) => l.rol === 'Puños').necesario, 0.33);
    assert.equal(c.lineas.find((l) => l.rol === 'Cierre').necesario, 3);
    assert.equal(c.costoConfeccion, 6000);
    assert.equal(c.costoTotal, 3740 + 165 + 900 + 6000);
    assert.equal(c.costoUnitario, Math.round(((3740 + 165 + 900 + 6000) / 3) * 100) / 100);
    assert.deepEqual(c.avisos, []);
  });

  it('avisa lo que falta para calcular', () => {
    const c = prod.calcularPrenda({ prenda: { ...prenda, materiales: { Cuerpo: 1 } }, modelo, materiales, curva: [{ talle: 'XL', cantidad: 1 }] });
    assert.ok(c.avisos.some((a) => a.includes('Puños')));
    assert.ok(c.avisos.some((a) => a.includes('talle XL')));
    const sinFicha = prod.calcularPrenda({ prenda, modelo: null, materiales, curva: [{ talle: 'S', cantidad: 1 }] });
    assert.match(sinFicha.avisos[0], /ficha técnica/);
  });

  it('la lista de compras suma prendas y descuenta el stock', () => {
    const curva = [{ talle: 'S', cantidad: 1 }, { talle: 'M', cantidad: 2 }];
    const a = prod.calcularPrenda({ prenda, modelo, materiales, curva });
    const b = prod.calcularPrenda({ prenda: { ...prenda, id: 6 }, modelo, materiales, curva });
    const lista = prod.listaDeCompras([a, b], materiales);
    const f = (id) => lista.filas.find((x) => x.material.id === id);
    assert.equal(f(1).necesario, 7.48);
    assert.equal(f(1).comprar, 5.48); // hay 2 m en stock
    assert.equal(f(3).comprar, 0); // 6 cierres, hay 10
    assert.equal(lista.total, 5480 + 330);
    assert.equal(lista.filas[0].material.tipo, 'tela');
  });
});

describe('Producción: API', () => {
  let headers;
  let promo;
  let buzo;
  const ids = {};

  before(async () => {
    headers = await prepararEscenario();
  });
  after(cerrar);

  it('solo el admin accede', async () => {
    const res = await request(app).get('/api/admin/produccion/materiales');
    assert.equal(res.status, 401);
  });

  it('carga materiales y una ficha técnica', async () => {
    for (const [k, m] of Object.entries({
      frisa: { nombre: 'Frisa invisible', tipo: 'tela', color: 'Azul marino', unidad: 'm', proveedor: 'Textil Sur', precio: 9000, stock: 1 },
      rib: { nombre: 'Rib', tipo: 'tela', color: 'Blanco', unidad: 'm', proveedor: 'Textil Sur', precio: 6000 },
      etiqueta: { nombre: 'Etiqueta talle', tipo: 'insumo', unidad: 'u', precio: 50, stock: 100 },
    })) {
      const res = await request(app).post('/api/admin/produccion/materiales').set(headers.admin).send(m);
      assert.equal(res.status, 201, JSON.stringify(res.body));
      ids[k] = res.body.id;
    }
    const res = await request(app).post('/api/admin/produccion/modelos').set(headers.admin).send({
      nombre: 'Buzo canguro', categoria: 'buzo', talles: ['S', 'M'], desperdicio: 5, costoConfeccion: 4500,
      piezas: [{ rol: 'Cuerpo y mangas', porTalle: { S: 1.3, M: 1.4, XL: 2 } }, { rol: 'Puños y cintura', porTalle: { S: 0.2, M: 0.2 } }],
      insumos: [{ rol: 'Etiqueta', cantidad: 1 }],
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual(res.body.piezas[0].porTalle, { S: 1.3, M: 1.4 }, 'descarta talles que no están en el modelo');
    ids.modelo = res.body.id;

    const dup = await request(app).post('/api/admin/produccion/modelos').set(headers.admin)
      .send({ nombre: 'X', talles: ['S'], piezas: [{ rol: 'A', porTalle: {} }, { rol: 'A', porTalle: {} }] });
    assert.equal(dup.status, 400);
  });

  it('asigna la ficha y los materiales a una prenda de la promo', async () => {
    let res = await request(app).post('/api/admin/egresados/promos').set(headers.admin).send({
      colegio: 'Colegio Norte', curso: '5º B', anio: 2027, planes: [1], primerVencimiento: egr.sumarDias(egr.hoyAR(), 30),
    });
    assert.equal(res.status, 201);
    promo = res.body;
    res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/prendas`).set(headers.admin).send({
      nombre: 'Buzo', precio: 50000, talles: ['S', 'M'], conBordado: true, modeloId: ids.modelo,
      materiales: { 'Cuerpo y mangas': ids.frisa, 'Puños y cintura': ids.rib, Etiqueta: ids.etiqueta, Otro: null },
      fichaNotas: 'Bordado en la espalda',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    buzo = res.body;
    assert.deepEqual(Object.keys(buzo.materiales).sort(), ['Cuerpo y mangas', 'Etiqueta', 'Puños y cintura']);

    const malo = await request(app).put(`/api/admin/egresados/prendas/${buzo.id}`).set(headers.admin).send({ materiales: { Etiqueta: 999999 } });
    assert.equal(malo.status, 400);
    const sinModelo = await request(app).put(`/api/admin/egresados/prendas/${buzo.id}`).set(headers.admin).send({ modeloId: 999999 });
    assert.equal(sinModelo.status, 404);
  });

  it('calcula la producción de la promo con las selecciones de los alumnos', async () => {
    const elegir = async (numero, nombre, talle, bordado) => {
      const a = await db.EgrAlumno.create({ promoId: promo.id, numero, nombre });
      await db.EgrSeleccion.create({ alumnoId: a.id, prendaId: buzo.id, talle, bordado, cantidad: 1, precioUnitario: 50000 });
    };
    await elegir(1, 'Ana', 'S', 'ANITA');
    await elegir(2, 'Beto', 'M', 'BETO');
    await elegir(3, 'Caro', 'M', null);

    const res = await request(app).get(`/api/admin/produccion/promos/${promo.id}`).set(headers.admin);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const p = res.body.prendas[0];
    assert.equal(p.unidades, 3);
    assert.deepEqual(p.curva, [{ talle: 'S', cantidad: 1 }, { talle: 'M', cantidad: 2 }]);
    assert.equal(p.lineas.find((l) => l.rol === 'Cuerpo y mangas').necesario, 4.31); // (1.3 + 2.8) * 1.05
    assert.equal(p.bordados.length, 3);
    assert.equal(p.fichaNotas, 'Bordado en la espalda');
    assert.deepEqual(p.avisos, []);

    const conf = await request(app).get(`/api/admin/produccion/promos/${promo.id}?confirmados=true`).set(headers.admin);
    assert.equal(conf.body.prendas[0].unidades, 0, 'sin la cuota 1 paga no cuentan como confirmados');
  });

  it('arma la lista de compras de varias promos', async () => {
    const res = await request(app).get(`/api/admin/produccion/compras?promos=${promo.id}`).set(headers.admin);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const frisa = res.body.filas.find((f) => f.material.id === ids.frisa);
    assert.equal(frisa.necesario, 4.31);
    assert.equal(frisa.comprar, 3.31);
    assert.equal(frisa.costo, 29790);
    assert.equal(res.body.filas.find((f) => f.material.id === ids.etiqueta).comprar, 0);
    assert.equal(res.body.promos[0].unidades, 3);

    const vacia = await request(app).get('/api/admin/produccion/compras?promos=').set(headers.admin);
    assert.equal(vacia.status, 400);
  });

  it('no deja borrar una ficha técnica en uso', async () => {
    const res = await request(app).delete(`/api/admin/produccion/modelos/${ids.modelo}`).set(headers.admin);
    assert.equal(res.status, 409);
  });
});
