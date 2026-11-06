const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

process.env.EGR_INGRESOS_POR_15MIN = '1000';
process.env.EGR_COMPROBANTES_POR_HORA = '1000';

const { app, request, db, prepararEscenario, cerrar, PNG } = require('./helpers');
const egr = require('../src/services/egresados');
const avisos = require('../src/services/mailsEgresados');
const { ejecutarRecordatorios } = require('../src/services/recordatoriosEgresados');

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');

describe('Egresados: comprobantes, planillas y avisos', () => {
  let headers;
  let promo;
  let buzo;
  let remera;
  const fam = {};
  const hoy = egr.hoyAR();
  const enDias = (n) => egr.sumarDias(hoy, n);

  async function familia(nombre, dni, email) {
    const lista = (await request(app).get(`/api/egresados/promos/${promo.slug}`)).body.alumnos;
    const a = lista.find((x) => x.nombre === nombre);
    const r = await request(app).post(`/api/egresados/promos/${promo.slug}/ingresar`).send({ alumnoId: a.id, dni });
    const h = { Authorization: `Bearer ${r.body.token}` };
    await request(app).put('/api/egresados/mi-promo/datos').set(h).send({
      nombre, dni, responsableNombre: 'Laura Gómez', responsableEmail: email, responsableTelefono: '11 5555-1234',
    });
    return { h, id: a.id };
  }
  const cuotas = async (h) => (await request(app).get('/api/egresados/mi-promo').set(h)).body.alumno.cuotas;
  const subir = (h, cuotaId, buffer, nombre, tipo) => request(app)
    .post(`/api/egresados/mi-promo/cuotas/${cuotaId}/comprobante`).set(h)
    .attach('archivo', buffer, { filename: nombre, contentType: tipo });

  before(async () => {
    headers = await prepararEscenario();
    promo = (await request(app).post('/api/admin/egresados/promos').set(headers.admin).send({
      colegio: 'Colegio Sur', curso: '6º C', anio: 2027, planes: [1, 3], recargoTipo: 'porcentaje', recargoValor: 10,
      primerVencimiento: enDias(10), fechaCierre: enDias(30),
    })).body;
    buzo = (await request(app).post(`/api/admin/egresados/promos/${promo.id}/prendas`).set(headers.admin)
      .send({ nombre: 'Buzo', precio: 60000, talles: ['S', 'M', 'L'], conBordado: true })).body;
    remera = (await request(app).post(`/api/admin/egresados/promos/${promo.id}/prendas`).set(headers.admin)
      .send({ nombre: 'Remera', precio: 15000, talles: ['S', 'M', 'L'] })).body;
    await request(app).post(`/api/admin/egresados/promos/${promo.id}/alumnos`).set(headers.admin).send({ nombres: ['Sofía Ramírez', 'Tomás Benítez', 'Ana Paz'] });

    fam.sofia = await familia('Sofía Ramírez', '45123456', 'laura@mail.com');
    await request(app).put('/api/egresados/mi-promo/prendas').set(fam.sofia.h).send({ items: [
      { prendaId: buzo.id, talle: 'M', bordado: 'SOFI' }, { prendaId: remera.id, talle: 'S', cantidad: 2 },
    ] });
    await request(app).put('/api/egresados/mi-promo/plan').set(fam.sofia.h).send({ plan: 3 });
    fam.tomas = await familia('Tomás Benítez', '46111222', 'tomas@mail.com');
    await request(app).put('/api/egresados/mi-promo/prendas').set(fam.tomas.h).send({ items: [{ prendaId: buzo.id, talle: 'L', bordado: 'TOTO' }] });
    await request(app).put('/api/egresados/mi-promo/plan').set(fam.tomas.h).send({ plan: 1 });
  });
  after(cerrar);

  it('solo acepta PDF o imágenes reales', async () => {
    const [c1] = await cuotas(fam.sofia.h);
    let res = await subir(fam.sofia.h, c1.id, Buffer.from('hola'), 'nota.txt', 'text/plain');
    assert.equal(res.status, 400);
    res = await subir(fam.sofia.h, c1.id, Buffer.from('no soy un pdf'), 'trucho.pdf', 'application/pdf');
    assert.equal(res.status, 400);
    assert.match(res.body.error, /no parece/);
    res = await request(app).post(`/api/egresados/mi-promo/cuotas/${c1.id}/comprobante`).set(fam.sofia.h);
    assert.equal(res.status, 400);
    const archivos = fs.readdirSync(path.join(process.env.PRIVADO_DIR, 'comprobantes'));
    assert.equal(archivos.length, 0, 'no deja archivos rechazados en disco');
  });

  it('la familia sube el comprobante y la cuota queda en revisión', async () => {
    const [c1] = await cuotas(fam.sofia.h);
    let res = await subir(fam.sofia.h, c1.id, PDF, 'transferencia.pdf', 'application/pdf');
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const cuota = res.body.alumno.cuotas[0];
    assert.equal(cuota.estado, 'informada');
    assert.equal(cuota.comprobante.estado, 'pendiente');
    assert.equal(res.body.alumno.bloqueos.puedeEditarPedido, false, 'con un comprobante en revisión el pedido queda confirmado');

    res = await subir(fam.sofia.h, c1.id, PDF, 'otro.pdf', 'application/pdf');
    assert.equal(res.status, 409);
    // Otra familia no puede subir a una cuota ajena ni verla
    res = await subir(fam.tomas.h, c1.id, PDF, 'x.pdf', 'application/pdf');
    assert.equal(res.status, 404);
    res = await request(app).get(`/api/egresados/mi-promo/comprobantes/${cuota.comprobante.id}/archivo`).set(fam.tomas.h);
    assert.equal(res.status, 404);
    res = await request(app).get(`/api/egresados/mi-promo/comprobantes/${cuota.comprobante.id}/archivo`).set(fam.sofia.h);
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.match(res.headers['cache-control'], /no-store/);
    assert.equal((await request(app).get(`/api/egresados/mi-promo/comprobantes/${cuota.comprobante.id}/archivo`)).status, 401);
  });

  it('el panel lista, ve y rechaza el comprobante con motivo', async () => {
    let res = await request(app).get('/api/admin/egresados/comprobantes').set(headers.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    const comp = res.body[0];
    assert.equal(comp.alumno.nombre, 'Sofía Ramírez');
    assert.equal(comp.cuota.numero, 1);
    assert.equal((await request(app).get(`/api/admin/egresados/comprobantes/${comp.id}/archivo`).set(headers.admin)).status, 200);
    assert.equal((await request(app).get('/api/admin/egresados/comprobantes').set(headers.operador)).status, 403);

    res = await request(app).post(`/api/admin/egresados/comprobantes/${comp.id}/rechazar`).set(headers.admin).send({ motivo: 'no' });
    assert.equal(res.status, 400, 'el motivo tiene que explicar algo');
    res = await request(app).post(`/api/admin/egresados/comprobantes/${comp.id}/rechazar`).set(headers.admin).send({ motivo: 'El monto no coincide con la cuota' });
    assert.equal(res.status, 200);
    assert.equal(res.body.cuotas[0].estado, 'pendiente');

    const vista = await request(app).get('/api/egresados/mi-promo').set(fam.sofia.h);
    assert.deepEqual(
      [vista.body.alumno.cuotas[0].comprobante.estado, vista.body.alumno.cuotas[0].comprobante.motivoRechazo],
      ['rechazado', 'El monto no coincide con la cuota'],
    );
    assert.equal((await request(app).post(`/api/admin/egresados/comprobantes/${comp.id}/aprobar`).set(headers.admin).send({})).status, 409);
  });

  it('al aprobar, la fecha de pago es la del comprobante y el recargo se calcula a ese día', async () => {
    // La cuota 1 venció hace 5 días: el comprobante de hoy paga recargo
    await db.EgrCuota.update({ vencimiento: enDias(-5) }, { where: { alumnoId: fam.sofia.id, numero: 1 } });
    const [c1] = await cuotas(fam.sofia.h);
    assert.equal(c1.estado, 'vencida');
    const res1 = await subir(fam.sofia.h, c1.id, PNG, 'captura.png', 'image/png');
    assert.equal(res1.status, 201);
    const informada = res1.body.alumno.cuotas[0];
    assert.equal(informada.recargo, 0, 'mientras está en revisión no suma recargo');

    const lista = (await request(app).get('/api/admin/egresados/comprobantes').set(headers.admin)).body;
    assert.equal(lista[0].cuota.recargoAlSubir, 3000);
    const res = await request(app).post(`/api/admin/egresados/comprobantes/${lista[0].id}/aprobar`).set(headers.admin).send({});
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const c = res.body.cuotas[0];
    assert.deepEqual([c.estado, c.medio, c.pagadaEl, c.recargo], ['pagada', 'transferencia', hoy, 3000]);
    assert.equal(res.body.progreso.sena, true);
    assert.equal((await request(app).get('/api/admin/egresados/comprobantes').set(headers.admin)).body.length, 0);
    const aprobados = (await request(app).get('/api/admin/egresados/comprobantes?estado=aprobado').set(headers.admin)).body;
    assert.equal(aprobados.length, 1);
  });

  it('si se registra el pago a mano, el comprobante en revisión queda aprobado', async () => {
    const [c] = await cuotas(fam.tomas.h);
    await subir(fam.tomas.h, c.id, PDF, 'pago.pdf', 'application/pdf');
    const res = await request(app).post(`/api/admin/egresados/cuotas/${c.id}/pago`).set(headers.admin).send({ medio: 'transferencia' });
    assert.equal(res.status, 200);
    assert.equal(res.body.cuotas[0].estado, 'pagada');
    assert.equal(res.body.cuotas[0].comprobante.estado, 'aprobado');
  });

  it('las planillas de producción y cobranza salen en CSV', async () => {
    let res = await request(app).get(`/api/admin/egresados/promos/${promo.id}/exportar/prendas`).set(headers.admin);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.headers['content-disposition'], /egresados-2027-colegio-sur-6o-c-prendas\.csv/);
    const lineas = res.text.replace(/^\uFEFF/, '').trim().split('\r\n');
    assert.equal(lineas[0], 'Alumno;Código;Prenda;Talle;Bordado;Cantidad;Cuota 1 paga');
    assert.equal(lineas.length, 4);
    assert.ok(lineas.includes('Sofía Ramírez;EGR-27-001-01;Remera;S;;2;Sí'));

    res = await request(app).get(`/api/admin/egresados/promos/${promo.id}/exportar/talles`).set(headers.admin);
    assert.deepEqual(res.text.replace(/^\uFEFF/, '').trim().split('\r\n'), ['Prenda;Talle;Cantidad', 'Buzo;M;1', 'Buzo;L;1', 'Remera;S;2']);

    res = await request(app).get(`/api/admin/egresados/promos/${promo.id}/exportar/cobranza`).set(headers.admin);
    assert.match(res.text, /Sofía Ramírez;EGR-27-001-01;45123456;Laura Gómez;11 5555-1234;laura@mail.com;3 cuotas;90000;30000;60000;1;0;0;/);
    assert.match(res.text, /Ana Paz;.*nunca entró al link/);

    assert.equal((await request(app).get(`/api/admin/egresados/promos/${promo.id}/exportar/otra`).set(headers.admin)).status, 404);
    assert.equal((await request(app).get(`/api/admin/egresados/promos/${promo.id}/exportar/prendas`).set(headers.operador)).status, 403);
  });

  it('avisos por mail: etapa de la promo (una vez por familia), pago confirmado y rechazo', async () => {
    const enviados = [];
    const enviar = async (m) => { enviados.push(m); };
    assert.equal(await avisos.avisarEtapa(promo.id, 'en_produccion', { enviar }), 2);
    assert.equal(await avisos.avisarEtapa(promo.id, 'en_produccion', { enviar }), 0, 'no repite');
    assert.equal(await avisos.avisarEtapa(promo.id, 'pendiente', { enviar }), 0, 'sin aviso para esa etapa');
    assert.ok(enviados.every((m) => /Arrancó la producción/.test(m.subject)));
    assert.deepEqual(enviados.map((m) => m.to).sort(), ['laura@mail.com', 'tomas@mail.com']);

    const c1 = await db.EgrCuota.findOne({ where: { alumnoId: fam.sofia.id, numero: 1 } });
    assert.equal(await avisos.avisarPagoConfirmado(c1.id, { enviar }), true);
    assert.match(enviados.at(-1).text, /Registramos el pago de \$\s?33\.000 de la cuota 1/);
    assert.equal(await avisos.avisarPagoConfirmado(c1.id, { enviar }), false, 'no repite');

    const rechazado = await db.EgrComprobante.findOne({ where: { estado: 'rechazado' } });
    assert.equal(await avisos.avisarComprobanteRechazado(rechazado, { enviar }), true);
    assert.match(enviados.at(-1).text, /Motivo: El monto no coincide con la cuota/);
  });

  it('el cambio de etapa desde el panel funciona sin correo configurado', async () => {
    const res = await request(app).put(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin).send({ estadoProduccion: 'listo', fechaEntrega: enDias(20) });
    assert.equal(res.status, 200);
    assert.equal(res.body.estadoProduccion, 'listo');
  });

  it('los recordatorios no reclaman cuotas con comprobante en revisión', async () => {
    const [, c2] = await cuotas(fam.sofia.h);
    await db.EgrCuota.update({ vencimiento: enDias(-2) }, { where: { id: c2.id } });
    await subir(fam.sofia.h, c2.id, PDF, 'c2.pdf', 'application/pdf');
    await db.EgrPromo.update({ estadoProduccion: 'pendiente' }, { where: { id: promo.id } });
    const enviados = [];
    await ejecutarRecordatorios({ enviar: async (m) => enviados.push(m), forzar: true });
    assert.ok(!enviados.some((m) => /cuota 2/.test(m.subject)), JSON.stringify(enviados.map((m) => m.subject)));
  });
});
