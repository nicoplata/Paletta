const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// index.html de prueba con la misma forma que el que genera Vite
const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'paletta-dist-'));
fs.writeFileSync(path.join(dist, 'index.html'), `<!doctype html>
<html lang="es-AR">
  <head>
    <title>Paletta - Uniformes Escolares y Egresados</title>
    <meta name="description" content="Descripción por defecto" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://www.paletta.com.ar/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Paletta" />
    <meta property="og:description" content="Descripción por defecto" />
    <meta property="og:url" content="https://www.paletta.com.ar/" />
    <meta property="og:image" content="https://www.paletta.com.ar/img/og-paletta.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:title" content="Paletta" />
    <meta name="twitter:description" content="Descripción por defecto" />
    <meta name="twitter:image" content="https://www.paletta.com.ar/img/og-paletta.jpg" />
  </head>
  <body><div id="root"></div></body>
</html>`);
process.env.FRONTEND_DIST = dist;
process.env.SITE_URL = 'https://www.paletta.com.ar';

const { app, request, db, prepararEscenario, crearCatalogoBase, cerrar } = require('./helpers');
const ENV = require('../src/config/env');

const meta = (html, clave) => html.match(new RegExp(`<meta (?:name|property)="${clave}" content="([^"]*)"`))?.[1];

describe('SEO', () => {
  let producto;
  let colegio;
  let oculto;

  before(async () => {
    await prepararEscenario();
    const base = await crearCatalogoBase();
    colegio = base.colegio;
    producto = await db.Producto.create({
      nombre: 'Campera <Egresados> "2026"', descripcion: 'Campera bordada con nombres.', precio: 42000,
      categoriaId: base.categoria.id, colegioId: colegio.id,
    });
    await db.Variante.create({ productoId: producto.id, talle: 'M', stock: 3 });
    await db.Imagen.create({ url: '/uploads/campera.jpg', tipoEntidad: 'producto', entidadId: producto.id });
    oculto = await db.Producto.create({ nombre: 'Oculto', precio: 1, categoriaId: base.categoria.id, colegioId: colegio.id, activo: false });
  });

  after(async () => {
    await cerrar();
    fs.rmSync(dist, { recursive: true, force: true });
  });

  it('sitemap.xml lista páginas fijas, colegios y productos activos', async () => {
    const res = await request(app).get('/sitemap.xml');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /xml/);
    assert.match(res.text, /<loc>https:\/\/www\.paletta\.com\.ar\/<\/loc>/);
    assert.match(res.text, new RegExp(`/colegios/${colegio.id}/productos</loc>`));
    assert.match(res.text, new RegExp(`/producto/${producto.id}</loc><lastmod>\\d{4}-\\d{2}-\\d{2}</lastmod>`));
    assert.doesNotMatch(res.text, new RegExp(`/producto/${oculto.id}<`));
  });

  it('la página de producto trae título, descripción, imagen y canonical propios (escapados)', async () => {
    const res = await request(app).get(`/producto/${producto.id}`);
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /html/);
    assert.equal(res.headers['content-security-policy'], undefined);
    assert.match(res.text, /<title>Campera &lt;Egresados&gt; &quot;2026&quot; - San Martín \| Paletta Uniformes<\/title>/);
    assert.match(meta(res.text, 'description'), /del San Martín\. Campera bordada/);
    assert.equal(meta(res.text, 'og:image'), 'https://www.paletta.com.ar/uploads/campera.jpg');
    assert.equal(meta(res.text, 'og:type'), 'product');
    assert.equal(meta(res.text, 'og:image:width'), undefined);
    assert.match(res.text, new RegExp(`<link rel="canonical" href="https://www.paletta.com.ar/producto/${producto.id}"`));
    assert.match(res.text, /<div id="root"><\/div>/, 'sigue siendo la SPA');
  });

  it('incluye datos estructurados de producto, con precio solo si la tienda está activa', async () => {
    const extraer = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    ENV.TIENDA_HABILITADA = false;
    let ld = extraer((await request(app).get(`/producto/${producto.id}`)).text);
    assert.equal(ld['@type'], 'Product');
    assert.equal(ld.offers, undefined);
    ENV.TIENDA_HABILITADA = true;
    try {
      ld = extraer((await request(app).get(`/producto/${producto.id}`)).text);
      assert.equal(ld.offers.price, '42000.00');
      assert.equal(ld.offers.availability, 'https://schema.org/InStock');
    } finally {
      ENV.TIENDA_HABILITADA = false;
    }
  });

  it('el JSON-LD no puede romper el HTML', async () => {
    await producto.update({ descripcion: 'malicioso </script><script>alert(1)</script>' });
    const res = await request(app).get(`/producto/${producto.id}`);
    assert.doesNotMatch(res.text, /<script>alert\(1\)<\/script>/);
    await producto.update({ descripcion: 'Campera bordada con nombres.' });
  });

  it('la página de colegio usa su nombre y sus productos', async () => {
    const res = await request(app).get(`/colegios/${colegio.id}/productos`);
    assert.equal(res.status, 200);
    assert.match(res.text, /<title>Uniformes San Martín \| Paletta Uniformes<\/title>/);
    assert.match(meta(res.text, 'description'), /Campera/);
  });

  it('productos inactivos o inexistentes devuelven 404 con noindex', async () => {
    for (const ruta of [`/producto/${oculto.id}`, '/producto/999999', '/colegios/999999/productos']) {
      const res = await request(app).get(ruta);
      assert.equal(res.status, 404, ruta);
      assert.equal(meta(res.text, 'robots'), 'noindex');
    }
  });

  it('si no hay build del frontend responde 503 (nginx usa el index estático)', async () => {
    const original = ENV.FRONTEND_DIST;
    ENV.FRONTEND_DIST = path.join(dist, 'no-existe');
    try {
      assert.equal((await request(app).get(`/producto/${producto.id}`)).status, 503);
    } finally {
      ENV.FRONTEND_DIST = original;
    }
  });
});
