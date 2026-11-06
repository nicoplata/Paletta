const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.EGR_INGRESOS_POR_15MIN = '1000';

const { app, request, db, prepararEscenario, cerrar } = require('./helpers');
const egr = require('../src/services/egresados');

describe('Egresados: servicio', () => {
  it('suma meses respetando el fin de mes', () => {
    assert.equal(egr.sumarMeses('2027-01-31', 1), '2027-02-28');
    assert.equal(egr.sumarMeses('2027-03-10', 2), '2027-05-10');
    assert.equal(egr.sumarMeses('2027-11-15', 3), '2028-02-15');
  });

  it('calcula recargo solo en cuotas vencidas e impagas', () => {
    const promo = { recargoTipo: 'porcentaje', recargoValor: 10 };
    const cuota = { importe: 30000, vencimiento: '2027-03-10', estado: 'pendiente' };
    assert.equal(egr.recargoDe(promo, cuota, '2027-03-10'), 0);
    assert.equal(egr.recargoDe(promo, cuota, '2027-03-11'), 3000);
    assert.equal(egr.recargoDe({ recargoTipo: 'monto', recargoValor: 1500 }, cuota, '2027-04-01'), 1500);
    assert.equal(egr.recargoDe(promo, { ...cuota, estado: 'pagada', recargo: 0 }, '2027-04-01'), 0);
  });

  it('arma el código de alumno y de cuota', () => {
    const promo = { anio: 2027, id: 14 };
    assert.equal(egr.codigoCuota(promo, { numero: 7 }, 2), 'EGR-27-014-07-2');
    assert.ok(egr.REGEX_CODIGO.test('egr-27-014-07-2'));
  });
});

describe('Egresados: API', () => {
  let headers;
  let promo;
  let buzo;
  let remera;
  const familia = {};

  const hoy = egr.hoyAR();
  const enDias = (n) => egr.sumarDias(hoy, n);

  before(async () => {
    headers = await prepararEscenario();
  });
  after(cerrar);

  it('el panel crea una promo con prendas y alumnos', async () => {
    let res = await request(app).post('/api/admin/egresados/promos').set(headers.admin).send({
      colegio: 'Instituto San Martín', curso: '6º A', anio: 2027,
      planes: [1, 3], descuentoContado: 10, recargoTipo: 'porcentaje', recargoValor: 10,
      primerVencimiento: enDias(30), fechaCierre: enDias(60),
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    promo = res.body;
    assert.match(promo.link, /\/mi-promo\/[A-Za-z0-9_-]{12}$/);

    res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/prendas`).set(headers.admin)
      .send({ nombre: 'Buzo canguro', precio: 60000, talles: ['S', 'M', 'L'], conBordado: true });
    assert.equal(res.status, 201);
    buzo = res.body;
    res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/prendas`).set(headers.admin)
      .send({ nombre: 'Remera', precio: 15000, talles: ['S', 'M'] });
    remera = res.body;

    res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/alumnos`).set(headers.admin)
      .send({ nombres: ['Sofía Ramírez', 'Tomás Benítez', 'sofía ramírez'] });
    assert.deepEqual(res.body, { creados: 2, omitidos: 1 });
  });

  it('solo un administrador puede usar el panel', async () => {
    const res = await request(app).get('/api/admin/egresados/promos').set(headers.operador);
    assert.equal(res.status, 403);
  });

  it('la familia ve la lista, ingresa con DNI y el DNI queda registrado', async () => {
    let res = await request(app).get(`/api/egresados/promos/${promo.slug}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.alumnos.length, 2);
    const sofia = res.body.alumnos.find((a) => a.nombre === 'Sofía Ramírez');
    assert.equal(sofia.registrado, false);
    assert.equal(res.body.alumnos[0].dni, undefined, 'no expone DNI');

    res = await request(app).post(`/api/egresados/promos/${promo.slug}/ingresar`).send({ alumnoId: sofia.id, dni: '45.123.456' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    familia.sofia = { Authorization: `Bearer ${res.body.token}` };

    res = await request(app).post(`/api/egresados/promos/${promo.slug}/ingresar`).send({ alumnoId: sofia.id, dni: '99999999' });
    assert.equal(res.status, 401);
    res = await request(app).post(`/api/egresados/promos/${promo.slug}/ingresar`).send({ alumnoId: sofia.id, dni: '45123456' });
    assert.equal(res.status, 200);

    // Otro alumno no puede reclamar el mismo DNI
    const tomas = (await request(app).get(`/api/egresados/promos/${promo.slug}`)).body.alumnos.find((a) => a.nombre === 'Tomás Benítez');
    res = await request(app).post(`/api/egresados/promos/${promo.slug}/ingresar`).send({ alumnoId: tomas.id, dni: '45123456' });
    assert.equal(res.status, 409);
    assert.equal((await request(app).get('/api/egresados/promos/no-existe-123')).status, 404);
  });

  it('una familia que no está en la lista se suma sola', async () => {
    const res = await request(app).post(`/api/egresados/promos/${promo.slug}/alumnos`).send({ nombre: 'Lucas Pérez', dni: '44111222' });
    assert.equal(res.status, 201);
    familia.lucas = { Authorization: `Bearer ${res.body.token}` };
    const dup = await request(app).post(`/api/egresados/promos/${promo.slug}/alumnos`).send({ nombre: 'Otro', dni: '44111222' });
    assert.equal(dup.status, 409);
  });

  it('los tokens de familia y del panel no se mezclan', async () => {
    assert.equal((await request(app).get('/api/admin/egresados/promos').set(familia.sofia)).status, 401);
    assert.equal((await request(app).get('/api/egresados/mi-promo').set(headers.admin)).status, 401);
    assert.equal((await request(app).get('/api/egresados/mi-promo')).status, 401);
  });

  it('no deja elegir plan sin datos ni prendas', async () => {
    const res = await request(app).put('/api/egresados/mi-promo/plan').set(familia.sofia).send({ plan: 3 });
    assert.equal(res.status, 409);
  });

  it('la familia completa datos, prendas y plan, y se arma la cuponera', async () => {
    let res = await request(app).put('/api/egresados/mi-promo/datos').set(familia.sofia).send({
      nombre: 'Sofía Ramírez', dni: '45123456', responsableNombre: 'Laura Gómez',
      responsableEmail: 'Laura@Mail.com', responsableTelefono: '11 5555-1234',
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.alumno.responsableEmail, 'laura@mail.com');

    res = await request(app).put('/api/egresados/mi-promo/prendas').set(familia.sofia).send({ items: [
      { prendaId: buzo.id, talle: 'XL', bordado: 'SOFI' },
    ] });
    assert.equal(res.status, 400, 'talle inexistente');

    res = await request(app).put('/api/egresados/mi-promo/prendas').set(familia.sofia).send({ items: [
      { prendaId: buzo.id, talle: 'M', bordado: 'SOFI' },
      { prendaId: remera.id, talle: 'S', bordado: 'no aplica', cantidad: 2 },
    ] });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.alumno.selecciones[1].bordado, null, 'la remera no lleva bordado');
    assert.equal(res.body.alumno.totales.subtotal, 90000);

    res = await request(app).put('/api/egresados/mi-promo/plan').set(familia.sofia).send({ plan: 6 });
    assert.equal(res.status, 400, 'plan no habilitado');

    res = await request(app).put('/api/egresados/mi-promo/plan').set(familia.sofia).send({ plan: 3 });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { cuotas } = res.body.alumno;
    assert.equal(cuotas.length, 3);
    assert.deepEqual(cuotas.map((c) => c.importe), [30000, 30000, 30000]);
    assert.equal(cuotas[0].vencimiento, enDias(30));
    assert.equal(cuotas[1].vencimiento, egr.sumarMeses(enDias(30), 1));
    assert.match(cuotas[0].codigo, /^EGR-27-\d{3}-01-1$/);
    assert.equal(res.body.alumno.progreso.plan, true);
    assert.equal(res.body.promo.prendas.length, 2);

    // Contado: 10% de descuento, una sola cuota
    res = await request(app).put('/api/egresados/mi-promo/plan').set(familia.sofia).send({ plan: 1 });
    assert.equal(res.body.alumno.cuotas.length, 1);
    assert.equal(res.body.alumno.cuotas[0].importe, 81000);
    res = await request(app).put('/api/egresados/mi-promo/plan').set(familia.sofia).send({ plan: 3 });
    assert.equal(res.body.alumno.cuotas.length, 3);
  });

  it('el panel registra un pago y la familia ya no puede cambiar el pedido', async () => {
    let res = await request(app).get(`/api/admin/egresados/buscar?q=${encodeURIComponent('45.123.456')}`).set(headers.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    const cuota1 = res.body[0].cuotas[0];

    res = await request(app).get(`/api/admin/egresados/buscar?q=${cuota1.codigo.toLowerCase()}`).set(headers.admin);
    assert.equal(res.body[0].cuotaBuscada, 1);

    res = await request(app).post(`/api/admin/egresados/cuotas/${cuota1.id}/pago`).set(headers.admin).send({ medio: 'efectivo' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.cuotas[0].estado, 'pagada');
    assert.equal(res.body.progreso.sena, true);
    assert.equal(res.body.totales.saldo, 60000);

    res = await request(app).post(`/api/admin/egresados/cuotas/${cuota1.id}/pago`).set(headers.admin).send({ medio: 'efectivo' });
    assert.equal(res.status, 409);

    res = await request(app).put('/api/egresados/mi-promo/prendas').set(familia.sofia).send({ items: [{ prendaId: buzo.id, talle: 'L' }] });
    assert.equal(res.status, 409);
    res = await request(app).put('/api/egresados/mi-promo/plan').set(familia.sofia).send({ plan: 1 });
    assert.equal(res.status, 409);
  });

  it('un ajuste del panel reparte el saldo en las cuotas pendientes', async () => {
    const alumno = await db.EgrAlumno.findOne({ where: { dni: '45123456' } });
    const res = await request(app).put(`/api/admin/egresados/alumnos/${alumno.id}`).set(headers.admin).send({ ajuste: 3000, ajusteMotivo: 'Bordado extra' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.cuotas.map((c) => [c.numero, c.estado, c.importe]), [[1, 'pagada', 30000], [2, 'pendiente', 31500], [3, 'pendiente', 31500]]);
    assert.equal(res.body.totales.total, 93000);
  });

  it('las cuotas vencidas muestran el recargo y se cobra al registrar el pago', async () => {
    const alumno = await db.EgrAlumno.findOne({ where: { dni: '45123456' } });
    const cuota2 = await db.EgrCuota.findOne({ where: { alumnoId: alumno.id, numero: 2 } });
    await cuota2.update({ vencimiento: enDias(-3) });

    let res = await request(app).get('/api/egresados/mi-promo').set(familia.sofia);
    const c2 = res.body.alumno.cuotas.find((c) => c.numero === 2);
    assert.equal(c2.estado, 'vencida');
    assert.equal(c2.recargo, 3150);
    assert.equal(c2.aPagar, 34650);

    res = await request(app).post(`/api/admin/egresados/cuotas/${cuota2.id}/pago`).set(headers.admin).send({ medio: 'transferencia', cobrarRecargo: false });
    assert.equal(res.body.cuotas[1].recargo, 0);
    res = await request(app).delete(`/api/admin/egresados/cuotas/${cuota2.id}/pago`).set(headers.admin);
    assert.equal(res.body.cuotas[1].estado, 'vencida');
    res = await request(app).post(`/api/admin/egresados/cuotas/${cuota2.id}/pago`).set(headers.admin).send({ medio: 'transferencia' });
    assert.equal(res.body.cuotas[1].recargo, 3150);
    assert.equal(res.body.totales.pagado, 61500);
  });

  it('el detalle de la promo resume el avance y los pendientes de cada alumno', async () => {
    const res = await request(app).get(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.resumen.alumnos, 3);
    assert.equal(res.body.resumen.sena, 1);
    const tomas = res.body.alumnos.find((a) => a.nombre === 'Tomás Benítez');
    assert.deepEqual(tomas.pendientes, ['nunca entró al link']);
    const lucas = res.body.alumnos.find((a) => a.nombre === 'Lucas Pérez');
    assert.ok(lucas.pendientes.includes('faltan datos del adulto responsable'));
  });

  it('la cuenta de transferencias se configura en el panel y la ve la familia', async () => {
    let res = await request(app).put('/api/admin/egresados/cuenta').set(headers.admin).send({ alias: 'paletta.egresados', cbu: '0000003100000000000001', titular: 'Paletta', banco: 'Banco X' });
    assert.equal(res.status, 200);
    res = await request(app).put('/api/admin/egresados/cuenta').set(headers.admin).send({ cbu: '123' });
    assert.equal(res.status, 400);
    res = await request(app).get('/api/egresados/mi-promo').set(familia.lucas);
    assert.equal(res.body.cuenta.alias, 'paletta.egresados');
  });

  it('después del cierre la familia ya no puede cambiar el pedido', async () => {
    await db.EgrPromo.update({ fechaCierre: enDias(-1) }, { where: { id: promo.id } });
    const res = await request(app).put('/api/egresados/mi-promo/prendas').set(familia.lucas).send({ items: [{ prendaId: remera.id, talle: 'M' }] });
    assert.equal(res.status, 409);
    const sumar = await request(app).post(`/api/egresados/promos/${promo.slug}/alumnos`).send({ nombre: 'Nueva Persona', dni: '40111222' });
    assert.equal(sumar.status, 409);
  });

  it('acepta pedidos desde el sitio de egresados y rechaza otros orígenes', async () => {
    const ENV = require('../src/config/env');
    const ok = await request(app).get(`/api/egresados/promos/${promo.slug}`).set('Origin', ENV.EGRESADOS_URL);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['access-control-allow-origin'], ENV.EGRESADOS_URL);
    const mal = await request(app).get(`/api/egresados/promos/${promo.slug}`).set('Origin', 'https://otro-sitio.com');
    assert.equal(mal.status, 403);
  });

  it('no se puede borrar una prenda elegida ni una promo con pagos', async () => {
    assert.equal((await request(app).delete(`/api/admin/egresados/prendas/${buzo.id}`).set(headers.admin)).status, 409);
    assert.equal((await request(app).delete(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin)).status, 409);
  });
});
