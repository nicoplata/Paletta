const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const ENV = require('./config/env');
const { sequelize } = require('./models');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', /^\d+$/.test(ENV.TRUST_PROXY) ? Number(ENV.TRUST_PROXY) : ENV.TRUST_PROXY);

app.use(helmet({
  // Las imágenes se sirven a un frontend que puede estar en otro origen
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// El portal de familias se sirve desde el sitio de egresados (mismo backend vía nginx)
const origenesPermitidos = [...ENV.CORS_ORIGINS, ENV.EGRESADOS_URL];

app.use(cors({
  origin(origin, callback) {
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    callback(new Error('No permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

if (!ENV.isTest) app.use(morgan(ENV.isProd ? 'combined' : 'dev'));

app.use(express.json({ limit: '100kb' }));

// 📁 Archivos públicos
const estaticos = { maxAge: ENV.isProd ? '7d' : 0, index: false };
app.use('/uploads', express.static(ENV.UPLOADS_DIR, estaticos));
// Galería de egresados (WebP optimizados, nombre único por foto: se pueden cachear mucho tiempo)
const { DIR_GALERIA, URL_GALERIA } = require('./services/galeriaEgresados');
app.use(URL_GALERIA, express.static(DIR_GALERIA, { maxAge: ENV.isProd ? '365d' : 0, immutable: ENV.isProd, index: false }));
const { DIR_INSTAGRAM, URL_INSTAGRAM } = require('./services/instagram');
app.use(URL_INSTAGRAM, express.static(DIR_INSTAGRAM, { maxAge: ENV.isProd ? '30d' : 0, index: false }));
app.use('/imagenes', express.static(path.join(__dirname, '..', 'public', 'imagenes'), estaticos));

// ❤️ Healthcheck (para monitoreo / balanceador)
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// 🔎 SEO: sitemap y páginas con metadatos (fuera de /api y sin rate limit de la API)
app.use(require('./routes/seo'));

// 🔌 API
app.use('/api', apiLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/colegios', require('./routes/colegios'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/imagenes', require('./routes/imagenes'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/contacto', require('./routes/contacto'));
app.use('/api/admin/pedidos', require('./routes/pedidosAdmin'));
app.use('/api/admin/egresados', require('./routes/egresadosAdmin'));
app.use('/api/admin/produccion', require('./routes/produccionAdmin'));
app.use('/api/egresados', require('./routes/egresados'));
app.use('/api/egresados', require('./routes/disenosEgresados'));
app.use('/api/admin', require('./routes/tiendaAdmin'));
app.use('/api', require('./routes/tienda'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
