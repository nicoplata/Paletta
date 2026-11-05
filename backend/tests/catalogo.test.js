const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, db, prepararEscenario, crearCatalogoBase, cerrar } = require('./helpers');

describe('Catálogo: productos, colegios y categorías', () => {
  let headers;
  let base;

  before(async () => {
    headers = await prepararEscenario();
    base = await crearCatalogoBase();
  });
  after(cerrar);

  const nuevoProducto = (extra = {}) => ({
    nombre: 'Campera egresados',
    descripcion: 'Campera bordada',
    precio: 45999.9,
    variantes: [{ talle: 'S', stock: 4 }, { talle: 'M', stock: 6 }],
    categoriaId: base.categoria.id,
    colegioId: base.colegio.id,
    ...extra,
  });

  describe('permisos', () => {
    it('sin token no se puede escribir', async () => {
      assert.equal((await request(app).post('/api/productos').send(nuevoProducto())).status, 401);
      assert.equal((await request(app).post('/api/colegios').send({ nombre: 'X', ciudad: 'Y' })).status, 401);
      assert.equal((await request(app).post('/api/categorias').send({ nombre: 'X' })).status, 401);
    });

    it('el rol usuario no puede escribir', async () => {
      assert.equal((await request(app).post('/api/productos').set(headers.operador).send(nuevoProducto())).status, 403);
      assert.equal((await request(app).delete(`/api/colegios/${base.colegio.id}`).set(headers.operador)).status, 403);
      assert.equal((await request(app).get('/api/productos').set(headers.operador)).status, 403);
    });
  });

  describe('productos', () => {
    let producto;

    it('el admin crea un producto; el precio vuelve como número', async () => {
      const res = await request(app).post('/api/productos').set(headers.admin).send(nuevoProducto());
      assert.equal(res.status, 201);
      assert.equal(res.body.precio, 45999.9);
      assert.deepEqual(res.body.variantes.map((v) => [v.talle, v.stock]), [['S', 4], ['M', 6]]);
      assert.equal(res.body.stock, 10);
      producto = res.body;
    });

    it('descarta campos no permitidos', async () => {
      const res = await request(app).post('/api/productos').set(headers.admin).send(nuevoProducto({ id: 999, hack: true }));
      assert.equal(res.status, 201);
      assert.notEqual(res.body.id, 999);
      assert.equal(res.body.hack, undefined);
    });

    it('exige al menos un talle y rechaza talles repetidos', async () => {
      const sin = await request(app).post('/api/productos').set(headers.admin).send(nuevoProducto({ variantes: [] }));
      assert.equal(sin.status, 400);
      const repetidos = await request(app).post('/api/productos').set(headers.admin)
        .send(nuevoProducto({ variantes: [{ talle: 'M', stock: 1 }, { talle: 'm', stock: 2 }] }));
      assert.equal(repetidos.status, 400);
    });

    it('editar sincroniza variantes: actualiza, agrega, elimina y permite reusar un talle', async () => {
      const [s, m] = producto.variantes;
      const res = await request(app).put(`/api/productos/${producto.id}`).set(headers.admin).send(nuevoProducto({
        variantes: [{ id: m.id, talle: 'M', stock: 1 }, { talle: 'S', stock: 9 }, { talle: 'L', stock: 2, activo: false }],
      }));
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.variantes.map((v) => [v.talle, v.stock, v.activo]), [['M', 1, true], ['S', 9, true], ['L', 2, false]]);
      assert.equal(await db.Variante.findByPk(s.id), null);
      assert.equal(res.body.stock, 10, 'el stock total no cuenta variantes inactivas');
      producto = res.body;
    });

    it('no permite tocar variantes de otro producto', async () => {
      const otro = await request(app).post('/api/productos').set(headers.admin).send(nuevoProducto({ nombre: 'Otro' }));
      const res = await request(app).put(`/api/productos/${producto.id}`).set(headers.admin)
        .send(nuevoProducto({ variantes: [{ id: otro.body.variantes[0].id, talle: 'S', stock: 1 }] }));
      assert.equal(res.status, 400);
      await request(app).delete(`/api/productos/${otro.body.id}`).set(headers.admin).expect(200);
    });

    it('el catálogo público no muestra talles inactivos', async () => {
      const res = await request(app).get(`/api/productos/public/${producto.id}`);
      assert.deepEqual(res.body.variantes.map((v) => v.talle), ['M', 'S']);
    });

    it('valida datos y relaciones', async () => {
      const invalido = await request(app).post('/api/productos').set(headers.admin).send({ nombre: 'X', precio: -1 });
      assert.equal(invalido.status, 400);
      const sinColegio = await request(app).post('/api/productos').set(headers.admin).send(nuevoProducto({ colegioId: 9999 }));
      assert.equal(sinColegio.status, 400);
      assert.match(sinColegio.body.error, /colegio/i);
    });

    it('el catálogo público incluye categoría, colegio e imágenes', async () => {
      const res = await request(app).get('/api/productos/public');
      assert.equal(res.status, 200);
      const p = res.body.find((x) => x.id === producto.id);
      assert.equal(p.categoria.nombre, 'Campera');
      assert.equal(p.colegio.nombre, 'San Martín');
      assert.deepEqual(p.imagenes, []);
    });

    it('el catálogo público filtra por colegio y categoría', async () => {
      const otraCategoria = await db.Categoria.create({ nombre: 'Buzo' });
      await request(app).post('/api/productos').set(headers.admin).send(nuevoProducto({ nombre: 'Buzo', categoriaId: otraCategoria.id }));
      const res = await request(app).get(`/api/productos/public?categoriaId=${otraCategoria.id}`);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].nombre, 'Buzo');
    });

    it('un producto oculto no aparece en el sitio pero sí en el admin', async () => {
      const upd = await request(app).put(`/api/productos/${producto.id}`).set(headers.admin).send(nuevoProducto({ activo: false }));
      assert.equal(upd.status, 200);
      const publico = await request(app).get('/api/productos/public');
      assert.ok(!publico.body.some((p) => p.id === producto.id));
      assert.equal((await request(app).get(`/api/productos/public/${producto.id}`)).status, 404);
      const admin = await request(app).get('/api/productos').set(headers.admin);
      assert.ok(admin.body.some((p) => p.id === producto.id));
    });

    it('ids inválidos devuelven 400 y los inexistentes 404', async () => {
      assert.equal((await request(app).get('/api/productos/public/abc')).status, 400);
      assert.equal((await request(app).get('/api/productos/public/99999')).status, 404);
    });

    it('el admin elimina un producto', async () => {
      const res = await request(app).delete(`/api/productos/${producto.id}`).set(headers.admin);
      assert.equal(res.status, 200);
      assert.equal(await db.Producto.findByPk(producto.id), null);
    });
  });

  describe('colegios', () => {
    it('crea un colegio con niveles válidos y rechaza niveles inventados', async () => {
      const ok = await request(app).post('/api/colegios').set(headers.admin)
        .send({ nombre: 'Belgrano', ciudad: 'Vicente López', nivel: ['Primaria', 'Secundaria'] });
      assert.equal(ok.status, 201);
      assert.deepEqual(ok.body.nivel, ['Primaria', 'Secundaria']);
      const mal = await request(app).post('/api/colegios').set(headers.admin)
        .send({ nombre: 'X', ciudad: 'Y', nivel: ['Universidad'] });
      assert.equal(mal.status, 400);
    });

    it('un colegio inactivo no se ve en el sitio, sí en el admin', async () => {
      const c = await db.Colegio.create({ nombre: 'Oculto', ciudad: 'X', activo: false });
      const publico = await request(app).get('/api/colegios');
      assert.ok(!publico.body.some((x) => x.id === c.id));
      assert.equal((await request(app).get(`/api/colegios/${c.id}`)).status, 404);
      assert.equal((await request(app).get(`/api/colegios/${c.id}/productos`)).status, 404);
      const admin = await request(app).get('/api/colegios/admin').set(headers.admin);
      assert.ok(admin.body.some((x) => x.id === c.id));
    });

    it('lista los productos activos de un colegio', async () => {
      await request(app).post('/api/productos').set(headers.admin).send(nuevoProducto({ nombre: 'Remera' }));
      const res = await request(app).get(`/api/colegios/${base.colegio.id}/productos`);
      assert.equal(res.status, 200);
      assert.ok(res.body.every((p) => p.colegioId === base.colegio.id && p.activo));
      assert.ok(res.body.some((p) => p.nombre === 'Remera'));
    });

    it('no permite borrar un colegio con productos (409)', async () => {
      const res = await request(app).delete(`/api/colegios/${base.colegio.id}`).set(headers.admin);
      assert.equal(res.status, 409);
    });
  });

  describe('categorías', () => {
    it('la lectura es pública y ordenada', async () => {
      const res = await request(app).get('/api/categorias');
      assert.equal(res.status, 200);
      const nombres = res.body.map((c) => c.nombre);
      assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b)));
    });

    it('no permite borrar una categoría en uso (409) pero sí una libre', async () => {
      assert.equal((await request(app).delete(`/api/categorias/${base.categoria.id}`).set(headers.admin)).status, 409);
      const libre = await request(app).post('/api/categorias').set(headers.admin).send({ nombre: 'Gorra' });
      assert.equal(libre.status, 201);
      assert.equal((await request(app).delete(`/api/categorias/${libre.body.id}`).set(headers.admin)).status, 200);
    });
  });
});
