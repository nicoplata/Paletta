const jwt = require('jsonwebtoken');
const ENV = require('../config/env');
const { EgrAlumno, EgrPromo } = require('../models');

// Sesión de una familia de egresados: token propio (no sirve para el panel ni al revés).
const DURACION = '30d';

const firmarTokenFamilia = (alumno) =>
  jwt.sign({ fam: alumno.id, promo: alumno.promoId }, ENV.JWT_SECRET, { expiresIn: DURACION });

async function verificarFamilia(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Ingresá con el link de tu promo y el DNI del alumno' });
  try {
    const datos = jwt.verify(h.slice(7), ENV.JWT_SECRET);
    if (!datos.fam) throw new Error('no es una sesión de familia');
    const alumno = await EgrAlumno.findByPk(datos.fam, { include: [{ model: EgrPromo, as: 'promo' }] });
    if (!alumno || alumno.promoId !== datos.promo || !alumno.promo.activo || !alumno.dni) throw new Error('sesión inválida');
    req.alumno = alumno;
    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión venció. Volvé a ingresar con el DNI del alumno.' });
  }
}

module.exports = { firmarTokenFamilia, verificarFamilia };
