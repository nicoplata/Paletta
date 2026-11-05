// Mails transaccionales de la tienda. Nunca bloquean ni hacen fallar el flujo del pedido.
const ENV = require('../config/env');
const { enviarMail, mailConfigurado } = require('./mail');

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pesos = (n) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const numero = (p) => `P-${String(p.id).padStart(6, '0')}`;
const urlPedido = (p) => `${ENV.SITE_URL}/pedido/${p.token}`;

const ESTADOS_TEXTO = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pago confirmado',
  en_preparacion: 'En preparación',
  listo_para_retirar: 'Listo para retirar',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

function tablaItems(pedido) {
  const filas = (pedido.items || []).map((it) => `
    <tr>
      <td style="padding:6px 0">${esc(it.nombreProducto)}${it.colegio ? ` · ${esc(it.colegio)}` : ''}<br><small>Talle ${esc(it.talle)} × ${it.cantidad}</small></td>
      <td style="padding:6px 0;text-align:right">${pesos(it.subtotal)}</td>
    </tr>`).join('');
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${filas}
      ${pedido.costoEnvio > 0 ? `<tr><td style="padding:6px 0">Envío</td><td style="text-align:right">${pesos(pedido.costoEnvio)}</td></tr>` : ''}
      <tr><td style="padding:8px 0;border-top:1px solid #ddd"><strong>Total</strong></td>
          <td style="padding:8px 0;border-top:1px solid #ddd;text-align:right"><strong>${pesos(pedido.total)}</strong></td></tr>
    </table>`;
}

const plantilla = (titulo, cuerpo) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <h2 style="color:#9c1f23">${esc(titulo)}</h2>
    ${cuerpo}
    <p style="color:#888;font-size:12px;margin-top:32px">Paletta · ${esc(ENV.RETIRO_DIRECCION)}</p>
  </div>`;

function enviar(opciones) {
  if (!mailConfigurado()) return;
  enviarMail(opciones).catch((err) => console.error('[mail pedido]', err.message));
}

function pedidoCreado(pedido, transferencia) {
  let instrucciones = '';
  if (pedido.metodoPago === 'transferencia') {
    instrucciones = `
      <p>Para confirmar tu pedido, transferí <strong>${pesos(pedido.total)}</strong> a:</p>
      <ul>
        ${transferencia.alias ? `<li>Alias: <strong>${esc(transferencia.alias)}</strong></li>` : ''}
        ${transferencia.cbu ? `<li>CBU: <strong>${esc(transferencia.cbu)}</strong></li>` : ''}
        ${transferencia.titular ? `<li>Titular: ${esc(transferencia.titular)}</li>` : ''}
        ${transferencia.banco ? `<li>Banco: ${esc(transferencia.banco)}</li>` : ''}
      </ul>
      <p>Indicá el número de pedido <strong>${numero(pedido)}</strong> en el concepto y respondé este mail con el comprobante.
      Reservamos el stock hasta el ${new Date(pedido.venceAt).toLocaleString('es-AR')}.</p>`;
  } else {
    instrucciones = `<p>Si todavía no completaste el pago, podés hacerlo desde <a href="${urlPedido(pedido)}">esta página</a>.</p>`;
  }

  enviar({
    to: pedido.email,
    replyTo: ENV.CONTACT_TO || undefined,
    subject: `Recibimos tu pedido ${numero(pedido)}`,
    html: plantilla(`¡Gracias, ${pedido.nombre}!`, `
      <p>Recibimos tu pedido <strong>${numero(pedido)}</strong>.</p>
      ${tablaItems(pedido)}
      ${instrucciones}
      <p>Podés seguir el estado en <a href="${urlPedido(pedido)}">${urlPedido(pedido)}</a>.</p>`),
  });
}

function pedidoPagado(pedido) {
  enviar({
    to: pedido.email,
    subject: `Pago confirmado - pedido ${numero(pedido)}`,
    html: plantilla('¡Pago confirmado!', `
      <p>Confirmamos el pago de tu pedido <strong>${numero(pedido)}</strong>. Ya lo estamos preparando.</p>
      ${tablaItems(pedido)}
      <p>Te avisamos cuando esté ${pedido.tipoEntrega === 'retiro' ? 'listo para retirar' : 'en camino'}.
      Seguimiento: <a href="${urlPedido(pedido)}">${urlPedido(pedido)}</a></p>`),
  });

  if (ENV.CONTACT_TO) {
    enviar({
      to: ENV.CONTACT_TO,
      subject: `🛒 Nuevo pedido pagado ${numero(pedido)} - ${pesos(pedido.total)}`,
      html: plantilla(`Pedido ${numero(pedido)} pagado`, `
        <p>${esc(pedido.nombre)} · ${esc(pedido.email)} · ${esc(pedido.telefono)}</p>
        <p>Entrega: ${pedido.tipoEntrega === 'retiro' ? 'Retiro en local' : esc(`${pedido.direccion}, ${pedido.ciudad}`)}</p>
        ${tablaItems(pedido)}
        <p><a href="${ENV.SITE_URL}/admin/dashboard/pedidos/${pedido.id}">Ver en el panel</a></p>`),
    });
  }
}

function estadoActualizado(pedido) {
  const mensajes = {
    listo_para_retirar: `Tu pedido está listo para retirar en ${esc(ENV.RETIRO_DIRECCION)}.`,
    enviado: 'Tu pedido fue despachado y está en camino.',
    entregado: '¡Tu pedido fue entregado! Gracias por tu compra.',
    cancelado: `Tu pedido fue cancelado${pedido.motivoCancelacion ? ` (${esc(pedido.motivoCancelacion)})` : ''}. Si tenés dudas, respondé este mail.`,
  };
  if (!mensajes[pedido.estado]) return;
  enviar({
    to: pedido.email,
    replyTo: ENV.CONTACT_TO || undefined,
    subject: `Pedido ${numero(pedido)}: ${ESTADOS_TEXTO[pedido.estado]}`,
    html: plantilla(ESTADOS_TEXTO[pedido.estado], `<p>${mensajes[pedido.estado]}</p><p><a href="${urlPedido(pedido)}">Ver pedido</a></p>`),
  });
}

module.exports = { pedidoCreado, pedidoPagado, estadoActualizado, ESTADOS_TEXTO };
