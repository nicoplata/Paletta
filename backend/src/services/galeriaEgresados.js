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

// Por debajo de este lado la foto se considera de baja resolución: se amplía con un filtro de calidad
// (Lanczos) y un enfoque suave, y se guarda con más calidad para que no se note el pixelado al mostrarla
const LADO_BAJA = 1000;
const AMPLIAR_HASTA = 1200;
const DIR_ORIGINALES = path.join(ENV.PRIVADO_DIR, 'galeria-originales');
fs.mkdirSync(DIR_ORIGINALES, { recursive: true });
const EXT = { jpeg: '.jpg', png: '.png', webp: '.webp', avif: '.avif', heif: '.heic' };

// Recibe la imagen original (buffer) y guarda las versiones optimizadas y el original.
// Devuelve { archivo, ancho, alto, original, anchoOriginal, altoOriginal }.
async function procesarFoto(buffer, { guardarOriginal = true } = {}) {
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
    const { data: girada, info: orig } = await base.clone().toBuffer({ resolveWithObject: true });
    if (orig.width < 200 || orig.height < 200) throw new AppError('La foto es muy chica (mínimo 200 px de lado).', 400);
    const lado = Math.max(orig.width, orig.height);
    const baja = lado < LADO_BAJA;
    // Las fotos chicas suelen venir recortadas con un borde oscuro: se descartan 3 px de cada lado
    const fuente = baja
      ? sharp(girada).extract({ left: 3, top: 3, width: orig.width - 6, height: orig.height - 6 })
      : base;
    // Fotos chicas: se amplían hasta el doble (máx. 1200 px) con Lanczos + enfoque; las grandes solo se achican
    const destino = baja ? Math.min(lado * 2, AMPLIAR_HASTA) : GRANDE;
    const grande = await fuente.clone()
      .resize({ width: destino, height: destino, fit: 'inside', withoutEnlargement: !baja, kernel: 'lanczos3' })
      .sharpen(baja ? { sigma: 0.6, m1: 0.8, m2: 2 } : { sigma: 0.4 })
      .webp({ quality: baja ? 90 : 82, smartSubsample: true, effort: 5 })
      .toFile(r.grande);
    await fuente.clone()
      .resize({ width: MINI, height: MINI, fit: 'inside', withoutEnlargement: false, kernel: 'lanczos3' })
      .sharpen({ sigma: 0.5 })
      .webp({ quality: baja ? 88 : 78, smartSubsample: true, effort: 5 })
      .toFile(r.mini);
    let original = null;
    if (guardarOriginal) {
      original = `${archivo}${EXT[meta.format] || '.img'}`;
      fs.writeFileSync(path.join(DIR_ORIGINALES, original), buffer);
    }
    return { archivo, ancho: grande.width, alto: grande.height, original, anchoOriginal: orig.width, altoOriginal: orig.height };
  } catch (err) {
    borrarArchivos(archivo);
    if (err instanceof AppError) throw err;
    throw new AppError('No se pudo procesar la foto. Probá con otra o exportala como JPG.', 400);
  }
}

const rutaOriginal = (nombre) => (nombre ? path.join(DIR_ORIGINALES, path.basename(nombre)) : null);
const esBajaResolucion = (f) => Math.max(f.anchoOriginal || f.ancho, f.altoOriginal || f.alto) < LADO_BAJA;

function borrarArchivos(archivo) {
  Object.values(rutas(archivo)).forEach((p) => fs.rmSync(p, { force: true }));
}

const serializarFoto = (f, { admin = false } = {}) => ({
  ...(admin ? {
    id: f.id, visible: f.visible, orden: f.orden, tipoClave: f.tipo, creadaEl: f.createdAt,
    anchoOriginal: f.anchoOriginal || f.ancho, altoOriginal: f.altoOriginal || f.alto, bajaResolucion: esBajaResolucion(f),
  } : {}),
  // El sitio la muestra como mucho al doble de su tamaño real (para que no se pixele)
  maxAncho: (f.anchoOriginal || f.ancho) * 2,
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

module.exports = {
  procesarFoto, borrarArchivos, serializarFoto, rutaOriginal, esBajaResolucion, DIR_GALERIA: DIR, URL_GALERIA: URL_BASE, TIPOS_FOTO: TIPOS,
};
