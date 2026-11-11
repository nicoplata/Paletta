const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');

const { app, request, db, prepararEscenario, cerrar } = require('./helpers');

// Foto de prueba: JPEG de 3000×2000 con datos EXIF (que no tienen que llegar a la versión publicada)
const foto = (ancho = 3000, alto = 2000) => sharp({ create: { width: ancho, height: alto, channels: 3, background: '#8f141b' } })
  .jpeg().withMetadata({ exif: { IFD0: { Copyright: 'secreto', Artist: 'gps' } } }).toBuffer();

describe('Egresados: galería de fotos', () => {
  let headers;
  let subidas;

  before(async () => {
    headers = await prepararEscenario();
  });
  after(cerrar);

  it('solo el panel sube fotos', async () => {
    const res = await request(app).post('/api/admin/egresados/fotos').attach('fotos', await foto(), { filename: 'a.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 401);
  });

  it('sube una tanda: optimiza a WebP en dos tamaños y avisa las que no sirven', async () => {
    const res = await request(app).post('/api/admin/egresados/fotos').set(headers.admin)
      .field('tipo', 'promo').field('anio', '2026').field('colegio', 'Colegio Norte')
      .attach('fotos', await foto(), { filename: 'uno.jpg', contentType: 'image/jpeg' })
      .attach('fotos', await foto(1200, 1600), { filename: 'dos.jpg', contentType: 'image/jpeg' })
      .attach('fotos', Buffer.from('no soy una foto'), { filename: 'tres.jpg', contentType: 'image/jpeg' })
      .attach('fotos', await foto(120, 120), { filename: 'chiquita.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    subidas = res.body.fotos;
    assert.equal(subidas.length, 2);
    assert.equal(res.body.errores.length, 2);
    assert.match(res.body.errores.join(' '), /tres\.jpg/);
    assert.match(res.body.errores.join(' '), /muy chica/);
    assert.equal(subidas[0].ancho, 1600);
    assert.equal(subidas[0].alto, 1067);
    assert.equal(subidas[0].alt, 'Buzo de egresados · Colegio Norte · 2026');
    assert.equal(subidas[0].tipo, 'Promos reales');

    const img = await request(app).get(subidas[0].foto);
    assert.equal(img.status, 200);
    assert.equal(img.headers['content-type'], 'image/webp');
    const meta = await sharp(img.body).metadata();
    assert.equal(meta.format, 'webp');
    assert.equal(meta.exif, undefined, 'no publica los datos EXIF de la cámara');
    const mini = await sharp((await request(app).get(subidas[0].mini)).body).metadata();
    assert.equal(mini.width, 640);
  });

  it('las fotos chicas se amplían con calidad, se marcan como baja resolución y se guarda el original', async () => {
    const res = await request(app).post('/api/admin/egresados/fotos').set(headers.admin)
      .attach('fotos', await foto(400, 500), { filename: 'chica.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const [f] = res.body.fotos;
    assert.equal(f.bajaResolucion, true);
    assert.deepEqual([f.anchoOriginal, f.altoOriginal], [400, 500]);
    assert.ok(f.ancho > 700 && f.alto > 900, `ampliada a ${f.ancho}×${f.alto}`);
    assert.equal(f.maxAncho, 800, 'el sitio no la muestra a más del doble de su tamaño real');
    const fila = await db.EgrFoto.findByPk(f.id);
    assert.ok(require('fs').existsSync(require('../src/services/galeriaEgresados').rutaOriginal(fila.original)));
    assert.equal(subidas[0].bajaResolucion, false);
    await request(app).delete(`/api/admin/egresados/fotos/${f.id}`).set(headers.admin);
    assert.equal(require('fs').existsSync(require('../src/services/galeriaEgresados').rutaOriginal(fila.original)), false, 'al borrar la foto se borra el original');
  });

  it('edita, ordena, oculta y el sitio solo ve las visibles', async () => {
    const [a, b] = subidas;
    let res = await request(app).put(`/api/admin/egresados/fotos/${a.id}`).set(headers.admin)
      .send({ tipo: 'diseno', alt: 'Buzo bordó de frente', diseno: 'tipo=canguro&estilo=liso&pal=bordo.hueso.hueso' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.tipo, 'Diseños');
    res = await request(app).put(`/api/admin/egresados/fotos/${a.id}`).set(headers.admin).send({ diseno: 'javascript:alert(1)' });
    assert.equal(res.status, 400);

    res = await request(app).put('/api/admin/egresados/fotos/orden').set(headers.admin).send({ ids: [b.id, a.id] });
    assert.equal(res.status, 204);
    let publica = (await request(app).get('/api/egresados/galeria')).body.fotos;
    assert.deepEqual(publica.map((f) => f.alt), ['Buzo de egresados · Colegio Norte · 2026', 'Buzo bordó de frente']);
    assert.equal(publica[0].id, undefined, 'el sitio no recibe datos internos');

    await request(app).put(`/api/admin/egresados/fotos/${b.id}`).set(headers.admin).send({ visible: false });
    publica = (await request(app).get('/api/egresados/galeria')).body.fotos;
    assert.equal(publica.length, 1);
    assert.equal(publica[0].diseno, 'tipo=canguro&estilo=liso&pal=bordo.hueso.hueso');
  });

  it('al borrar una foto se borran sus archivos', async () => {
    const [a] = subidas;
    const res = await request(app).delete(`/api/admin/egresados/fotos/${a.id}`).set(headers.admin);
    assert.equal(res.status, 204);
    assert.equal((await request(app).get(a.foto)).status, 404);
    assert.equal(await db.EgrFoto.count({ where: { id: a.id } }), 0);
  });
});
