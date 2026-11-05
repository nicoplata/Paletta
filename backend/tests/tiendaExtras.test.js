const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.TIENDA_HABILITADA = 'true';
process.env.ENVIO_COSTO = '5000';
process.env.TRANSFERENCIA_ALIAS = 'paletta.ropa';
process.env.MP_ACCESS_TOKEN = 'TEST-token';
process.env.MP_WEBHOOK_SECRET = 'secreto-webhook';
process.env.PEDIDOS_POR_HORA = '1000';
process.env.CUPONES_POR_10MIN = '1000';

const { app, request, db, prepararEscenario, crearCatalogoBase, cerrar } = require('./helpers');
const ENV = require('../src/config/env');

const mp = { preferencias: [] };
let servidorMp;

describe('Tienda: cupones, zonas de envío y exportación', () => {
  let headers;
  let variante;

  before(async () => {
    const mpApp = express();
    mpApp.use(express.json());
    mpApp.post('/checkout/preferences', (req, res) => {
      mp.preferencias.push(req.body);
      res.json({ id: `pref-${mp.preferencias.length}`, init_point: 'https://mp.test/pay' });
    });
    await new Promise((ok) => { servidorMp = mpApp.listen(0, ok); });
    ENV.MP_API_URL = `http://127.0.0.1:${servidorMp.address().port}`;

    headers = await prepararEscenario();
    const { categoria, colegio } = await crearCatalogoBase();
    const producto = await db.Producto.create({ nombre: 'Campera', precio: 10000, categoriaId: categoria.id, colegioId: colegio.id });
    variante = await db.Variante.create({ productoId: producto.id, talle: 'M', stock: 500 });
  });

  after(async () => {
    servidorMp.close();
    await cerrar();
  });

  const comprar = (extra = {}) => request(app).post('/api/pedidos').send({
    nombre: 'María Pérez',
    email: 'maria@mail.com',
    telefono: '1144445555',
    tipoEntrega: 'retiro',
    metodoPago: 'transferencia',
    items: [{ varianteId: variante.id, cantidad: 2 }],
    ...extra,
  });
  const envio = { tipoEntrega: 'envio', direccion: 'Av. Maipú 1234', ciudad: 'Vicente López', provincia: 'Buenos Aires' };

  describe('cupones (admin)', () => {
    it('solo administradores; valida tipo, valor y código', async () => {
      assert.equal((await request(app).get('/api/admin/cupones').set(headers.operador)).status, 403);
      const mal = await request(app).post('/api/admin/cupones').set(headers.admin).send({ codigo: 'a b', tipo: 'porcentaje', valor: 150 });
      assert.equal(mal.status, 400);
      assert.equal(mal.body.detalles.length, 2);
    });

    it('crea cupones y normaliza el código a mayúsculas', async () => {
      const res = await request(app).post('/api/admin/cupones').set(headers.admin).send({ codigo: 'promo10', tipo: 'porcentaje', valor: 10 });
      assert.equal(res.status, 201);
      assert.equal(res.body.codigo, 'PROMO10');
      assert.equal((await request(app).post('/api/admin/cupones').set(headers.admin).send({ codigo: 'PROMO10', tipo: 'monto', valor: 1 })).status, 409);
    });
  });

  describe('cupones (checkout)', () => {
    before(async () => {
      await db.Cupon.bulkCreate([
        { codigo: 'MIL', tipo: 'monto', valor: 1000 },
        { codigo: 'GIGANTE', tipo: 'monto', valor: 999999 },
        { codigo: 'MINIMO', tipo: 'porcentaje', valor: 20, minimoCompra: 50000 },
        { codigo: 'VENCIDO', tipo: 'porcentaje', valor: 20, hasta: new Date(Date.now() - 86400000) },
        { codigo: 'FUTURO', tipo: 'porcentaje', valor: 20, desde: new Date(Date.now() + 86400000) },
        { codigo: 'APAGADO', tipo: 'porcentaje', valor: 20, activo: false },
        { codigo: 'UNICO', tipo: 'porcentaje', valor: 50, usosMaximos: 1 },
      ]);
    });

    it('la vista previa calcula el descuento con precios de la base', async () => {
      const res = await request(app).post('/api/cupones/validar').send({ codigo: 'promo10', items: [{ varianteId: variante.id, cantidad: 3 }] });
      assert.equal(res.status, 200);
      assert.equal(res.body.descuento, 3000);
    });

    it('rechaza cupones inexistentes, vencidos, futuros, inactivos o sin el mínimo', async () => {
      for (const [codigo, texto] of [['NOEXISTE', /no existe/], ['VENCIDO', /vencido/], ['FUTURO', /vigente/], ['APAGADO', /no existe/], ['MINIMO', /mínima/]]) {
        const res = await request(app).post('/api/cupones/validar').send({ codigo, items: [{ varianteId: variante.id, cantidad: 1 }] });
        assert.equal(res.status, 400, codigo);
        assert.match(res.body.error, texto, codigo);
      }
    });

    it('aplica el porcentaje al subtotal y suma el envío sin descontarlo', async () => {
      const res = await comprar({ ...envio, codigoPostal: '1638', cupon: 'promo10' });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const p = res.body.pedido;
      assert.equal(p.subtotal, 20000);
      assert.equal(p.descuento, 2000);
      assert.equal(p.costoEnvio, 5000);
      assert.equal(p.total, 23000);
      assert.equal(p.cuponCodigo, 'PROMO10');
    });

    it('un monto fijo nunca deja el total negativo', async () => {
      const res = await comprar({ cupon: 'GIGANTE' });
      assert.equal(res.body.pedido.descuento, 20000);
      assert.equal(res.body.pedido.total, 0);
    });

    it('respeta el límite de usos, también con pedidos simultáneos', async () => {
      const resultados = await Promise.all(Array.from({ length: 5 }, () => comprar({ cupon: 'UNICO' })));
      assert.equal(resultados.filter((r) => r.status === 201).length, 1);
      assert.ok(resultados.filter((r) => r.status === 400).every((r) => /límite de usos/.test(r.body.error)));
      assert.equal((await db.Cupon.findOne({ where: { codigo: 'UNICO' } })).usos, 1);
    });

    it('cancelar el pedido devuelve el uso del cupón', async () => {
      const pedido = await db.Pedido.findOne({ where: { cuponCodigo: 'UNICO' } });
      await request(app).patch(`/api/admin/pedidos/${pedido.id}/estado`).set(headers.admin).send({ estado: 'cancelado' }).expect(200);
      assert.equal((await db.Cupon.findOne({ where: { codigo: 'UNICO' } })).usos, 0);
      assert.equal((await comprar({ cupon: 'UNICO' })).status, 201);
    });

    it('un cupón inválido no crea el pedido ni toca el stock', async () => {
      const antes = (await db.Variante.findByPk(variante.id)).stock;
      assert.equal((await comprar({ cupon: 'VENCIDO' })).status, 400);
      assert.equal((await db.Variante.findByPk(variante.id)).stock, antes);
    });

    it('con descuento, Mercado Pago recibe un solo ítem por el total ya descontado', async () => {
      const res = await comprar({ metodoPago: 'mercadopago', cupon: 'MIL', ...envio, codigoPostal: '1638' });
      assert.equal(res.status, 201);
      const pref = mp.preferencias.at(-1);
      const total = pref.items.reduce((a, i) => a + i.unit_price * i.quantity, 0);
      assert.equal(total, res.body.pedido.total);
      assert.equal(pref.items[0].unit_price, 19000);
      assert.match(pref.items[0].title, /cupón MIL/);
    });

    it('no se puede borrar un cupón usado, solo desactivarlo', async () => {
      const cupon = await db.Cupon.findOne({ where: { codigo: 'MIL' } });
      assert.equal((await request(app).delete(`/api/admin/cupones/${cupon.id}`).set(headers.admin)).status, 409);
    });
  });

  describe('zonas de envío', () => {
    beforeEach(async () => {
      await db.ZonaEnvio.destroy({ where: {} });
      ENV.ENVIO_GRATIS_DESDE = 0;
    });

    it('sin zonas cargadas usa el costo fijo', async () => {
      const res = await request(app).get('/api/envio/cotizar?cp=9999');
      assert.deepEqual({ disponible: res.body.disponible, costo: res.body.costo }, { disponible: true, costo: 5000 });
    });

    it('con zonas, cotiza según el código postal (acepta formato CPA)', async () => {
      await request(app).post('/api/admin/zonas-envio').set(headers.admin).send({ nombre: 'Vicente López', cpDesde: 1602, cpHasta: 1638, costo: 3000, demora: '24 a 48 h' }).expect(201);
      await request(app).post('/api/admin/zonas-envio').set(headers.admin).send({ nombre: 'CABA', cpDesde: 1000, cpHasta: 1499, costo: 6500 }).expect(201);
      const vl = await request(app).get('/api/envio/cotizar?cp=B1605ABC');
      assert.equal(vl.body.costo, 3000);
      assert.equal(vl.body.zona, 'Vicente López');
      assert.equal((await request(app).get('/api/envio/cotizar?cp=1425')).body.costo, 6500);
      const lejos = await request(app).get('/api/envio/cotizar?cp=5000');
      assert.equal(lejos.body.disponible, false);
    });

    it('el pedido usa el costo de la zona y rechaza CP sin cobertura', async () => {
      await db.ZonaEnvio.create({ nombre: 'Vicente López', cpDesde: 1602, cpHasta: 1638, costo: 3000 });
      const ok = await comprar({ ...envio, codigoPostal: '1605' });
      assert.equal(ok.body.pedido.costoEnvio, 3000);
      assert.equal(ok.body.pedido.zonaEnvio, 'Vicente López');
      const sin = await comprar({ ...envio, codigoPostal: '5000' });
      assert.equal(sin.status, 400);
      assert.match(sin.body.error, /no hacemos envíos/i);
    });

    it('envío gratis a partir de un monto (medido después del descuento)', async () => {
      ENV.ENVIO_GRATIS_DESDE = 19500;
      const gratis = await comprar({ ...envio, codigoPostal: '1605' });
      assert.equal(gratis.body.pedido.costoEnvio, 0);
      const conCupon = await comprar({ ...envio, codigoPostal: '1605', cupon: 'MIL' });
      assert.equal(conCupon.body.pedido.costoEnvio, 5000, '20000 - 1000 = 19000 no llega al mínimo');
    });

    it('valida rangos al crear zonas', async () => {
      const res = await request(app).post('/api/admin/zonas-envio').set(headers.admin).send({ nombre: 'Mal', cpDesde: 2000, cpHasta: 1000, costo: 1 });
      assert.equal(res.status, 400);
    });
  });

  describe('exportación de pedidos', () => {
    it('solo administradores', async () => {
      assert.equal((await request(app).get('/api/admin/pedidos/exportar')).status, 401);
    });

    it('CSV para Excel: BOM, ";", coma decimal y protección contra fórmulas', async () => {
      await comprar({ nombre: '=HYPERLINK("http://malo")', notas: 'Bordado "Promo 2027"; talle M' });
      const res = await request(app).get('/api/admin/pedidos/exportar').set(headers.admin);
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/csv/);
      assert.match(res.headers['content-disposition'], /attachment; filename="pedidos-pedidos-\d{4}-\d{2}-\d{2}\.csv"/);
      assert.ok(res.text.startsWith('﻿Pedido;Fecha;Estado;Cliente'));
      assert.match(res.text, /"'=HYPERLINK\(""http:\/\/malo""\)"/);
      assert.match(res.text, /"Bordado ""Promo 2027""; talle M"/);
      assert.match(res.text, /;20000;0;0;20000;/);
    });

    it('filtra por estado y exporta una fila por prenda', async () => {
      const res = await request(app).get('/api/admin/pedidos/exportar?detalle=items&estado=cancelado').set(headers.admin);
      const lineas = res.text.trim().split('\r\n');
      assert.match(lineas[0], /Producto;Colegio;Talle;Cantidad/);
      assert.ok(lineas.length >= 2);
      assert.ok(lineas.slice(1).every((l) => l.includes(';Cancelado;')));
    });

    it('valida los filtros', async () => {
      assert.equal((await request(app).get('/api/admin/pedidos/exportar?estado=inventado').set(headers.admin)).status, 400);
    });
  });
});
