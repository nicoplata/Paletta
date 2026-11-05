const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, db, prepararEscenario, cerrar } = require('./helpers');

describe('Contacto y API general', () => {
  let headers;
  before(async () => { headers = await prepararEscenario(); });
  after(cerrar);

  const mensaje = { nombre: 'Ana', email: 'ana@mail.com', mensaje: 'Quiero un presupuesto para 30 camperas.' };

  it('guarda un mensaje válido', async () => {
    const res = await request(app).post('/api/contacto').send(mensaje);
    assert.equal(res.status, 201);
    assert.equal(await db.MensajeContacto.count(), 1);
  });

  it('valida los campos', async () => {
    const res = await request(app).post('/api/contacto').send({ nombre: 'A', email: 'x', mensaje: 'corto' });
    assert.equal(res.status, 400);
    assert.equal(res.body.detalles.length, 3);
  });

  it('el honeypot responde OK pero no guarda nada', async () => {
    const res = await request(app).post('/api/contacto').send({ ...mensaje, sitio: 'http://spam.example' });
    assert.equal(res.status, 201);
    assert.equal(await db.MensajeContacto.count(), 1);
  });

  it('la bandeja es solo para administradores y permite marcar y borrar', async () => {
    assert.equal((await request(app).get('/api/contacto')).status, 401);
    const lista = await request(app).get('/api/contacto').set(headers.admin);
    assert.equal(lista.body.length, 1);
    const id = lista.body[0].id;
    const marcado = await request(app).patch(`/api/contacto/${id}`).set(headers.admin).send({ leido: true });
    assert.equal(marcado.body.leido, true);
    await request(app).delete(`/api/contacto/${id}`).set(headers.admin).expect(200);
    assert.equal(await db.MensajeContacto.count(), 0);
  });

  it('limita los envíos por IP', async () => {
    let ultimo;
    for (let i = 0; i < 6; i += 1) ultimo = await request(app).post('/api/contacto').send(mensaje);
    assert.equal(ultimo.status, 429);
  });

  it('healthcheck, 404 en JSON, JSON inválido y cabeceras de seguridad', async () => {
    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.headers['x-powered-by'], undefined);
    assert.equal(health.headers['x-content-type-options'], 'nosniff');
    assert.equal((await request(app).get('/api/no-existe')).status, 404);
    const json = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{malo');
    assert.equal(json.status, 400);
  });

  it('CORS rechaza orígenes no permitidos', async () => {
    const res = await request(app).get('/api/categorias').set('Origin', 'https://sitio-malicioso.com');
    assert.equal(res.status, 403);
    const ok = await request(app).get('/api/categorias').set('Origin', 'http://localhost:5173');
    assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
  });
});
