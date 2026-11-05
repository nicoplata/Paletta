// SEO del lado del servidor:
//  - sitemap.xml dinámico con productos y colegios activos
//  - index.html con metadatos propios para /producto/:id y /colegios/:id/productos,
//    así WhatsApp, Facebook y los buscadores ven título, descripción e imagen correctos
//    sin ejecutar JavaScript.
const fs = require('fs/promises');
const path = require('path');
const ENV = require('../config/env');
const { Producto, Colegio, Categoria, Imagen, Variante } = require('../models');

const PAGINAS_FIJAS = ['/', '/productos', '/colegios', '/egresados', '/contacto'];

const escHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escXml = escHtml;

const absoluta = (url) => (/^https?:\/\//.test(url) ? url : `${ENV.SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);
const resumir = (texto, max = 160) => {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1).trimEnd()}…` : limpio;
};
const fecha = (d) => new Date(d).toISOString().slice(0, 10);

async function generarSitemap() {
  const [colegios, productos] = await Promise.all([
    Colegio.findAll({ where: { activo: true }, attributes: ['id', 'updatedAt'] }),
    Producto.findAll({
      where: { activo: true },
      attributes: ['id', 'updatedAt'],
      include: [{ model: Colegio, as: 'colegio', attributes: [], where: { activo: true } }],
    }),
  ]);

  const urls = [
    ...PAGINAS_FIJAS.map((ruta) => ({ loc: `${ENV.SITE_URL}${ruta}`, prioridad: ruta === '/' ? '1.0' : '0.8' })),
    ...colegios.map((c) => ({ loc: `${ENV.SITE_URL}/colegios/${c.id}/productos`, lastmod: fecha(c.updatedAt), prioridad: '0.7' })),
    ...productos.map((p) => ({ loc: `${ENV.SITE_URL}/producto/${p.id}`, lastmod: fecha(p.updatedAt), prioridad: '0.6' })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.prioridad}</priority></url>`).join('\n')}
</urlset>
`;
}

// --- index.html con metadatos ---

let cache = { mtimeMs: 0, html: null };

async function leerIndex() {
  const ruta = path.join(ENV.FRONTEND_DIST, 'index.html');
  const stat = await fs.stat(ruta);
  if (stat.mtimeMs !== cache.mtimeMs) {
    cache = { mtimeMs: stat.mtimeMs, html: await fs.readFile(ruta, 'utf8') };
  }
  return cache.html;
}

function reemplazarMeta(html, atributo, clave, valor) {
  const re = new RegExp(`(<meta\\s+${atributo}="${clave}"\\s+content=")[^"]*(")`);
  return re.test(html)
    ? html.replace(re, `$1${escHtml(valor)}$2`)
    : html.replace('</head>', `  <meta ${atributo}="${clave}" content="${escHtml(valor)}" />\n  </head>`);
}

function aplicarMetadatos(html, { titulo, descripcion, url, imagen, tipo = 'website', jsonLd }) {
  let salida = html.replace(/<title>[^<]*<\/title>/, `<title>${escHtml(titulo)}</title>`);
  salida = salida.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${escHtml(url)}$2`);
  salida = reemplazarMeta(salida, 'name', 'description', descripcion);
  salida = reemplazarMeta(salida, 'property', 'og:title', titulo);
  salida = reemplazarMeta(salida, 'property', 'og:description', descripcion);
  salida = reemplazarMeta(salida, 'property', 'og:url', url);
  salida = reemplazarMeta(salida, 'property', 'og:type', tipo);
  salida = reemplazarMeta(salida, 'name', 'twitter:title', titulo);
  salida = reemplazarMeta(salida, 'name', 'twitter:description', descripcion);
  if (imagen) {
    salida = reemplazarMeta(salida, 'property', 'og:image', imagen);
    salida = reemplazarMeta(salida, 'name', 'twitter:image', imagen);
    // Las fotos de producto no son 1200x630: quitamos las dimensiones fijas de la imagen por defecto
    salida = salida.replace(/\s*<meta\s+property="og:image:(width|height)"\s+content="[^"]*"\s*\/?>/g, '');
  }
  if (jsonLd) {
    // "<" escapado para que el JSON no pueda cerrar el <script>
    const json = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
    salida = salida.replace('</head>', `  <script type="application/ld+json">${json}</script>\n  </head>`);
  }
  return salida;
}

async function metadatosProducto(id) {
  const p = await Producto.findOne({
    where: { id, activo: true },
    include: [
      { model: Colegio, as: 'colegio', attributes: ['id', 'nombre', 'activo'] },
      { model: Categoria, as: 'categoria', attributes: ['nombre'] },
      { model: Imagen, as: 'imagenes', attributes: ['url'] },
      { model: Variante, as: 'variantes', attributes: ['stock', 'activo'] },
    ],
    order: [[{ model: Imagen, as: 'imagenes' }, 'id', 'ASC']],
  });
  if (!p || p.colegio?.activo === false) return null;

  const url = `${ENV.SITE_URL}/producto/${p.id}`;
  const titulo = `${p.nombre}${p.colegio ? ` - ${p.colegio.nombre}` : ''} | Paletta`;
  const descripcion = resumir(`${p.nombre}${p.colegio ? ` del ${p.colegio.nombre}` : ''}. ${p.descripcion || 'Uniformes e indumentaria de Paletta.'}`);
  const imagenes = (p.imagenes || []).map((i) => absoluta(i.url));
  const stock = (p.variantes || []).filter((v) => v.activo).reduce((a, v) => a + v.stock, 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nombre,
    description: p.descripcion || undefined,
    image: imagenes.length ? imagenes : undefined,
    category: p.categoria?.nombre,
    brand: { '@type': 'Brand', name: 'Paletta' },
    sku: String(p.id),
  };
  if (ENV.TIENDA_HABILITADA) {
    jsonLd.offers = {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      price: Number(p.precio).toFixed(2),
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
    };
  }
  return { titulo, descripcion, url, imagen: imagenes[0], tipo: 'product', jsonLd };
}

async function metadatosColegio(id) {
  const c = await Colegio.findOne({
    where: { id, activo: true },
    include: [{ model: Imagen, as: 'imagenes', attributes: ['url'] }],
    order: [[{ model: Imagen, as: 'imagenes' }, 'id', 'ASC']],
  });
  if (!c) return null;
  const productos = await Producto.findAll({ where: { colegioId: c.id, activo: true }, attributes: ['nombre'], limit: 5, order: [['nombre', 'ASC']] });
  const lista = productos.map((p) => p.nombre).join(', ');
  return {
    titulo: `Uniformes ${c.nombre} | Paletta`,
    descripcion: resumir(`Uniformes y prendas de ${c.nombre}${c.ciudad ? ` (${c.ciudad})` : ''}${lista ? `: ${lista}` : ''}. Paletta, Munro.`),
    url: `${ENV.SITE_URL}/colegios/${c.id}/productos`,
    imagen: c.imagenes?.[0] ? absoluta(c.imagenes[0].url) : undefined,
  };
}

// Devuelve { status, html }. Si la entidad no existe, 404 con el index original
// (la SPA muestra "no encontrado" y los buscadores no indexan una página vacía).
async function renderizar(tipo, id) {
  const html = await leerIndex();
  const datos = tipo === 'producto' ? await metadatosProducto(id) : await metadatosColegio(id);
  if (!datos) {
    return { status: 404, html: reemplazarMeta(html, 'name', 'robots', 'noindex') };
  }
  return { status: 200, html: aplicarMetadatos(html, datos) };
}

module.exports = { generarSitemap, renderizar, aplicarMetadatos };
