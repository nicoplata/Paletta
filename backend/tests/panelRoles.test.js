const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { app, request, db, ADMIN, ENCARGADO, prepararEscenario, cerrar } = require('./helpers');
const egr = require('../src/services/egresados');
const { notificar } = require('../src/services/notificaciones');
const resumen = require('../src/services/resumenDiario');

describe('Panel: rol encargado, confirmación y actividad', () => {
  let headers;
  let promo;

  before(async () => {
    headers = await prepararEscenario();
  });

  it('el encargado hace el trabajo diario', async () => {
    const r = await request(app).post('/api/admin/egresados/promos').set(headers.encargado).send({
      colegio: 'Colegio Este', curso: '6º B', anio: 2027, planes: [1], primerVencimiento: egr.sumarDias(egr.hoyAR(), 30),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    promo = r.body;
    for (const url of ['/api/admin/egresados/promos', '/api/admin/egresados/presupuestos', '/api/admin/egresados/comprobantes', '/api/admin/pedidos',
      '/api/admin/produccion/materiales', '/api/admin/produccion/seguimiento', '/api/contacto', '/api/productos', '/api/admin/egresados/fotos', '/api/admin/notificaciones']) {
      assert.equal((await request(app).get(url).set(headers.encargado)).status, 200, url);
    }
  });

  it('el encargado no entra a la configuración ni borra cosas importantes', async () => {
    const pruebas = [
      ['get', '/api/usuarios'], ['get', '/api/admin/cupones'], ['get', '/api/admin/zonas-envio'], ['get', '/api/admin/actividad'],
      ['put', '/api/admin/egresados/cuenta', { alias: 'otro.alias' }], ['put', '/api/admin/egresados/contrato/clausulas', { clausulas: 'Una cláusula nueva de prueba.' }],
      ['put', '/api/admin/egresados/instagram', { token: `IGAA${'x'.repeat(50)}` }],
      ['delete', `/api/admin/egresados/promos/${promo.id}?confirmarCodigo=${promo.codigo}`],
      ['post', `/api/admin/egresados/promos/${promo.id}/comision/clave`], ['delete', '/api/admin/egresados/cuotas/1/pago'],
      ['delete', '/api/productos/1'], ['delete', '/api/admin/produccion/materiales/1'],
    ];
    for (const [metodo, url, cuerpo] of pruebas) {
      const res = await request(app)[metodo](url).set(headers.encargado).send(cuerpo || {});
      assert.equal(res.status, 403, `${metodo} ${url} → ${res.status}`);
    }
    assert.equal((await request(app).get('/api/admin/egresados/promos').set(headers.operador)).status, 403, 'el rol usuario no entra al panel');
  });

  it('las acciones sensibles piden la contraseña y borrar una promo, su código', async () => {
    let res = await request(app).delete(`/api/admin/egresados/promos/${promo.id}`).set(headers.adminSinConfirmar);
    assert.equal(res.status, 428);
    assert.equal(res.body.requiereConfirmacion, true);

    const mal = await request(app).post('/api/auth/confirmar').set(headers.adminSinConfirmar).send({ password: 'otra-cosa' });
    assert.equal(mal.status, 401);
    const bien = await request(app).post('/api/auth/confirmar').set(headers.adminSinConfirmar).send({ password: ADMIN.password });
    assert.equal(bien.status, 200);
    assert.equal(bien.body.minutos, 10);
    // el permiso de confirmación no sirve como sesión, ni el de otro usuario sirve para confirmar
    assert.equal((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${bien.body.token}` })).status, 401);
    const conf = { ...headers.adminSinConfirmar, 'X-Confirmacion': bien.body.token };
    assert.equal((await request(app).delete(`/api/admin/egresados/promos/${promo.id}`).set({ ...headers.adminSinConfirmar, 'X-Confirmacion': headers.encargado['X-Confirmacion'] })).status, 428);

    res = await request(app).delete(`/api/admin/egresados/promos/${promo.id}?confirmarCodigo=OTRO-1234`).set(conf);
    assert.equal(res.status, 400);
    assert.match(res.body.error, new RegExp(promo.codigo));
    res = await request(app).delete(`/api/admin/egresados/promos/${promo.id}?confirmarCodigo=${promo.codigo.toLowerCase()}`).set(conf);
    assert.equal(res.status, 200, JSON.stringify(res.body));
  });

  it('el registro de actividad guarda quién hizo qué', async () => {
    const res = await request(app).get('/api/admin/actividad').set(headers.admin);
    assert.equal(res.status, 200);
    const acciones = res.body.map((a) => a.accion);
    assert.ok(acciones.includes('promo_creada'));
    assert.ok(acciones.includes('promo_borrada'));
    assert.ok(acciones.includes('confirmacion_fallida'));
    const creada = res.body.find((a) => a.accion === 'promo_creada');
    assert.match(creada.usuarioNombre, new RegExp(ENCARGADO.email));
    const sensibles = (await request(app).get('/api/admin/actividad?sensibles=true').set(headers.admin)).body;
    assert.ok(sensibles.length && sensibles.every((a) => a.sensible));
  });
});

describe('Panel: notificaciones y pendientes', () => {
  let headers;

  before(async () => {
    headers = await prepararEscenario();
  });
  after(cerrar);

  it('un mensaje de contacto genera una notificación para el equipo', async () => {
    await request(app).post('/api/contacto').send({ nombre: 'Laura', email: 'laura@example.com', mensaje: 'Quiero consultar por uniformes.' }).expect(201);
    await notificar({ tipo: 'sistema', titulo: 'Solo para el administrador', soloAdmin: true, clave: 'prueba-admin' });
    await notificar({ tipo: 'sistema', titulo: 'Repetida', clave: 'prueba-admin' });

    const adm = (await request(app).get('/api/admin/notificaciones').set(headers.admin)).body;
    assert.equal(adm.noLeidas, 2, 'la de clave repetida no se duplica');
    assert.ok(adm.items.some((n) => n.tipo === 'mensaje' && n.link === '/admin/dashboard/mensajes'));
    assert.ok(adm.pendientes.some((p) => p.clave === 'mensajes' && p.cantidad === 1));

    const enc = (await request(app).get('/api/admin/notificaciones').set(headers.encargado)).body;
    assert.equal(enc.noLeidas, 1, 'el encargado no ve las que son solo del administrador');

    await request(app).post('/api/admin/notificaciones/leidas').set(headers.encargado).expect(204);
    assert.equal((await request(app).get('/api/admin/notificaciones').set(headers.encargado)).body.noLeidas, 0);
    assert.equal((await request(app).get('/api/admin/notificaciones').set(headers.admin)).body.noLeidas, 2, 'cada uno marca las suyas');
  });

  it('avisa las órdenes de taller atrasadas una sola vez', async () => {
    const promo = await db.EgrPromo.create({
      codigo: 'EGR27-PRUE', codigoBusqueda: 'EGR27PRUE', slug: 'promo-prueba-0001', comisionClave: '123456', comisionToken: 'x'.repeat(24),
      colegio: 'Colegio Sur', curso: '5º A', anio: 2027, planes: [1], primerVencimiento: '2027-03-10',
    });
    const prenda = await db.EgrPrenda.create({ promoId: promo.id, nombre: 'Buzo', precio: 1000, talles: ['S'] });
    const taller = await db.ProdTaller.create({ nombre: 'Taller Uno' });
    await db.ProdOrden.create({ prendaId: prenda.id, tallerId: taller.id, cantidades: { S: 2 }, estado: 'enviada', compromisoEl: egr.sumarDias(egr.hoyAR(), -2) });
    assert.equal(await resumen.avisarAtrasadas(), 1);
    await resumen.avisarAtrasadas();
    assert.equal(await db.Notificacion.count({ where: { tipo: 'atrasada' } }), 1);
    const pend = await resumen.pendientes();
    assert.equal(pend.find((p) => p.clave === 'atrasadas').cantidad, 1);
    const r = await resumen.enviarResumen();
    assert.equal(r.enviado, false, 'sin mail configurado no se envía (y no rompe)');
  });

  it('el resumen diario va solo a los usuarios elegidos', async () => {
    assert.deepEqual(await resumen.destinatariosResumen(), [], 'por defecto no lo recibe nadie');
    const admin = await db.User.findOne({ where: { email: ADMIN.email } });
    const enc = await db.User.findOne({ where: { email: ENCARGADO.email } });
    const res = await request(app).put(`/api/usuarios/${admin.id}`).set(headers.admin).send({ recibeResumen: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.recibeResumen, true);
    assert.equal((await request(app).put(`/api/usuarios/${enc.id}`).set(headers.encargado).send({ recibeResumen: true })).status, 403, 'el encargado no elige destinatarios');
    assert.deepEqual(await resumen.destinatariosResumen(), [ADMIN.email]);
    // Un usuario sin acceso al panel no lo recibe aunque esté marcado
    await db.User.update({ recibeResumen: true }, { where: { rol: 'usuario' } });
    assert.deepEqual(await resumen.destinatariosResumen(), [ADMIN.email]);
  });
});
