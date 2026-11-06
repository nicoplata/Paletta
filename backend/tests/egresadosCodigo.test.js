const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.EGR_INGRESOS_POR_15MIN = '1000';
process.env.EGR_CODIGOS_POR_15MIN = '1000';

const { app, request, prepararEscenario, cerrar } = require('./helpers');
const egr = require('../src/services/egresados');

describe('Egresados: entrada con código de contrato y clave de la comisión', () => {
  let headers;
  let promo;
  let tokenComision;
  const enDias = (n) => egr.sumarDias(egr.hoyAR(), n);

  before(async () => {
    headers = await prepararEscenario();
    promo = (await request(app).post('/api/admin/egresados/promos').set(headers.admin)
      .send({ colegio: 'Colegio Este', curso: '5º A', anio: 2027, primerVencimiento: enDias(20) })).body;
    await request(app).post(`/api/admin/egresados/promos/${promo.id}/alumnos`).set(headers.admin).send({ nombres: ['Ana Díaz'] });
  });
  after(cerrar);

  it('cada promo nueva tiene un código legible y una clave de 6 números', () => {
    assert.match(promo.codigo, /^EGR27-[A-HJ-NP-Z2-9]{4}$/);
    assert.match(promo.comisionClave, /^\d{6}$/);
    assert.match(promo.linkPortal, /\/mi-promo\/$/);
  });

  it('el código se encuentra sin importar mayúsculas, espacios ni guiones', async () => {
    const tipeado = promo.codigo.toLowerCase().replace('-', ' ');
    const res = await request(app).get(`/api/egresados/codigo/${encodeURIComponent(tipeado)}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.slug, promo.slug);
    assert.deepEqual([res.body.colegio, res.body.curso, res.body.anio], ['Colegio Este', '5º A', 2027]);
    assert.equal((await request(app).get('/api/egresados/codigo/NOEXISTE1')).status, 404);
    assert.equal((await request(app).get('/api/egresados/codigo/%3Cscript%3E')).status, 400);
  });

  it('la comisión entra con el código y la clave, y ve el tablero', async () => {
    let res = await request(app).post('/api/egresados/comision/ingresar').send({ codigo: promo.codigo, clave: '000000' });
    assert.equal(res.status, 401);
    res = await request(app).post('/api/egresados/comision/ingresar').send({ codigo: promo.codigo, clave: '12' });
    assert.equal(res.status, 400);
    res = await request(app).post('/api/egresados/comision/ingresar').send({ codigo: promo.codigo.toLowerCase(), clave: promo.comisionClave });
    assert.equal(res.status, 200);
    tokenComision = { Authorization: `Bearer ${res.body.token}` };

    res = await request(app).get('/api/egresados/comision').set(tokenComision);
    assert.equal(res.status, 200);
    assert.equal(res.body.alumnos, 1);
    res = await request(app).put('/api/egresados/comision/integrantes').set(tokenComision).send({ integrantes: [{ nombre: 'Mamá de Ana' }] });
    assert.equal(res.body.etapas[1].estado, 'completa');
    res = await request(app).post('/api/egresados/comision/diseno').set(tokenComision).send({ nombre: 'Mamá de Ana' });
    assert.equal(res.status, 409);
    // El link secreto anterior sigue funcionando
    assert.equal((await request(app).get(`/api/egresados/comision/${promo.linkComision.split('/').pop()}`)).status, 200);
  });

  it('las sesiones de comisión, familia y panel no se mezclan', async () => {
    assert.equal((await request(app).get('/api/egresados/mi-promo').set(tokenComision)).status, 401);
    assert.equal((await request(app).get('/api/admin/egresados/promos').set(tokenComision)).status, 401);
    assert.equal((await request(app).get('/api/egresados/comision').set(headers.admin)).status, 401);
    const lista = (await request(app).get(`/api/egresados/promos/${promo.slug}`)).body.alumnos;
    const fam = await request(app).post(`/api/egresados/promos/${promo.slug}/ingresar`).send({ alumnoId: lista[0].id, dni: '40111222' });
    assert.equal((await request(app).get('/api/egresados/comision').set({ Authorization: `Bearer ${fam.body.token}` })).status, 401);
    assert.equal((await request(app).get('/api/egresados/comision')).status, 401);
  });

  it('si Paletta cambia la clave, la sesión anterior de la comisión se cierra', async () => {
    const res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/comision/clave`).set(headers.admin);
    assert.equal(res.status, 200);
    assert.notEqual(res.body.comisionClave, promo.comisionClave);
    assert.equal((await request(app).get('/api/egresados/comision').set(tokenComision)).status, 401);
    const nueva = await request(app).post('/api/egresados/comision/ingresar').send({ codigo: promo.codigo, clave: res.body.comisionClave });
    assert.equal(nueva.status, 200);
  });

  it('el panel puede poner su propio código de contrato, sin repetirlo', async () => {
    let res = await request(app).post('/api/admin/egresados/promos').set(headers.admin)
      .send({ colegio: 'Otro Colegio', curso: '6º B', anio: 2027, primerVencimiento: enDias(20), codigo: 'c-1234' });
    assert.equal(res.status, 201);
    assert.equal(res.body.codigo, 'C-1234');
    res = await request(app).put(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin).send({ codigo: 'C 1234' });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /ya lo usa otra promo/);
    res = await request(app).put(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin).send({ codigo: 'SAN-MARTIN-27' });
    assert.equal(res.status, 200);
    assert.equal((await request(app).get('/api/egresados/codigo/sanmartin27')).body.slug, promo.slug);
  });

  it('una promo desactivada no se encuentra por código', async () => {
    await request(app).put(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin).send({ activo: false });
    assert.equal((await request(app).get('/api/egresados/codigo/SAN-MARTIN-27')).status, 404);
  });
});
