// Diseños guardados desde el diseñador de egresados y pedidos de presupuesto con el diseño adjunto.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ENV = require('../config/env');
const { EgrDiseno } = require('../models');
const { AppError } = require('../utils/errorHandler');
const { enviarMail, mailConfigurado } = require('./mail');

const DIR = path.join(ENV.PRIVADO_DIR, 'disenos');
fs.mkdirSync(DIR, { recursive: true });

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
const nuevoCodigo = () => Array.from({ length: 8 }, () => ALFABETO[crypto.randomInt(ALFABETO.length)]).join('');

const linkDiseno = (codigo) => `${ENV.EGRESADOS_URL}/d/${codigo}`;
const imagenDiseno = (codigo) => `${ENV.EGRESADOS_URL}/api/egresados/d/${codigo}/imagen.png`;
const rutaImagen = (archivo) => path.join(DIR, path.basename(archivo));

const serializarDiseno = (d) => ({
  codigo: d.codigo,
  titulo: d.titulo,
  link: linkDiseno(d.codigo),
  imagen: imagenDiseno(d.codigo),
  creadoEl: d.createdAt,
});

const esPng = (buf) => buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const TIPOS_PRENDA = ['canguro', 'cierre', 'campera', 'chomba', 'remera'];

// Guarda un diseño: la configuración (para volver a abrirlo) y la imagen que arma el diseñador
async function guardarDiseno({ imagen, config, titulo }) {
  if (!imagen || !esPng(imagen)) throw new AppError('La imagen del diseño no es válida.', 400);
  let datos;
  try {
    datos = typeof config === 'string' ? JSON.parse(config) : config;
  } catch {
    throw new AppError('El diseño no es válido.', 400);
  }
  if (!datos || typeof datos !== 'object' || !TIPOS_PRENDA.includes(datos.type) || !Array.isArray(datos.elements)) {
    throw new AppError('El diseño no es válido.', 400);
  }
  // Las imágenes subidas por el usuario ya van dentro del PNG: no se guardan en la configuración
  datos.elements = datos.elements.filter((e) => e && e.kind !== 'img').slice(0, 40);

  let codigo = nuevoCodigo();
  while (await EgrDiseno.findOne({ where: { codigo } })) codigo = nuevoCodigo();
  const archivo = `${codigo}.png`;
  fs.writeFileSync(rutaImagen(archivo), imagen);
  try {
    return await EgrDiseno.create({ codigo, config: datos, imagen: archivo, titulo: titulo ? String(titulo).slice(0, 160) : null });
  } catch (err) {
    fs.rmSync(rutaImagen(archivo), { force: true });
    throw err;
  }
}

const escapar = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Página mínima para el link compartido: WhatsApp toma la imagen del diseño como vista previa
function paginaDiseno(diseno) {
  const titulo = `${diseno.titulo || 'Diseño de egresados'} | Paletta Egresados`;
  const destino = `${ENV.EGRESADOS_URL}/disena.html#dz=${diseno.codigo}`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${escapar(titulo)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Paletta Egresados">
<meta property="og:title" content="${escapar(titulo)}">
<meta property="og:description" content="Mirá este diseño armado en el diseñador de Paletta Egresados y abrilo para editarlo.">
<meta property="og:image" content="${imagenDiseno(diseno.codigo)}">
<meta property="og:image:width" content="1800"><meta property="og:image:height" content="1200">
<meta property="og:url" content="${linkDiseno(diseno.codigo)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${escapar(destino)}">
</head><body style="font-family:sans-serif;background:#F5F1E8;color:#0E0E12;text-align:center;padding:40px">
<p>Abriendo el diseño…</p><p><a href="${escapar(destino)}">Abrir en el diseñador de Paletta Egresados</a></p>
<img src="${imagenDiseno(diseno.codigo)}" alt="" style="max-width:100%;border-radius:16px">
</body></html>`;
}

// Aviso a Paletta de un pedido de presupuesto nuevo
function avisarPresupuesto(presupuesto, diseno, promo) {
  if (!mailConfigurado() || !ENV.CONTACT_TO) return Promise.resolve(false);
  const lineas = [
    `Nombre: ${presupuesto.nombre}`,
    `WhatsApp: ${presupuesto.telefono}`,
    presupuesto.email ? `Email: ${presupuesto.email}` : null,
    `Colegio: ${presupuesto.colegio}${presupuesto.curso ? ` · ${presupuesto.curso}` : ''}${presupuesto.anio ? ` · Promo ${presupuesto.anio}` : ''}`,
    presupuesto.cantidad ? `Cantidad aproximada: ${presupuesto.cantidad}` : null,
    promo ? `Promo existente: ${promo.codigo} (${promo.colegio} ${promo.curso}) — el diseño quedó adjunto` : null,
    presupuesto.mensaje ? `Mensaje: ${presupuesto.mensaje}` : null,
    `Diseño: ${diseno.titulo || ''} ${linkDiseno(diseno.codigo)}`,
  ].filter(Boolean);
  return enviarMail({
    to: ENV.CONTACT_TO,
    replyTo: presupuesto.email || undefined,
    subject: `Pedido de presupuesto desde el diseñador - ${presupuesto.colegio}`,
    text: `${lineas.join('\n')}\n\nLo ves en el panel → Egresados → Presupuestos.`,
    html: `<p>${lineas.map(escapar).join('<br>')}</p><p><img src="${imagenDiseno(diseno.codigo)}" alt="Diseño" style="max-width:600px;border-radius:12px"></p><p>Lo ves en el panel → Egresados → Presupuestos.</p>`,
  }).then(() => true);
}

module.exports = { guardarDiseno, serializarDiseno, paginaDiseno, rutaImagen, linkDiseno, imagenDiseno, avisarPresupuesto, esPng };
