const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { app, request, db, ADMIN, prepararEscenario, cerrar } = require('./helpers');

describe('Autenticación', () => {
  let headers;
  before(async () => { headers = await prepararEscenario(); });
  after(cerrar);

  it('login correcto devuelve token y usuario sin password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: ADMIN.password });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.usuario.rol, 'administrador');
    assert.equal(res.body.usuario.password, undefined);
  });

  it('el email no distingue mayúsculas', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ADMIN@Test.com', password: ADMIN.password });
    assert.equal(res.status, 200);
  });

  it('password incorrecta y email inexistente devuelven el mismo error', async () => {
    const mala = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: 'incorrecta' });
    const inexistente = await request(app).post('/api/auth/login').send({ email: 'nadie@test.com', password: 'incorrecta' });
    assert.equal(mala.status, 401);
    assert.equal(inexistente.status, 401);
    assert.deepEqual(mala.body, inexistente.body);
  });

  it('valida el cuerpo del login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'no-es-email' });
    assert.equal(res.status, 400);
    assert.ok(res.body.detalles.length >= 1);
  });

  it('/me devuelve el usuario del token', async () => {
    const res = await request(app).get('/api/auth/me').set(headers.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.email, ADMIN.email);
  });

  it('/me rechaza sin token, con token inválido o firmado con otro secreto', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', 'Bearer basura')).status, 401);
    const falso = jwt.sign({ id: 1, rol: 'administrador' }, 'otro-secreto');
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${falso}`)).status, 401);
  });

  it('un token de un usuario eliminado deja de servir', async () => {
    const temporal = await db.User.create({ nombre: 'Temp', email: 'temp@test.com', password: 'ClaveTemporal1', rol: 'administrador' });
    const login = await request(app).post('/api/auth/login').send({ email: 'temp@test.com', password: 'ClaveTemporal1' });
    await temporal.destroy();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    assert.equal(res.status, 401);
  });

  it('el password se guarda hasheado', async () => {
    const usuario = await db.User.scope('conPassword').findOne({ where: { email: ADMIN.email } });
    assert.notEqual(usuario.password, ADMIN.password);
    assert.match(usuario.password, /^\$2[aby]\$/);
  });
});
