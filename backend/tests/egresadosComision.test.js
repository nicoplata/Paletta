const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.EGR_INGRESOS_POR_15MIN = '1000';

const { app, request, db, prepararEscenario, cerrar } = require('./helpers');
const egr = require('../src/services/egresados');
const { ejecutarRecordatorios } = require('../src/services/recordatoriosEgresados');

describe('Egresados: tablero de la comisión y recordatorios', () => {
  let headers;
  let promo;
  let buzo;
  const familias = {};
  const hoy = egr.hoyAR();
  const enDias = (n) => egr.sumarDias(hoy, n);

  const tablero = (token = promo.linkComision.split('/').pop()) => request(app).get(`/api/egresados/comision/${token}`);

  async function familiaCompleta(nombre, dni, email) {
    const lista = (await request(app).get(`/api/egresados/promos/${promo.slug}`)).body.alumnos;
    const alumno = lista.find((a) => a.nombre === nombre);
    const ingreso = await request(app).post(`/api/egresados/promos/${promo.slug}/ingresar`).send({ alumnoId: alumno.id, dni });
    const h = { Authorization: `Bearer ${ingreso.body.token}` };
    await request(app).put('/api/egresados/mi-promo/datos').set(h).send({
      nombre, dni, responsableNombre: 'Adulto Responsable', responsableEmail: email, responsableTelefono: '11 5555-0000',
    });
    return { h, id: alumno.id };
  }

  before(async () => {
    headers = await prepararEscenario();
    let res = await request(app).post('/api/admin/egresados/promos').set(headers.admin).send({
      colegio: 'Colegio Norte', curso: '5º B', anio: 2027, planes: [1, 3],
      recargoTipo: 'monto', recargoValor: 2000, primerVencimiento: enDias(2), fechaCierre: enDias(5),
    });
    promo = res.body;
    res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/prendas`).set(headers.admin)
      .send({ nombre: 'Buzo', precio: 30000, talles: ['M'], conBordado: true });
    buzo = res.body;
    await request(app).post(`/api/admin/egresados/promos/${promo.id}/alumnos`).set(headers.admin).send({ nombres: ['Ana Díaz', 'Bruno Gil', 'Carla Paz'] });
  });
  after(cerrar);

  it('la promo nueva trae el link de la comisión', () => {
    assert.match(promo.linkComision, /\/mi-promo\/comision\/[A-Za-z0-9_-]{22}$/);
  });

  it('el tablero muestra etapas, avance y pendientes con motivo', async () => {
    const res = await tablero();
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.etapas.map((e) => [e.clave, e.estado]), [
      ['creada', 'completa'], ['comision', 'actual'], ['datos', 'pendiente'], ['prendas', 'pendiente'],
      ['sena', 'pendiente'], ['diseno', 'bloqueada'], ['produccion', 'bloqueada'], ['entrega', 'bloqueada'],
    ]);
    assert.equal(res.body.pasos.datos.pendientes.length, 3);
    assert.equal(res.body.pasos.datos.pendientes[0].motivo, 'nunca entró al link');
    assert.equal(res.body.porcentaje, 7); // 1 hito de 5 + 0 de 9 pasos = 1/14
    assert.equal(res.body.linkFamilias, promo.link);
    assert.equal((await tablero('token-que-no-existe-123')).status, 404);
  });

  it('la comisión carga sus integrantes y avanza de etapa', async () => {
    const res = await request(app).put(`/api/egresados/comision/${promo.linkComision.split('/').pop()}/integrantes`)
      .send({ integrantes: [{ nombre: 'Mamá de Ana', telefono: '11 4444-1111' }, { nombre: 'Papá de Bruno' }] });
    assert.equal(res.status, 200);
    assert.equal(res.body.integrantes.length, 2);
    assert.equal(res.body.etapas[1].estado, 'completa');
    assert.equal(res.body.etapas[2].estado, 'actual');
    assert.ok(res.body.logros.find((l) => l.clave === 'comision').logrado);
    assert.match(res.body.mensaje, /Faltan 3 familias para completar los datos/);
  });

  it('el tablero no expone DNI, contactos ni montos de las familias', async () => {
    familias.ana = await familiaCompleta('Ana Díaz', '40111111', 'ana@mail.com');
    await request(app).put('/api/egresados/mi-promo/prendas').set(familias.ana.h).send({ items: [{ prendaId: buzo.id, talle: 'M', bordado: 'ANA' }] });
    await request(app).put('/api/egresados/mi-promo/plan').set(familias.ana.h).send({ plan: 3 });
    const texto = JSON.stringify((await tablero()).body);
    assert.ok(!texto.includes('40111111'), 'sin DNI');
    assert.ok(!texto.includes('ana@mail.com'), 'sin email');
    assert.ok(!texto.includes('5555-0000'), 'sin teléfono de la familia');
    assert.ok(!texto.includes('10000') && !texto.includes('30000'), 'sin montos');
  });

  it('marca pendientes por paso y pagos al día o pendientes', async () => {
    const res = await tablero();
    const { pasos, pagos } = res.body;
    assert.equal(pasos.datos.hechos, 1);
    assert.deepEqual(pasos.sena.pendientes.find((p) => p.nombre === 'Ana Díaz').motivo, 'cuota 1 pendiente');
    assert.equal(pasos.prendas.pendientes.find((p) => p.nombre === 'Bruno Gil').motivo, 'nunca entró al link');
    assert.deepEqual(pagos, { conPlan: 1, alDia: 1, pendientes: [] });

    await db.EgrCuota.update({ vencimiento: enDias(-2) }, { where: { alumnoId: familias.ana.id, numero: 1 } });
    const r2 = await tablero();
    assert.deepEqual(r2.body.pagos.pendientes.map((p) => p.nombre), ['Ana Díaz']);
    await db.EgrCuota.update({ vencimiento: enDias(2) }, { where: { alumnoId: familias.ana.id, numero: 1 } });
  });

  it('no deja aprobar el diseño hasta que la promo esté completa', async () => {
    const token = promo.linkComision.split('/').pop();
    let res = await request(app).post(`/api/egresados/comision/${token}/diseno`).send({ nombre: 'Mamá de Ana' });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /falta: datos, prendas y talles, cuota 1/);

    // Se completa todo: Bruno y Carla cargan y pagan la cuota 1; se borra quien no corresponde
    for (const [nombre, dni] of [['Bruno Gil', '40222222'], ['Carla Paz', '40333333']]) {
      const f = await familiaCompleta(nombre, dni, `${dni}@mail.com`);
      await request(app).put('/api/egresados/mi-promo/prendas').set(f.h).send({ items: [{ prendaId: buzo.id, talle: 'M' }] });
      await request(app).put('/api/egresados/mi-promo/plan').set(f.h).send({ plan: 1 });
      familias[dni] = f;
    }
    for (const id of [familias.ana.id, familias['40222222'].id, familias['40333333'].id]) {
      const c = await db.EgrCuota.findOne({ where: { alumnoId: id, numero: 1 } });
      await request(app).post(`/api/admin/egresados/cuotas/${c.id}/pago`).set(headers.admin).send({ medio: 'efectivo' });
    }
    res = await tablero();
    assert.equal(res.body.puedeAprobarDiseno, true);
    assert.equal(res.body.etapas.find((e) => e.clave === 'diseno').estado, 'actual');
    assert.ok(res.body.logros.find((l) => l.clave === 'sena').logrado);

    res = await request(app).post(`/api/egresados/comision/${token}/diseno`).send({ nombre: 'Mamá de Ana' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.promo.disenoAprobadoPor, 'Mamá de Ana');
    assert.equal(res.body.etapas.find((e) => e.clave === 'produccion').estado, 'actual');
    assert.equal((await request(app).post(`/api/egresados/comision/${token}/diseno`).send({ nombre: 'Otro' })).status, 409);
  });

  it('el panel ve el tablero, cambia etapas y puede regenerar el link', async () => {
    let res = await request(app).put(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin).send({ estadoProduccion: 'en_produccion' });
    assert.equal(res.status, 200);
    res = await request(app).get(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin);
    assert.ok(res.body.tablero.porcentaje > 80);
    assert.equal(res.body.tablero.etapas.find((e) => e.clave === 'entrega').estado, 'actual');

    res = await request(app).put(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin).send({ disenoAprobado: false });
    assert.equal(res.body.disenoAprobadoEl, null);

    const viejo = promo.linkComision.split('/').pop();
    res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/comision/regenerar`).set(headers.admin);
    assert.notEqual(res.body.linkComision, promo.linkComision);
    assert.equal((await tablero(viejo)).status, 404);
    promo = { ...promo, linkComision: res.body.linkComision };
    assert.equal((await tablero()).status, 200);
  });

  it('los recordatorios por mail se mandan una sola vez', async () => {
    // Una familia sin terminar (para el aviso de cierre) y cuotas por vencer y vencidas
    await request(app).post(`/api/admin/egresados/promos/${promo.id}/alumnos`).set(headers.admin).send({ nombres: ['Dario Luna'] });
    const dario = await familiaCompleta('Dario Luna', '40444444', 'dario@mail.com');
    const anaCuota2 = await db.EgrCuota.findOne({ where: { alumnoId: familias.ana.id, numero: 2 } });
    await anaCuota2.update({ vencimiento: enDias(-3) });
    const anaCuota3 = await db.EgrCuota.findOne({ where: { alumnoId: familias.ana.id, numero: 3 } });
    await anaCuota3.update({ vencimiento: enDias(1) });

    const enviados = [];
    const enviar = async (m) => { enviados.push(m); };
    let r = await ejecutarRecordatorios({ enviar, forzar: true });
    assert.equal(r.enviados, 3, JSON.stringify(enviados.map((m) => [m.to, m.subject])));
    const porDestino = enviados.map((m) => [m.to, m.subject]);
    assert.ok(porDestino.some(([to, s]) => to === 'dario@mail.com' && /cierra en 5 días/.test(s)));
    assert.ok(porDestino.some(([to, s]) => to === 'ana@mail.com' && /cuota 2 .* vencida/.test(s)));
    assert.ok(porDestino.some(([to, s]) => to === 'ana@mail.com' && /cuota 3 vence/.test(s)));
    const vencida = enviados.find((m) => /vencida/.test(m.subject));
    assert.match(vencida.text, /incluye \$\s?2\.000 de recargo/);
    assert.match(vencida.html, new RegExp(promo.slug));

    r = await ejecutarRecordatorios({ enviar, forzar: true });
    assert.equal(r.enviados, 0, 'no repite');

    // Si el envío falla, se reintenta en la próxima corrida
    await db.EgrAviso.destroy({ where: { alumnoId: dario.id } });
    r = await ejecutarRecordatorios({ enviar: async () => { throw new Error('SMTP caído'); }, forzar: true });
    assert.equal(r.errores, 1);
    r = await ejecutarRecordatorios({ enviar, forzar: true });
    assert.equal(r.enviados, 1);
  });

  it('sin correo configurado el panel avisa y no envía nada', async () => {
    const res = await request(app).post('/api/admin/egresados/recordatorios').set(headers.admin);
    assert.equal(res.status, 409);
    assert.deepEqual(await ejecutarRecordatorios(), { enviados: 0, errores: 0, sinMail: true });
  });
});
