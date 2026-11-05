const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');

// Configuración de la tienda para estos tests (antes de cargar la app)
process.env.TIENDA_HABILITADA = 'true';
process.env.ENVIO_COSTO = '5000';
process.env.TRANSFERENCIA_ALIAS = 'paletta.ropa';
process.env.TRANSFERENCIA_CBU = '0000003100000000000001';
process.env.MP_ACCESS_TOKEN = 'TEST-token';
process.env.MP_WEBHOOK_SECRET = 'secreto-webhook';
process.env.SITE_URL = 'https://www.paletta.com.ar';
process.env.PEDIDOS_POR_HORA = '1000';

const { app, request, db, prepararEscenario, crearCatalogoBase, cerrar } = require('./helpers');
const ENV = require('../src/config/env');
const { vencerPendientes } = require('../src/services/pedidos');

// --- Servidor falso de Mercado Pago ---
const mp = { preferencias: [], pagos: new Map() };
let servidorMp;

function firmar(dataId, requestId = 'req-1', ts = String(Date.now())) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac('sha256', 'secreto-webhook').update(manifest).digest('hex');
  return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId };
}

const webhook = (paymentId, headers = firmar(paymentId)) =>
  request(app).post(`/api/pagos/webhook?data.id=${paymentId}&type=payment`).set(headers)
    .send({ type: 'payment', data: { id: paymentId } });

describe('Tienda', () => {
  let headers;
  let producto;
  let talleM;
  let talleL;

  before(async () => {
    const mpApp = express();
    mpApp.use(express.json());
    mpApp.post('/checkout/preferences', (req, res) => {
      assert.equal(req.get('authorization'), 'Bearer TEST-token');
      const id = `pref-${mp.preferencias.length + 1}`;
      mp.preferencias.push(req.body);
      res.json({ id, init_point: `https://mp.test/checkout?pref=${id}` });
    });
    mpApp.get('/v1/payments/:id', (req, res) => {
      const pago = mp.pagos.get(req.params.id);
      if (!pago) return res.status(404).json({ message: 'not found' });
      res.json(pago);
    });
    await new Promise((ok) => { servidorMp = mpApp.listen(0, ok); });
    ENV.MP_API_URL = `http://127.0.0.1:${servidorMp.address().port}`;

    headers = await prepararEscenario();
    const { categoria, colegio } = await crearCatalogoBase();
    const res = await request(app).post('/api/productos').set(headers.admin).send({
      nombre: 'Campera egresados', precio: 40000, categoriaId: categoria.id, colegioId: colegio.id,
      variantes: [{ talle: 'M', stock: 3 }, { talle: 'L', stock: 2 }],
    });
    producto = res.body;
    [talleM, talleL] = producto.variantes;
  });

  after(async () => {
    servidorMp.close();
    await cerrar();
  });

  const stock = async (variante) => (await db.Variante.findByPk(variante.id)).stock;
  const setStock = (variante, n) => db.Variante.update({ stock: n }, { where: { id: variante.id } });

  const datosCliente = (extra = {}) => ({
    nombre: 'María Pérez',
    email: 'Maria@Mail.com',
    telefono: '11 4444-5555',
    tipoEntrega: 'retiro',
    metodoPago: 'transferencia',
    items: [{ varianteId: talleM.id, cantidad: 1 }],
    ...extra,
  });
  const comprar = (extra) => request(app).post('/api/pedidos').send(datosCliente(extra));

  describe('configuración', () => {
    it('expone métodos de pago y envío disponibles', async () => {
      const res = await request(app).get('/api/tienda/config');
      assert.equal(res.status, 200);
      assert.equal(res.body.habilitada, true);
      assert.deepEqual(res.body.metodosPago, ['mercadopago', 'transferencia']);
      assert.equal(res.body.envio.costo, 5000);
    });
  });

  describe('crear pedido', () => {
    beforeEach(async () => {
      await setStock(talleM, 3);
      await setStock(talleL, 2);
    });

    it('reserva stock, toma el precio de la base y suma el envío', async () => {
      const res = await comprar({
        tipoEntrega: 'envio', direccion: 'Av. Siempreviva 742', ciudad: 'Munro', provincia: 'Buenos Aires', codigoPostal: '1605',
        items: [{ varianteId: talleM.id, cantidad: 2, precio: 1 }, { varianteId: talleL.id, cantidad: 1 }],
      });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const p = res.body.pedido;
      assert.match(p.numero, /^P-\d{6}$/);
      assert.equal(p.estado, 'pendiente_pago');
      assert.equal(p.subtotal, 120000);
      assert.equal(p.costoEnvio, 5000);
      assert.equal(p.total, 125000);
      assert.equal(p.email, 'maria@mail.com');
      assert.equal(p.transferencia.alias, 'paletta.ropa');
      assert.equal(p.items.length, 2);
      assert.equal(await stock(talleM), 1);
      assert.equal(await stock(talleL), 1);
    });

    it('unifica ítems repetidos de la misma variante', async () => {
      const res = await comprar({ items: [{ varianteId: talleM.id, cantidad: 1 }, { varianteId: talleM.id, cantidad: 2 }] });
      assert.equal(res.status, 201);
      assert.equal(res.body.pedido.items[0].cantidad, 3);
      assert.equal(await stock(talleM), 0);
    });

    it('sin stock suficiente devuelve 409 con detalle y no toca el stock', async () => {
      const res = await comprar({ items: [{ varianteId: talleM.id, cantidad: 1 }, { varianteId: talleL.id, cantidad: 5 }] });
      assert.equal(res.status, 409);
      assert.match(res.body.detalles[0], /talle L\): quedan 2/);
      assert.equal(await stock(talleM), 3);
      assert.equal(await stock(talleL), 2);
    });

    it('no vende talles o productos desactivados', async () => {
      await db.Variante.update({ activo: false }, { where: { id: talleL.id } });
      const res = await comprar({ items: [{ varianteId: talleL.id, cantidad: 1 }] });
      assert.equal(res.status, 409);
      await db.Variante.update({ activo: true }, { where: { id: talleL.id } });

      await db.Producto.update({ activo: false }, { where: { id: producto.id } });
      assert.equal((await comprar()).status, 409);
      await db.Producto.update({ activo: true }, { where: { id: producto.id } });
    });

    it('valida datos: dirección obligatoria para envío, ítems y método de pago', async () => {
      const sinDireccion = await comprar({ tipoEntrega: 'envio' });
      assert.equal(sinDireccion.status, 400);
      assert.ok(sinDireccion.body.detalles.some((d) => d.includes('direccion')));
      assert.equal((await comprar({ items: [] })).status, 400);
      assert.equal((await comprar({ metodoPago: 'efectivo' })).status, 400);
      assert.equal((await comprar({ telefono: 'abc' })).status, 400);
    });

    it('en retiro descarta los datos de dirección', async () => {
      const res = await comprar({ direccion: 'no debería guardarse' });
      assert.equal(res.status, 201);
      assert.equal(res.body.pedido.direccion, null);
      assert.equal(res.body.pedido.costoEnvio, 0);
    });

    it('respeta el máximo de unidades por talle', async () => {
      await setStock(talleM, 500);
      const res = await comprar({ items: [{ varianteId: talleM.id, cantidad: ENV.MAX_UNIDADES_POR_ITEM + 1 }] });
      assert.equal(res.status, 400);
    });

    it('con la tienda deshabilitada no acepta pedidos', async () => {
      ENV.TIENDA_HABILITADA = false;
      try {
        assert.equal((await comprar()).status, 403);
      } finally {
        ENV.TIENDA_HABILITADA = true;
      }
    });

    it('pedidos concurrentes nunca venden más que el stock', async () => {
      await setStock(talleL, 3);
      const resultados = await Promise.all(
        Array.from({ length: 8 }, () => comprar({ items: [{ varianteId: talleL.id, cantidad: 1 }] }))
      );
      const ok = resultados.filter((r) => r.status === 201).length;
      assert.equal(ok, 3);
      assert.ok(resultados.every((r) => r.status === 201 || r.status === 409));
      assert.equal(await stock(talleL), 0);
    });
  });

  describe('consulta pública', () => {
    it('se consulta por token y no expone datos internos', async () => {
      await setStock(talleM, 3);
      const { body } = await comprar();
      await db.Pedido.update({ notasInternas: 'cliente difícil' }, { where: { token: body.pedido.token } });
      const res = await request(app).get(`/api/pedidos/${body.pedido.token}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.notasInternas, undefined);
      assert.equal(res.body.mpPaymentId, undefined);
      assert.equal(res.body.id, undefined);
      assert.equal((await request(app).get('/api/pedidos/123')).status, 400);
      assert.equal((await request(app).get(`/api/pedidos/${crypto.randomUUID()}`)).status, 404);
    });
  });

  describe('Mercado Pago', () => {
    let pedido;
    let respuesta;

    beforeEach(async () => {
      await setStock(talleM, 3);
      const res = await comprar({ metodoPago: 'mercadopago', items: [{ varianteId: talleM.id, cantidad: 2 }] });
      assert.equal(res.status, 201);
      pedido = await db.Pedido.findOne({ where: { token: res.body.pedido.token } });
      respuesta = res.body;
    });

    it('crea la preferencia con los precios de la base y la URL de retorno', async () => {
      assert.match(respuesta.pago.initPoint, /^https:\/\/mp\.test\/checkout/);
      const pref = mp.preferencias.at(-1);
      assert.equal(pref.external_reference, String(pedido.id));
      assert.deepEqual(pref.items.map((i) => [i.quantity, i.unit_price]), [[2, 40000]]);
      assert.equal(pref.notification_url, 'https://www.paletta.com.ar/api/pagos/webhook');
      assert.equal(pref.back_urls.success, `https://www.paletta.com.ar/pedido/${pedido.token}`);
      assert.ok(pref.expiration_date_to);
    });

    it('rechaza webhooks sin firma o con firma inválida', async () => {
      mp.pagos.set('900', { id: 900, status: 'approved', external_reference: String(pedido.id), transaction_amount: 80000, currency_id: 'ARS' });
      assert.equal((await webhook('900', {})).status, 401);
      assert.equal((await webhook('900', { 'x-signature': 'ts=1,v1=abc', 'x-request-id': 'r' })).status, 401);
      await pedido.reload();
      assert.equal(pedido.estado, 'pendiente_pago');
    });

    it('un pago aprobado marca el pedido como pagado (idempotente)', async () => {
      mp.pagos.set('901', { id: 901, status: 'approved', external_reference: String(pedido.id), transaction_amount: 80000, currency_id: 'ARS' });
      assert.equal((await webhook('901')).status, 200);
      assert.equal((await webhook('901')).status, 200);
      await pedido.reload();
      assert.equal(pedido.estado, 'pagado');
      assert.equal(pedido.mpPaymentId, '901');
      assert.ok(pedido.pagadoAt);
      assert.equal(await stock(talleM), 1, 'el stock se descuenta una sola vez');
    });

    it('no acepta un pago con monto distinto al total', async () => {
      mp.pagos.set('902', { id: 902, status: 'approved', external_reference: String(pedido.id), transaction_amount: 1, currency_id: 'ARS' });
      await webhook('902').expect(200);
      await pedido.reload();
      assert.equal(pedido.estado, 'pendiente_pago');
      assert.match(pedido.notasInternas, /Revisar/);
    });

    it('un pago rechazado deja el pedido pendiente para reintentar', async () => {
      mp.pagos.set('903', { id: 903, status: 'rejected', external_reference: String(pedido.id), transaction_amount: 80000, currency_id: 'ARS' });
      await webhook('903').expect(200);
      await pedido.reload();
      assert.equal(pedido.estado, 'pendiente_pago');
      assert.equal(pedido.mpEstado, 'rejected');
      const reintento = await request(app).post(`/api/pedidos/${pedido.token}/pagar`);
      assert.equal(reintento.status, 200);
      assert.ok(reintento.body.initPoint);
    });

    it('al volver de MP se verifica el pago contra la API y debe ser de este pedido', async () => {
      mp.pagos.set('904', { id: 904, status: 'approved', external_reference: '999999', transaction_amount: 80000, currency_id: 'ARS' });
      const ajeno = await request(app).post(`/api/pedidos/${pedido.token}/verificar-pago`).send({ paymentId: '904' });
      assert.equal(ajeno.status, 400);

      mp.pagos.set('905', { id: 905, status: 'approved', external_reference: String(pedido.id), transaction_amount: 80000, currency_id: 'ARS' });
      const propio = await request(app).post(`/api/pedidos/${pedido.token}/verificar-pago`).send({ paymentId: '905' });
      assert.equal(propio.status, 200);
      assert.equal(propio.body.estado, 'pagado');
    });

    it('los webhooks de otros tipos se ignoran', async () => {
      const res = await request(app).post('/api/pagos/webhook?data.id=77&type=merchant_order').set(firmar('77')).send({});
      assert.equal(res.status, 200);
      assert.equal(res.body.ignorado, true);
    });
  });

  describe('vencimiento', () => {
    it('cancela los impagos vencidos y devuelve el stock', async () => {
      await setStock(talleM, 3);
      const { body } = await comprar({ items: [{ varianteId: talleM.id, cantidad: 2 }] });
      assert.equal(await stock(talleM), 1);
      await db.Pedido.update({ venceAt: new Date(Date.now() - 1000) }, { where: { token: body.pedido.token } });
      assert.ok((await vencerPendientes()) >= 1);
      const p = await db.Pedido.findOne({ where: { token: body.pedido.token } });
      assert.equal(p.estado, 'cancelado');
      assert.equal(p.motivoCancelacion, 'Vencido sin pago');
      assert.equal(await stock(talleM), 3);
    });

    it('un pago que llega tarde vuelve a reservar el stock si hay', async () => {
      await setStock(talleM, 3);
      const { body } = await comprar({ metodoPago: 'mercadopago', items: [{ varianteId: talleM.id, cantidad: 1 }] });
      const p = await db.Pedido.findOne({ where: { token: body.pedido.token } });
      await p.update({ venceAt: new Date(Date.now() - 1000) });
      await vencerPendientes();
      assert.equal(await stock(talleM), 3);
      mp.pagos.set('950', { id: 950, status: 'approved', external_reference: String(p.id), transaction_amount: 40000, currency_id: 'ARS' });
      await webhook('950').expect(200);
      await p.reload();
      assert.equal(p.estado, 'pagado');
      assert.equal(await stock(talleM), 2);
    });

    it('si el pago tardío no tiene stock, queda pagado con una alerta interna', async () => {
      await setStock(talleM, 1);
      const { body } = await comprar({ metodoPago: 'mercadopago', items: [{ varianteId: talleM.id, cantidad: 1 }] });
      const p = await db.Pedido.findOne({ where: { token: body.pedido.token } });
      await p.update({ venceAt: new Date(Date.now() - 1000) });
      await vencerPendientes();
      await setStock(talleM, 0); // otro cliente compró la última unidad
      mp.pagos.set('951', { id: 951, status: 'approved', external_reference: String(p.id), transaction_amount: 40000, currency_id: 'ARS' });
      await webhook('951').expect(200);
      await p.reload();
      assert.equal(p.estado, 'pagado');
      assert.match(p.notasInternas, /no hay stock/);
      assert.equal(await stock(talleM), 0);
    });
  });

  describe('administración de pedidos', () => {
    let pedido;

    before(async () => {
      await setStock(talleM, 5);
      const { body } = await comprar({ items: [{ varianteId: talleM.id, cantidad: 2 }] });
      pedido = await db.Pedido.findOne({ where: { token: body.pedido.token } });
    });

    const cambiar = (estado, motivo) =>
      request(app).patch(`/api/admin/pedidos/${pedido.id}/estado`).set(headers.admin).send({ estado, motivo });

    it('solo administradores', async () => {
      assert.equal((await request(app).get('/api/admin/pedidos')).status, 401);
      assert.equal((await request(app).get('/api/admin/pedidos').set(headers.operador)).status, 403);
    });

    it('lista, busca por número o email y filtra por estado', async () => {
      const todos = await request(app).get('/api/admin/pedidos').set(headers.admin);
      assert.ok(todos.body.length > 1);
      const porNumero = await request(app).get(`/api/admin/pedidos?q=P-${String(pedido.id).padStart(6, '0')}`).set(headers.admin);
      assert.deepEqual(porNumero.body.map((p) => p.id), [pedido.id]);
      const porEstado = await request(app).get('/api/admin/pedidos?estado=cancelado').set(headers.admin);
      assert.ok(porEstado.body.every((p) => p.estado === 'cancelado'));
    });

    it('sigue el circuito de estados y rechaza saltos inválidos', async () => {
      assert.equal((await cambiar('enviado')).status, 409);
      const pagado = await cambiar('pagado');
      assert.equal(pagado.status, 200);
      assert.equal(pagado.body.estado, 'pagado');
      assert.ok(pagado.body.pagadoAt);
      assert.equal((await cambiar('en_preparacion')).body.estado, 'en_preparacion');
      assert.equal((await cambiar('enviado')).status, 400, 'es un pedido de retiro');
      const listo = await cambiar('listo_para_retirar');
      assert.deepEqual(listo.body.transicionesPosibles, ['entregado', 'cancelado']);
      assert.equal((await cambiar('entregado')).body.estado, 'entregado');
      assert.equal((await cambiar('cancelado')).status, 409);
    });

    it('cancelar devuelve el stock', async () => {
      await setStock(talleM, 5);
      const { body } = await comprar({ items: [{ varianteId: talleM.id, cantidad: 3 }] });
      const p = await db.Pedido.findOne({ where: { token: body.pedido.token } });
      assert.equal(await stock(talleM), 2);
      const res = await request(app).patch(`/api/admin/pedidos/${p.id}/estado`).set(headers.admin)
        .send({ estado: 'cancelado', motivo: 'Pedido duplicado' });
      assert.equal(res.status, 200);
      assert.equal(res.body.motivoCancelacion, 'Pedido duplicado');
      assert.equal(await stock(talleM), 5);
    });

    it('guarda notas internas y devuelve el resumen', async () => {
      const notas = await request(app).patch(`/api/admin/pedidos/${pedido.id}`).set(headers.admin).send({ notasInternas: 'Retira el padre' });
      assert.equal(notas.body.notasInternas, 'Retira el padre');
      const resumen = await request(app).get('/api/admin/pedidos/resumen').set(headers.admin);
      assert.equal(resumen.status, 200);
      assert.ok(resumen.body.porEstado.cancelado >= 1);
      assert.ok(resumen.body.mes.total > 0);
    });

    it('borrar un producto no rompe los pedidos existentes', async () => {
      const otro = await request(app).post('/api/productos').set(headers.admin).send({
        nombre: 'Buzo temporal', precio: 1000, categoriaId: producto.categoriaId, colegioId: producto.colegioId,
        variantes: [{ talle: 'U', stock: 5 }],
      });
      const { body } = await comprar({ items: [{ varianteId: otro.body.variantes[0].id, cantidad: 1 }] });
      await request(app).delete(`/api/productos/${otro.body.id}`).set(headers.admin).expect(200);
      const res = await request(app).get(`/api/pedidos/${body.pedido.token}`);
      assert.equal(res.body.items[0].nombreProducto, 'Buzo temporal');
      const p = await db.Pedido.findOne({ where: { token: body.pedido.token } });
      const cancelado = await request(app).patch(`/api/admin/pedidos/${p.id}/estado`).set(headers.admin).send({ estado: 'cancelado' });
      assert.equal(cancelado.status, 200, 'cancelar sin variante existente no debe fallar');
    });
  });
});
