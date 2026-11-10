// Galería de buzos de egresados: optimiza las fotos (WebP en dos tamaños, sin datos EXIF/GPS)
// y las sirve en /api/egresados/galeria/img para que el sitio de egresados las tome sin redeployar.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const ENV = require('../config/env');
const { AppError } = require('../utils/errorHandler');

const DIR = path.join(ENV.UPLOADS_DIR, 'egresados-galeria');
const URL_BASE = '/api/egresados/galeria/img';
const GRANDE = 1600;
const MINI = 640;
const TIPOS = { promo: 'Promos reales', diseno: 'Diseños' };

fs.mkdirSync(DIR, { recursive: true });

const rutas = (archivo) => ({
  grande: path.join(DIR, `${archivo}-${GRANDE}.webp`),
  mini: path.join(DIR, `${archivo}-${MINI}.webp`),
});

// Recibe la imagen original (buffer) y guarda las versiones optimizadas. Devuelve { archivo, ancho, alto }.
async function procesarFoto(buffer) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new AppError('El archivo no es una imagen válida (usá JPG, PNG, WEBP o AVIF).', 400);
  }
  if (!['jpeg', 'png', 'webp', 'avif', 'heif'].includes(meta.format)) throw new AppError('Formato no soportado: usá JPG, PNG, WEBP o AVIF.', 400);
  // rotate() sin argumentos aplica la orientación de la cámara; sharp no copia EXIF (ni GPS) a la salida
  const base = sharp(buffer, { failOn: 'error' }).rotate();
  const archivo = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`;
  const r = rutas(archivo);
  try {
    const info = await base.clone().resize({ width: GRANDE, height: GRANDE, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(r.grande);
    await base.clone().resize({ width: MINI, height: MINI, fit: 'inside', withoutEnlargement: true }).webp({ quality: 74 }).toFile(r.mini);
    if (info.width < 200 || info.height < 200) {
      borrarArchivos(archivo);
      throw new AppError('La foto es muy chica (mínimo 200 px de lado).', 400);
    }
    return { archivo, ancho: info.width, alto: info.height };
  } catch (err) {
    borrarArchivos(archivo);
    if (err instanceof AppError) throw err;
    throw new AppError('No se pudo procesar la foto. Probá con otra o exportala como JPG.', 400);
  }
}

function borrarArchivos(archivo) {
  Object.values(rutas(archivo)).forEach((p) => fs.rmSync(p, { force: true }));
}

const serializarFoto = (f, { admin = false } = {}) => ({
  ...(admin ? { id: f.id, visible: f.visible, orden: f.orden, tipoClave: f.tipo, creadaEl: f.createdAt } : {}),
  foto: `${URL_BASE}/${f.archivo}-${GRANDE}.webp`,
  mini: `${URL_BASE}/${f.archivo}-${MINI}.webp`,
  ancho: f.ancho,
  alto: f.alto,
  tipo: TIPOS[f.tipo],
  anio: f.anio || '',
  colegio: f.colegio || '',
  alt: f.alt || '',
  diseno: f.diseno || '',
});

module.exports = { procesarFoto, borrarArchivos, serializarFoto, DIR_GALERIA: DIR, URL_GALERIA: URL_BASE, TIPOS_FOTO: TIPOS };
