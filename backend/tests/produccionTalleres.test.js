const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { app, request, db, prepararEscenario, cerrar } = require('./helpers');
const egr = require('../src/services/egresados');
const prod = require('../src/services/produccion');
const { firmarTokenFamilia } = require('../src/middleware/authFamilia');
const { firmarTokenComision } = require('../src/middleware/authComision');

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

describe('Producción: etapas', () => {
  it('mover de etapa anota la fecha y borra las posteriores al volver atrás', () => {
    let p = { etapa: 'pendiente', seguimiento: {} };
    p = { ...p, ...prod.moverEtapa(p, 'cortado', '2027-05-01') };
    p = { ...p, ...prod.moverEtapa(p, 'taller', '2027-05-03') };
    assert.deepEqual(p.seguimiento, { cortado: '2027-05-01', taller: '2027-05-03' });
    p = { ...p, ...prod.moverEtapa(p, 'cortado', '2027-05-04') };
    assert.equal(p.etapa, 'cortado');
    assert.deepEqual(p.seguimiento, { cortado: '2027-05-04' });
    assert.deepEqual(prod.moverEtapa(p, 'pendiente', '2027-05-05').seguimiento, {});
  });
});

describe('Producción: talleres, órdenes y contrato', () => {
  let headers;
  let promo;
  let buzo;
  let taller;
  let orden;
  let alumno;

  before(async () => {
    headers = await prepararEscenario();
    promo = (await request(app).post('/api/admin/egresados/promos').set(headers.admin).send({
      colegio: 'Colegio Oeste', curso: '5º A', anio: 2027, planes: [1], primerVencimiento: egr.sumarDias(egr.hoyAR(), 30),
    })).body;
    const modelo = (await request(app).post('/api/admin/produccion/modelos').set(headers.admin)
      .send({ nombre: 'Buzo', talles: ['S', 'M'], costoConfeccion: 4000, pasos: '1. Coser' })).body;
    buzo = (await request(app).post(`/api/admin/egresados/promos/${promo.id}/prendas`).set(headers.admin)
      .send({ nombre: 'Buzo', precio: 50000, talles: ['S', 'M'], conBordado: true, modeloId: modelo.id })).body;
    alumno = await db.EgrAlumno.create({ promoId: promo.id, numero: 1, nombre: 'Ana', dni: '40111222' });
    await db.EgrSeleccion.create({ alumnoId: alumno.id, prendaId: buzo.id, talle: 'S', bordado: 'ANITA', cantidad: 1, precioUnitario: 50000 });
    const b = await db.EgrAlumno.create({ promoId: promo.id, numero: 2, nombre: 'Beto' });
    await db.EgrSeleccion.create({ alumnoId: b.id, prendaId: buzo.id, talle: 'M', cantidad: 2, precioUnitario: 50000 });
  });
  after(cerrar);

  it('carga un taller', async () => {
    const res = await request(app).post('/api/admin/produccion/talleres').set(headers.admin)
      .send({ nombre: 'Taller Doña Rosa', telefono: '11 4444-5555', contacto: 'Rosa' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    taller = res.body;
  });

  it('crea una orden de taller con el precio de la ficha técnica', async () => {
    let res = await request(app).post('/api/admin/produccion/ordenes').set(headers.admin)
      .send({ prendaId: buzo.id, tallerId: taller.id, cantidades: { S: 1, XL: 1 } });
    assert.equal(res.status, 400, 'no acepta talles que la prenda no tiene');
    res = await request(app).post('/api/admin/produccion/ordenes').set(headers.admin)
      .send({ prendaId: buzo.id, tallerId: taller.id, cantidades: { S: 1, M: 2 }, compromisoEl: egr.sumarDias(egr.hoyAR(), -1) });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    orden = res.body;
    assert.equal(orden.precioUnitario, 4000);
    assert.equal(orden.total, 12000);
    assert.equal(orden.estado, 'preparando');
    assert.match(orden.numero, /^T-\d{4}$/);

    const datos = (await request(app).get(`/api/admin/produccion/promos/${promo.id}`).set(headers.admin)).body;
    assert.deepEqual(datos.prendas[0].pendienteTaller, { S: 0, M: 0 });
  });

  it('al enviarla la prenda pasa a "En taller" y figura atrasada si venció el compromiso', async () => {
    const res = await request(app).put(`/api/admin/produccion/ordenes/${orden.id}`).set(headers.admin).send({ estado: 'enviada' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.enviadaEl, egr.hoyAR());
    const seg = (await request(app).get('/api/admin/produccion/seguimiento').set(headers.admin)).body;
    const p = seg.promos.find((x) => x.id === promo.id).prendas[0];
    assert.equal(p.etapa, 'taller');
    assert.equal(p.enTaller, 3);
    assert.equal(p.unidades, 3);
    assert.equal(p.atrasadas.length, 1);
  });

  it('la ficha de taller trae los insumos de esa cantidad y los bordados si va completa', async () => {
    const res = await request(app).get(`/api/admin/produccion/ordenes/${orden.id}/ficha`).set(headers.admin);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.taller.nombre, 'Taller Doña Rosa');
    assert.equal(res.body.prenda.modelo.pasos, '1. Coser');
    assert.equal(res.body.prenda.bordados.length, 2);
    assert.deepEqual(res.body.prenda.curva, [{ talle: 'S', cantidad: 1 }, { talle: 'M', cantidad: 2 }]);
  });

  it('al recibirla con fallas la prenda pasa a control', async () => {
    const res = await request(app).put(`/api/admin/produccion/ordenes/${orden.id}`).set(headers.admin)
      .send({ estado: 'recibida', recibidas: { S: 1, M: 2 }, falladas: { M: 1 } });
    assert.equal(res.status, 200);
    assert.equal(res.body.recibidasTotal, 3);
    assert.equal(res.body.falladasTotal, 1);
    assert.equal((await db.EgrPrenda.findByPk(buzo.id)).etapa, 'control');

    const etapa = await request(app).put(`/api/admin/produccion/prendas/${buzo.id}/etapa`).set(headers.admin).send({ etapa: 'listo' });
    assert.equal(etapa.status, 200);
    assert.equal(etapa.body.etapa, 'listo');
    assert.ok(etapa.body.seguimiento.taller && etapa.body.seguimiento.listo);
  });

  it('no deja borrar un taller con órdenes', async () => {
    const res = await request(app).delete(`/api/admin/produccion/talleres/${taller.id}`).set(headers.admin);
    assert.equal(res.status, 409);
  });

  it('arma el contrato y guarda las cláusulas editadas', async () => {
    let res = await request(app).get(`/api/admin/egresados/promos/${promo.id}/contrato/datos`).set(headers.admin);
    assert.equal(res.status, 200);
    assert.match(res.body.clausulas, /OBJETO/);
    assert.equal(res.body.promo.prendas.length, 1);
    res = await request(app).put('/api/admin/egresados/contrato/clausulas').set(headers.admin).send({ clausulas: 'PRIMERA. Cláusula de prueba editada.' });
    assert.equal(res.status, 200);
    res = await request(app).get('/api/admin/egresados/contrato/clausulas').set(headers.admin);
    assert.equal(res.body.clausulas, 'PRIMERA. Cláusula de prueba editada.');
    assert.match(res.body.base, /OBJETO/);
  });

  it('sube el contrato firmado y lo ven la familia y la comisión, no la vista pública', async () => {
    const fam = { Authorization: `Bearer ${firmarTokenFamilia(alumno)}` };
    assert.equal((await request(app).get('/api/egresados/mi-promo/contrato').set(fam)).status, 404);

    let res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/contrato`).set(headers.admin)
      .attach('archivo', Buffer.from('no soy un pdf'), { filename: 'x.pdf', contentType: 'application/pdf' });
    assert.equal(res.status, 400);
    res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/contrato`).set(headers.admin)
      .attach('archivo', PDF, { filename: 'contrato.pdf', contentType: 'application/pdf' });
    assert.equal(res.status, 201, JSON.stringify(res.body));

    res = await request(app).get('/api/egresados/mi-promo/contrato').set(fam);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.equal(res.headers['cache-control'], 'private, no-store');
    const vista = (await request(app).get('/api/egresados/mi-promo').set(fam)).body;
    assert.ok(vista.promo.contrato.subidoEl);

    const p = await db.EgrPromo.findByPk(promo.id);
    const com = { Authorization: `Bearer ${firmarTokenComision(p)}` };
    res = await request(app).get('/api/egresados/comision/contrato').set(com);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok((await request(app).get('/api/egresados/comision').set(com)).body.promo.contrato);
    const publico = (await request(app).get(`/api/egresados/codigo/${encodeURIComponent(p.codigo)}/curso`)).body;
    assert.equal(publico.promo.contrato, null);

    assert.equal((await request(app).get('/api/egresados/mi-promo/contrato')).status, 401);
    res = await request(app).delete(`/api/admin/egresados/promos/${promo.id}/contrato`).set(headers.admin);
    assert.equal(res.status, 204);
    assert.equal((await request(app).get('/api/egresados/mi-promo/contrato').set(fam)).status, 404);
  });
});
