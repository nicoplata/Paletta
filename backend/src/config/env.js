require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env'), quiet: true });
const crypto = require('crypto');
const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (isProd) {
    throw new Error('JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres.');
  }
  // En desarrollo se genera uno aleatorio: los tokens se invalidan al reiniciar.
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  if (!isTest) {
    console.warn('[env] JWT_SECRET no definido: usando uno aleatorio solo para desarrollo.');
  }
}

const lista = (valor, porDefecto) =>
  (valor || porDefecto)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const ENV = {
  NODE_ENV,
  isProd,
  isTest,
  PORT: Number(process.env.PORT) || 3000,

  // Base de datos (DATABASE_URL tiene prioridad sobre las variables sueltas)
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'paletta',
  DB_USER: process.env.DB_USER || 'paletta',
  DB_PASSWORD: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  DB_SSL: process.env.DB_SSL === 'true',

  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  CORS_ORIGINS: lista(process.env.CORS_ORIGINS, 'http://localhost:5173'),
  TRUST_PROXY: process.env.TRUST_PROXY || (isProd ? '1' : '0'),

  UPLOAD_MAX_MB: Number(process.env.UPLOAD_MAX_MB) || 5,
  UPLOADS_DIR: path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'public', 'uploads')),

  // Mail (opcional): si no se configura, los mensajes de contacto solo se guardan en la base.
  MAIL_HOST: process.env.MAIL_HOST,
  MAIL_PORT: Number(process.env.MAIL_PORT) || 587,
  MAIL_SECURE: process.env.MAIL_SECURE === 'true',
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,
  MAIL_FROM: process.env.MAIL_FROM || process.env.MAIL_USER,
  CONTACT_TO: process.env.CONTACT_TO,

  // URL pública del sitio (para links en mails y redirecciones de Mercado Pago)
  SITE_URL: (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  // Sitio de egresados (links del portal de familias: <EGRESADOS_URL>/mi-promo/<slug>)
  EGRESADOS_URL: (process.env.EGRESADOS_URL || 'https://egresados.paletta.com.ar').replace(/\/$/, ''),

  // Build del frontend (para inyectar metadatos de SEO en /producto/:id y /colegios/:id/productos)
  FRONTEND_DIST: path.resolve(process.env.FRONTEND_DIST || path.join(__dirname, '..', '..', '..', 'frontend', 'dist')),

  // Tienda online
  TIENDA_HABILITADA: process.env.TIENDA_HABILITADA === 'true',
  ENVIO_COSTO: Number(process.env.ENVIO_COSTO) || 0,
  // Envío gratis a partir de este subtotal (0 = desactivado)
  ENVIO_GRATIS_DESDE: Number(process.env.ENVIO_GRATIS_DESDE) || 0,
  ENVIO_HABILITADO: process.env.ENVIO_HABILITADO !== 'false',
  RETIRO_DIRECCION: process.env.RETIRO_DIRECCION || 'Av. Vélez Sarsfield 4270, Munro, Vicente López, Buenos Aires',
  PEDIDO_VENCIMIENTO_MP_MIN: Number(process.env.PEDIDO_VENCIMIENTO_MP_MIN) || 60,
  PEDIDO_VENCIMIENTO_TRANSFERENCIA_HS: Number(process.env.PEDIDO_VENCIMIENTO_TRANSFERENCIA_HS) || 48,
  MAX_UNIDADES_POR_ITEM: Number(process.env.MAX_UNIDADES_POR_ITEM) || 50,
  PEDIDOS_POR_HORA: Number(process.env.PEDIDOS_POR_HORA) || 20,
  CUPONES_POR_10MIN: Number(process.env.CUPONES_POR_10MIN) || 15,

  // Mercado Pago (Checkout Pro). Sin MP_ACCESS_TOKEN el método no se ofrece.
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
  MP_API_URL: process.env.MP_API_URL || 'https://api.mercadopago.com',

  // Transferencia bancaria. Sin TRANSFERENCIA_ALIAS ni TRANSFERENCIA_CBU el método no se ofrece.
  TRANSFERENCIA_ALIAS: process.env.TRANSFERENCIA_ALIAS,
  TRANSFERENCIA_CBU: process.env.TRANSFERENCIA_CBU,
  TRANSFERENCIA_TITULAR: process.env.TRANSFERENCIA_TITULAR,
  TRANSFERENCIA_BANCO: process.env.TRANSFERENCIA_BANCO,
};

module.exports = ENV;
