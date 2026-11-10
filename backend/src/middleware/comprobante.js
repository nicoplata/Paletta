// Subida de comprobantes de pago: carpeta privada, nombre aleatorio y verificación del contenido real
// (no alcanza con el tipo que declara el navegador).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ENV = require('../config/env');
const { AppError } = require('../utils/errorHandler');

const DIR = path.join(ENV.PRIVADO_DIR, 'comprobantes');

const MAX_MB = 6;
const TIPOS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Firma de los primeros bytes de cada formato
const FIRMAS = {
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

// Arma el middleware de subida para una carpeta privada (comprobantes, contratos firmados…)
function crearSubida(dir, { que, maxMb = MAX_MB }) {
  fs.mkdirSync(dir, { recursive: true });
  const subir = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dir),
      filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${TIPOS[file.mimetype]}`),
    }),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      if (TIPOS[file.mimetype]) return cb(null, true);
      cb(new AppError(`Subí ${que} en PDF o como imagen (JPG, PNG o WEBP).`, 400));
    },
  }).single('archivo');

  // Middleware: recibe el archivo, verifica que sea lo que dice ser y deja req.file
  return (req, res, next) => {
    subir(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return next(new AppError(`El archivo supera los ${maxMb} MB.`, 400));
        return next(err instanceof AppError ? err : new AppError('No se pudo recibir el archivo', 400));
      }
      if (!req.file) return next(new AppError(`Elegí el archivo ${que.replace(/^el /, 'del ').replace(/^la /, 'de la ')}.`, 400));
      const fd = fs.openSync(req.file.path, 'r');
      const cabecera = Buffer.alloc(12);
      fs.readSync(fd, cabecera, 0, 12, 0);
      fs.closeSync(fd);
      if (!FIRMAS[req.file.mimetype](cabecera)) {
        fs.rmSync(req.file.path, { force: true });
        return next(new AppError('El archivo no parece un PDF o una imagen válida.', 400));
      }
      return next();
    });
  };
}

const recibirComprobante = crearSubida(DIR, { que: 'el comprobante' });

const rutaComprobante = (archivo) => path.join(DIR, path.basename(archivo));

// Envía el archivo sin exponer su ubicación ni dejarlo en caché
function enviarComprobante(res, comprobante) {
  res.set({
    'Content-Type': comprobante.tipo,
    'Content-Disposition': `inline; filename="comprobante-${comprobante.id}${path.extname(comprobante.archivo)}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.sendFile(rutaComprobante(comprobante.archivo));
}

// Contrato firmado de una promo
const DIR_CONTRATOS = path.join(ENV.PRIVADO_DIR, 'contratos');
const recibirContrato = crearSubida(DIR_CONTRATOS, { que: 'el contrato firmado', maxMb: 10 });
const rutaContrato = (archivo) => path.join(DIR_CONTRATOS, path.basename(archivo));
function enviarContrato(res, promo) {
  res.set({
    'Content-Type': promo.contratoTipo,
    'Content-Disposition': `inline; filename="contrato-${promo.anio}-${String(promo.curso).replace(/[^A-Za-z0-9]+/g, '-')}${path.extname(promo.contratoArchivo)}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.sendFile(rutaContrato(promo.contratoArchivo));
}

module.exports = { recibirComprobante, enviarComprobante, rutaComprobante, DIR_COMPROBANTES: DIR, recibirContrato, enviarContrato, rutaContrato };
