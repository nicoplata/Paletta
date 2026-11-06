const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.EGR_DISENOS_POR_HORA = '1000';
process.env.EGR_PRESUPUESTOS_POR_HORA = '1000';
process.env.EGR_CODIGOS_POR_15MIN = '1000';

const { app, request, db, prepararEscenario, cerrar, PNG } = require('./helpers');
const egr = require('../src/services/egresados');

const CONFIG = {
  type: 'canguro',
  estilo: 'liso',
  pal: { P: 'azul', S: 'hueso', A: 'amarillo' },
  colors: { body: 'azul', sleeves: 'azul', hood: 'azul', cuffs: 'hueso', cords: 'hueso' },
  elements: [
    { id: 1, kind: 'text', side: 'back', value: 'PROMO 27', x: 200, y: 150 },
    { id: 2, kind: 'img', side: 'front', src: 'data:image/png;base64,AAAA', x: 1, y: 1 },
  ],
};

const guardar = (config = CONFIG, imagen = PNG, titulo = 'Buzo canguro · Liso') => request(app).post('/api/egresados/disenos')
  .field('config', typeof config === 'string' ? config : JSON.stringify(config))
  .field('titulo', titulo)
  .attach('imagen', imagen, { filename: 'diseno.png', contentType: 'image/png' });

describe('Egresados: diseños guardados y pedidos de presupuesto', () => {
  let headers;
  let promo;
  let diseno;

  before(async () => {
    headers = await prepararEscenario();
    promo = (await request(app).post('/api/admin/egresados/promos').set(headers.admin)
      .send({ colegio: 'Colegio Oeste', curso: '6º B', anio: 2027, primerVencimiento: egr.sumarDias(egr.hoyAR(), 20) })).body;
  });
  after(cerrar);

  it('guarda el diseño con su imagen y devuelve un link para compartir', async () => {
    const res = await guardar();
    assert.equal(res.status, 201, JSON.stringify(res.body));
    diseno = res.body;
    assert.match(diseno.codigo, /^[a-z0-9]{8}$/);
    assert.match(diseno.link, new RegExp(`/d/${diseno.codigo}$`));
    assert.match(diseno.imagen, new RegExp(`/api/egresados/d/${diseno.codigo}/imagen.png$`));

    const cfg = await request(app).get(`/api/egresados/disenos/${diseno.codigo}`);
    assert.equal(cfg.status, 200);
    assert.equal(cfg.body.config.type, 'canguro');
    assert.equal(cfg.body.config.elements.length, 1, 'las imágenes subidas no se guardan en la configuración');
  });

  it('rechaza diseños inválidos', async () => {
    assert.equal((await guardar({ ...CONFIG, type: 'pantalon' })).status, 400);
    assert.equal((await guardar('{no es json')).status, 400);
    assert.equal((await guardar(CONFIG, Buffer.from('no soy un png'))).status, 400);
    assert.equal((await request(app).post('/api/egresados/disenos').field('config', JSON.stringify(CONFIG))).status, 400);
  });

  it('el link compartido muestra la vista previa y lleva al diseñador', async () => {
    let res = await request(app).get(`/api/egresados/d/${diseno.codigo}`);
    assert.equal(res.status, 200);
    assert.match(res.text, new RegExp(`og:image" content="[^"]+/d/${diseno.codigo}/imagen.png"`));
    assert.match(res.text, new RegExp(`disena.html#dz=${diseno.codigo}`));
    assert.match(res.text, /Buzo canguro · Liso \| Paletta Egresados/);
    res = await request(app).get(`/api/egresados/d/${diseno.codigo}/imagen.png`);
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'image/png');
    assert.equal((await request(app).get('/api/egresados/d/noexiste/imagen.png')).status, 404);
    assert.equal((await request(app).get('/api/egresados/d/..%2F..%2Fx')).status, 400);
  });

  it('pide presupuesto con el diseño adjunto', async () => {
    let res = await request(app).post('/api/egresados/presupuestos').send({
      nombre: 'Laura Gómez', telefono: '11 5555-1234', email: 'laura@mail.com', colegio: 'Colegio Norte', curso: '5º A',
      cantidad: 32, anio: 2027, mensaje: 'Queremos el buzo con capucha bordó', disenoCodigo: diseno.codigo,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.promo, null);

    res = await request(app).post('/api/egresados/presupuestos').send({ nombre: 'Bot Spam', telefono: '11 5555-0000', colegio: 'Colegio X', disenoCodigo: diseno.codigo, sitio: 'spam' });
    assert.equal(res.status, 201);
    res = await request(app).post('/api/egresados/presupuestos').send({ nombre: 'Sin diseño', telefono: '11 5555-0000', colegio: 'Colegio' });
    assert.equal(res.status, 400);

    const lista = await request(app).get('/api/admin/egresados/presupuestos').set(headers.admin);
    assert.equal(lista.status, 200);
    assert.equal(lista.body.length, 1, 'el bot no se guarda');
    assert.equal(lista.body[0].diseno.codigo, diseno.codigo);
    assert.equal(lista.body[0].estado, 'nuevo');
    assert.equal((await request(app).get('/api/admin/egresados/presupuestos').set(headers.operador)).status, 403);
  });

  it('con el código de la promo, el diseño queda adjunto a la promo y lo ve la comisión', async () => {
    const otro = (await guardar(CONFIG, PNG, 'Campera · Bicolor')).body;
    let res = await request(app).post('/api/egresados/presupuestos').send({
      nombre: 'Comisión 6B', telefono: '11 4444-1111', colegio: 'Colegio Oeste', disenoCodigo: otro.codigo, promoCodigo: 'NOEXISTE1',
    });
    assert.equal(res.status, 404);
    res = await request(app).post('/api/egresados/presupuestos').send({
      nombre: 'Comisión 6B', telefono: '11 4444-1111', colegio: 'Colegio Oeste', disenoCodigo: otro.codigo, promoCodigo: promo.codigo.toLowerCase(),
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.promo.codigo, promo.codigo);

    const curso = await request(app).get(`/api/egresados/codigo/${promo.codigo}/curso`);
    assert.deepEqual(curso.body.disenos.map((x) => x.codigo), [otro.codigo]);
    const detalle = await request(app).get(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin);
    assert.equal(detalle.body.disenos[0].titulo, 'Campera · Bicolor');
  });

  it('el panel crea la promo desde un pedido y el diseño queda adjunto', async () => {
    const pedido = (await request(app).get('/api/admin/egresados/presupuestos?estado=nuevo').set(headers.admin)).body
      .find((p) => p.colegio === 'Colegio Norte');
    const res = await request(app).post('/api/admin/egresados/promos').set(headers.admin).send({
      colegio: pedido.colegio, curso: pedido.curso, anio: pedido.anio, primerVencimiento: egr.sumarDias(egr.hoyAR(), 30), presupuestoId: pedido.id,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const actualizado = await db.EgrPresupuesto.findByPk(pedido.id);
    assert.deepEqual([actualizado.estado, actualizado.promoId], ['convertido', res.body.id]);
    const d = await db.EgrDiseno.findOne({ where: { codigo: diseno.codigo } });
    assert.equal(d.promoId, res.body.id);
  });

  it('el panel adjunta un diseño a una promo con su link, lo quita y cambia el estado de un pedido', async () => {
    const suelto = (await guardar()).body;
    let res = await request(app).post(`/api/admin/egresados/promos/${promo.id}/disenos`).set(headers.admin).send({ codigo: suelto.link });
    assert.equal(res.status, 201);
    assert.equal((await request(app).get(`/api/admin/egresados/promos/${promo.id}`).set(headers.admin)).body.disenos.length, 2);
    res = await request(app).delete(`/api/admin/egresados/promos/${promo.id}/disenos/${suelto.codigo}`).set(headers.admin);
    assert.equal(res.status, 200);
    assert.equal((await request(app).post(`/api/admin/egresados/promos/${promo.id}/disenos`).set(headers.admin).send({ codigo: 'zzzzzzzz' })).status, 404);

    const pedido = (await request(app).get('/api/admin/egresados/presupuestos').set(headers.admin)).body[0];
    res = await request(app).patch(`/api/admin/egresados/presupuestos/${pedido.id}`).set(headers.admin).send({ estado: 'contactado', notas: 'Le escribí el martes' });
    assert.equal(res.status, 200);
    assert.equal(res.body.estado, 'contactado');
  });
});
