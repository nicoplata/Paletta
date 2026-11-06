const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ENV = require('../config/env');
const { EgrPromo } = require('../models');

// Sesión de la comisión: token propio que se invalida si Paletta cambia la clave.
const huella = (promo) => crypto.createHash('sha256').update(`${promo.id}:${promo.comisionClave}`).digest('hex').slice(0, 16);

const firmarTokenComision = (promo) => jwt.sign({ com: promo.id, h: huella(promo) }, ENV.JWT_SECRET, { expiresIn: '60d' });

async function verificarComision(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Ingresá con el código de la promo y la clave de la comisión.' });
  try {
    const datos = jwt.verify(h.slice(7), ENV.JWT_SECRET);
    if (!datos.com) throw new Error('no es una sesión de comisión');
    const promo = await EgrPromo.findByPk(datos.com);
    if (!promo || !promo.activo || datos.h !== huella(promo)) throw new Error('sesión inválida');
    req.promo = promo;
    next();
  } catch {
    res.status(401).json({ error: 'La sesión de la comisión venció o la clave cambió. Volvé a ingresar.' });
  }
}

module.exports = { firmarTokenComision, verificarComision };
