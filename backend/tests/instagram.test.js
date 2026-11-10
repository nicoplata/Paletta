const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const sharp = require('sharp');

// Instagram falso: responde como la API (perfil, publicaciones, renovación del token e imágenes)
const PUERTO = 47811;
process.env.IG_API_URL = `http://127.0.0.1:${PUERTO}`;
const { app, request, db, prepararEscenario, cerrar } = require('./helpers');

const TOKEN = `IGAA${'x'.repeat(60)}`;
let publicaciones = [];
let renovaciones = 0;
let imagen;
const stub = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PUERTO}`);
  const json = (codigo, cuerpo) => { res.writeHead(codigo, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(cuerpo)); };
  if (url.pathname.startsWith('/img/')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(imagen); }
  const token = url.searchParams.get('access_token');
  if (!token.startsWith('IGAA')) return json(400, { error: { message: 'Invalid OAuth access token', code: 190 } });
  if (url.pathname === '/me') return json(200, { user_id: '1789', username: 'paletta.egresados' });
  if (url.pathname === '/me/media') return json(200, { data: publicaciones });
  if (url.pathname === '/refresh_access_token') { renovaciones += 1; return json(200, { access_token: `IGAA${'y'.repeat(60)}`, expires_in: 5184000 }); }
  return json(404, { error: { message: 'no existe' } });
});

const post = (id, tipo = 'IMAGE', extra = {}) => ({
  id, media_type: tipo, permalink: `https://www.instagram.com/p/${id}/`, caption: `Promo ${id} #egresados`, timestamp: '2026-11-01T12:00:00+0000',
  [tipo === 'VIDEO' ? 'thumbnail_url' : 'media_url']: `http://127.0.0.1:${PUERTO}/img/${id}.jpg`, ...extra,
});

describe('Instagram', () => {
  let headers;

  before(async () => {
    imagen = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#1f3a8a' } }).jpeg().toBuffer();
    await new Promise((ok) => stub.listen(PUERTO, '127.0.0.1', ok));
    headers = await prepararEscenario();
  });
  after(async () => {
    stub.close();
    await cerrar();
  });

  it('sin token el sitio recibe un feed vacío', async () => {
    const res = await request(app).get('/api/egresados/instagram');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items, []);
    assert.equal((await request(app).get('/api/admin/egresados/instagram').set(headers.admin)).body.conectado, false);
  });

  it('rechaza un token inválido', async () => {
    let res = await request(app).put('/api/admin/egresados/instagram').set(headers.admin).send({ token: 'corto' });
    assert.equal(res.status, 400);
    res = await request(app).put('/api/admin/egresados/instagram').set(headers.admin).send({ token: `EAAB${'z'.repeat(60)}` });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /token/);
  });

  it('conecta, trae las publicaciones y guarda las imágenes en el servidor', async () => {
    publicaciones = [post('101'), post('102', 'VIDEO'), post('103', 'CAROUSEL_ALBUM'), post('104', 'IMAGE', { media_url: undefined })];
    const res = await request(app).put('/api/admin/egresados/instagram').set(headers.admin).send({ token: TOKEN });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.conectado, true);
    assert.equal(res.body.usuario, 'paletta.egresados');
    assert.equal(res.body.publicaciones, 3, 'la que no tiene imagen se saltea');

    const feed = (await request(app).get('/api/egresados/instagram')).body;
    assert.equal(feed.items.length, 3);
    assert.equal(feed.items[1].tipo, 'VIDEO');
    assert.equal(feed.items[0].link, 'https://www.instagram.com/p/101/');
    assert.match(feed.items[0].imagen, /^\/api\/egresados\/instagram\/img\/101\.webp$/);
    assert.equal(JSON.stringify(feed).includes('IGAA'), false, 'el token nunca llega al sitio');
    const img = await request(app).get(feed.items[0].imagen);
    assert.equal(img.status, 200);
    const meta = await sharp(img.body).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ['webp', 640, 640]);
  });

  it('al sincronizar borra las imágenes de publicaciones viejas', async () => {
    publicaciones = [post('105'), post('101')];
    await request(app).post('/api/admin/egresados/instagram/sincronizar').set(headers.admin);
    const feed = (await request(app).get('/api/egresados/instagram')).body;
    assert.deepEqual(feed.items.map((i) => i.id), ['105', '101']);
    assert.equal((await request(app).get('/api/egresados/instagram/img/102.webp')).status, 404);
  });

  it('renueva el token cuando está por vencer', async () => {
    const fila = await db.Configuracion.findByPk('instagram');
    await fila.update({ valor: { ...fila.valor, expira: Date.now() + 5 * 24 * 3600 * 1000 } });
    await request(app).post('/api/admin/egresados/instagram/sincronizar').set(headers.admin);
    assert.equal(renovaciones, 1);
    const estado = (await request(app).get('/api/admin/egresados/instagram').set(headers.admin)).body;
    assert.ok(new Date(estado.expira) > new Date(Date.now() + 50 * 24 * 3600 * 1000));
    assert.equal((await db.Configuracion.findByPk('instagram')).valor.token.startsWith('IGAAyyy'), true);
  });

  it('si Instagram falla, el sitio sigue mostrando lo último y el panel ve el error', async () => {
    const fila = await db.Configuracion.findByPk('instagram');
    await fila.update({ valor: { ...fila.valor, token: 'IGAA-vencido-pero-con-formato' } });
    const original = stub.listeners('request')[0];
    stub.removeAllListeners('request');
    stub.on('request', (req, res) => { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":{"message":"caído"}}'); });
    const estado = (await request(app).post('/api/admin/egresados/instagram/sincronizar').set(headers.admin)).body;
    assert.match(estado.error, /error/);
    assert.equal((await request(app).get('/api/egresados/instagram')).body.items.length, 2);
    stub.removeAllListeners('request');
    stub.on('request', original);
  });

  it('desconectar borra el token y las imágenes', async () => {
    const res = await request(app).delete('/api/admin/egresados/instagram').set(headers.admin);
    assert.equal(res.status, 204);
    assert.deepEqual((await request(app).get('/api/egresados/instagram')).body.items, []);
    assert.equal((await request(app).get('/api/egresados/instagram/img/105.webp')).status, 404);
  });
});
