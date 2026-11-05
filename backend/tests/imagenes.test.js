const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { app, request, db, PNG, prepararEscenario, crearCatalogoBase, cerrar } = require('./helpers');

const UPLOADS = process.env.UPLOADS_DIR;
const archivos = () => fs.readdirSync(UPLOADS);

describe('Imágenes', () => {
  let headers;
  let producto;

  before(async () => {
    headers = await prepararEscenario();
    const { categoria, colegio } = await crearCatalogoBase();
    producto = await db.Producto.create({ nombre: 'Buzo', precio: 100, categoriaId: categoria.id, colegioId: colegio.id });
  });
  after(cerrar);

  const subir = (h, campos, contenido = PNG, opciones = { filename: 'foto.png', contentType: 'image/png' }) => {
    let req = request(app).post('/api/imagenes').set(h);
    Object.entries(campos).forEach(([k, v]) => { req = req.field(k, String(v)); });
    return req.attach('imagen', contenido, opciones);
  };

  it('el admin sube una imagen; se guarda con nombre propio y se puede descargar', async () => {
    const res = await subir(headers.admin, { tipoEntidad: 'producto', entidadId: producto.id });
    assert.equal(res.status, 201);
    assert.match(res.body.url, /^\/uploads\/\d+-[0-9a-f]+\.png$/);
    const archivo = await request(app).get(res.body.url);
    assert.equal(archivo.status, 200);
    assert.equal(archivo.headers['content-type'], 'image/png');
  });

  it('aparece en el producto del catálogo público', async () => {
    const res = await request(app).get(`/api/productos/public/${producto.id}`);
    assert.equal(res.body.imagenes.length, 1);
  });

  it('el rol usuario no puede subir imágenes', async () => {
    const res = await subir(headers.operador, { tipoEntidad: 'producto', entidadId: producto.id });
    assert.equal(res.status, 403);
  });

  it('rechaza archivos que no son imágenes', async () => {
    const antes = archivos().length;
    const res = await subir(headers.admin, { tipoEntidad: 'producto', entidadId: producto.id }, Buffer.from('<?php ?>'), {
      filename: 'shell.php', contentType: 'application/x-php',
    });
    assert.equal(res.status, 400);
    assert.equal(archivos().length, antes);
  });

  it('no deja archivos huérfanos si la entidad no existe o los datos son inválidos', async () => {
    const antes = archivos().length;
    assert.equal((await subir(headers.admin, { tipoEntidad: 'producto', entidadId: 99999 })).status, 400);
    assert.equal((await subir(headers.admin, { tipoEntidad: 'usuario', entidadId: 1 })).status, 400);
    assert.equal(archivos().length, antes);
  });

  it('rechaza imágenes más grandes que el límite', async () => {
    const grande = Buffer.alloc(6 * 1024 * 1024, 0);
    const res = await subir(headers.admin, { tipoEntidad: 'producto', entidadId: producto.id }, grande);
    assert.equal(res.status, 400);
    assert.match(res.body.error, /MB/);
  });

  it('eliminar la imagen borra el registro y el archivo', async () => {
    const imagen = await db.Imagen.findOne({ where: { entidadId: producto.id } });
    const nombre = path.basename(imagen.url);
    const res = await request(app).delete(`/api/imagenes/${imagen.id}`).set(headers.admin);
    assert.equal(res.status, 200);
    assert.ok(!archivos().includes(nombre));
  });

  it('eliminar un producto borra también sus imágenes', async () => {
    const subida = await subir(headers.admin, { tipoEntidad: 'producto', entidadId: producto.id });
    const nombre = path.basename(subida.body.url);
    await request(app).delete(`/api/productos/${producto.id}`).set(headers.admin).expect(200);
    assert.equal(await db.Imagen.count({ where: { entidadId: producto.id, tipoEntidad: 'producto' } }), 0);
    assert.ok(!archivos().includes(nombre));
  });
});
