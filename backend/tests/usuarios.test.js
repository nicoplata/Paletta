const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, db, ADMIN, OPERADOR, prepararEscenario, cerrar } = require('./helpers');

describe('Usuarios', () => {
  let headers;
  before(async () => { headers = await prepararEscenario(); });
  after(cerrar);

  it('solo el admin puede listar usuarios y nunca se devuelve el password', async () => {
    assert.equal((await request(app).get('/api/usuarios').set(headers.operador)).status, 403);
    const res = await request(app).get('/api/usuarios').set(headers.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    assert.ok(res.body.every((u) => u.password === undefined));
  });

  it('crea usuarios validando email y largo de contraseña', async () => {
    const corta = await request(app).post('/api/usuarios').set(headers.admin)
      .send({ nombre: 'Nuevo', email: 'nuevo@test.com', password: 'corta' });
    assert.equal(corta.status, 400);
    const ok = await request(app).post('/api/usuarios').set(headers.admin)
      .send({ nombre: 'Nuevo', email: 'nuevo@test.com', password: 'UnaClaveLarga1' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.rol, 'usuario');
    assert.equal(ok.body.password, undefined);
  });

  it('un email duplicado devuelve 409', async () => {
    const res = await request(app).post('/api/usuarios').set(headers.admin)
      .send({ nombre: 'Otro', email: OPERADOR.email, password: 'UnaClaveLarga1' });
    assert.equal(res.status, 409);
  });

  it('actualizar sin password no la cambia; con password la cambia', async () => {
    const op = await db.User.findOne({ where: { email: OPERADOR.email } });
    await request(app).put(`/api/usuarios/${op.id}`).set(headers.admin).send({ nombre: 'Operador 2', password: '' }).expect(200);
    await request(app).post('/api/auth/login').send({ email: OPERADOR.email, password: OPERADOR.password }).expect(200);
    await request(app).put(`/api/usuarios/${op.id}`).set(headers.admin).send({ password: 'NuevaClave1234' }).expect(200);
    await request(app).post('/api/auth/login').send({ email: OPERADOR.email, password: 'NuevaClave1234' }).expect(200);
  });

  it('el admin no puede borrarse ni quitarse el rol a sí mismo', async () => {
    const admin = await db.User.findOne({ where: { email: ADMIN.email } });
    assert.equal((await request(app).delete(`/api/usuarios/${admin.id}`).set(headers.admin)).status, 400);
    assert.equal((await request(app).put(`/api/usuarios/${admin.id}`).set(headers.admin).send({ rol: 'usuario' })).status, 400);
  });

  it('puede borrar a otro usuario', async () => {
    const nuevo = await db.User.findOne({ where: { email: 'nuevo@test.com' } });
    assert.equal((await request(app).delete(`/api/usuarios/${nuevo.id}`).set(headers.admin)).status, 200);
    assert.equal(await db.User.findByPk(nuevo.id), null);
  });
});
