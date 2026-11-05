require('dotenv').config();
const crypto = require('crypto');

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

  // Mail (opcional): si no se configura, los mensajes de contacto solo se guardan en la base.
  MAIL_HOST: process.env.MAIL_HOST,
  MAIL_PORT: Number(process.env.MAIL_PORT) || 587,
  MAIL_SECURE: process.env.MAIL_SECURE === 'true',
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,
  MAIL_FROM: process.env.MAIL_FROM || process.env.MAIL_USER,
  CONTACT_TO: process.env.CONTACT_TO,
};

module.exports = ENV;
