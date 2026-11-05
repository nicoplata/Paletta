const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const ENV = require('../config/env');
const { AppError } = require('../utils/errorHandler');

const { UPLOADS_DIR } = ENV;
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const TIPOS_PERMITIDOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  // La extensión sale del mimetype validado, no del nombre que manda el cliente.
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${TIPOS_PERMITIDOS[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: ENV.UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (TIPOS_PERMITIDOS[file.mimetype]) return cb(null, true);
    cb(new AppError('Formato no permitido. Usá JPG, PNG, WEBP o GIF.', 400));
  },
});

module.exports = upload;
module.exports.UPLOADS_DIR = UPLOADS_DIR;
