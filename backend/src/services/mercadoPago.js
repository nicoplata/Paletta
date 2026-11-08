// Cliente mínimo de la API de Mercado Pago (Checkout Pro) usando fetch.
// Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro
const crypto = require('crypto');
const ENV = require('../config/env');
const { AppError } = require('../utils/errorHandler');

const configurado = () => Boolean(ENV.MP_ACCESS_TOKEN);

async function llamar(metodo, ruta, cuerpo, { idempotencyKey } = {}) {
  const headers = {
    Authorization: `Bearer ${ENV.MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`${ENV.MP_API_URL}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[mercadopago] ${metodo} ${ruta} -> ${res.status}`, data?.message || data);
    throw new AppError('No se pudo comunicar con Mercado Pago. Intentá nuevamente.', 502);
  }
  return data;
}

// Ítems de la preferencia. Mercado Pago no admite ítems negativos: si hay descuento,
// se manda un único ítem con el total de productos ya descontado (así el total coincide).
function itemsParaMp(pedido, items) {
  if (pedido.descuento > 0) {
    const unidades = items.reduce((acc, it) => acc + it.cantidad, 0);
    return [{
      id: `pedido-${pedido.id}`,
      title: `Pedido P-${String(pedido.id).padStart(6, '0')} (${unidades} prenda${unidades === 1 ? '' : 's'}, cupón ${pedido.cuponCodigo})`,
      quantity: 1,
      unit_price: Math.round((pedido.subtotal - pedido.descuento) * 100) / 100,
      currency_id: 'ARS',
    }];
  }
  return items.map((it) => ({
    id: String(it.varianteId),
    title: `${it.nombreProducto} - Talle ${it.talle}`,
    quantity: it.cantidad,
    unit_price: it.precioUnitario,
    currency_id: 'ARS',
  }));
}

// Crea la preferencia de pago para un pedido y devuelve { id, init_point }.
async function crearPreferencia(pedido, items) {
  if (!configurado()) throw new AppError('Mercado Pago no está configurado', 503);
  const urlPedido = `${ENV.SITE_URL}/pedido/${pedido.token}`;
  const preferencia = {
    external_reference: String(pedido.id),
    items: itemsParaMp(pedido, items),
    payer: { name: pedido.nombre, email: pedido.email },
    back_urls: { success: urlPedido, pending: urlPedido, failure: urlPedido },
    statement_descriptor: 'PALETTA',
    expires: true,
    expiration_date_to: new Date(pedido.venceAt).toISOString(),
  };
  // Mercado Pago rechaza notification_url y auto_return con URLs locales (http://localhost).
  // En local el pago se confirma igual al volver a la página del pedido (verificar-pago).
  if (ENV.SITE_URL.startsWith('https://')) {
    preferencia.auto_return = 'approved';
    preferencia.notification_url = `${ENV.SITE_URL}/api/pagos/webhook`;
  }
  if (pedido.costoEnvio > 0) {
    preferencia.items.push({ id: 'envio', title: 'Envío a domicilio', quantity: 1, unit_price: pedido.costoEnvio, currency_id: 'ARS' });
  }
  return llamar('POST', '/checkout/preferences', preferencia, { idempotencyKey: `pref-${pedido.token}-${Date.now()}` });
}

const obtenerPago = (paymentId) => llamar('GET', `/v1/payments/${encodeURIComponent(paymentId)}`);

// Verifica la firma del webhook (header x-signature: "ts=...,v1=...").
// Manifest: id:{data.id};request-id:{x-request-id};ts:{ts};
function verificarFirma({ firma, requestId, dataId }) {
  if (!ENV.MP_WEBHOOK_SECRET) return !ENV.isProd; // en producción la firma es obligatoria
  if (!firma) return false;
  const partes = Object.fromEntries(
    firma.split(',').map((p) => p.split('=').map((x) => x.trim())).filter((p) => p.length === 2)
  );
  if (!partes.ts || !partes.v1) return false;
  let manifest = '';
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${partes.ts};`;
  const esperado = crypto.createHmac('sha256', ENV.MP_WEBHOOK_SECRET).update(manifest).digest('hex');
  const a = Buffer.from(esperado);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { configurado, crearPreferencia, obtenerPago, verificarFirma };
