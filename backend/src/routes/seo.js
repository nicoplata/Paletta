const express = require('express');
const { generarSitemap, renderizar } = require('../services/seo');

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await generarSitemap());
});

// Páginas de la SPA con metadatos propios. nginx las envía al backend y, si el backend
// no responde, cae al index.html estático (ver deploy/nginx.conf).
const paginaSpa = (tipo) => async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next();
  try {
    const { status, html } = await renderizar(tipo, id);
    // Mismo comportamiento que el index.html estático que sirve nginx (sin CSP de helmet,
    // que bloquearía el mapa de Google y otros recursos de la SPA).
    res.removeHeader('Content-Security-Policy');
    res.status(status).type('html').set('Cache-Control', 'no-cache').send(html);
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(503).json({ error: 'Frontend no compilado' });
    next(err);
  }
};

router.get('/producto/:id', paginaSpa('producto'));
router.get('/colegios/:id/productos', paginaSpa('colegio'));

module.exports = router;
