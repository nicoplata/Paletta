// Registro de actividad del panel. Nunca frena la acción: si falla, solo lo deja en el log.
const { Actividad } = require('../models');

async function registrar(req, { accion, descripcion, detalle = null, sensible = false }) {
  try {
    await Actividad.create({
      usuarioId: req.usuario?.id || null,
      usuarioNombre: req.usuario ? `${req.usuario.nombre} (${req.usuario.email})` : 'Sistema',
      rol: req.usuario?.rol || null,
      accion,
      descripcion: String(descripcion).slice(0, 500),
      detalle,
      sensible,
      ip: (req.ip || '').slice(0, 60),
    });
  } catch (err) {
    console.error('[actividad]', err.message);
  }
}

module.exports = { registrar };

// Middleware: registra la acción cuando la respuesta sale bien (2xx).
//   auditar('promo_borrada', (req) => `Borró la promo ${req.params.id}`, { sensible: true })
function auditar(accion, describir, { sensible = false } = {}) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        registrar(req, { accion, descripcion: describir(req, res), detalle: { metodo: req.method, ruta: req.originalUrl }, sensible });
      }
    });
    next();
  };
}

module.exports.auditar = auditar;
