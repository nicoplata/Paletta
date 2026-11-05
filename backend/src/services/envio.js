// Costo de envío por código postal. Si hay zonas activas, el CP tiene que caer en alguna;
// si no hay zonas cargadas, se usa el costo fijo ENVIO_COSTO.
const ENV = require('../config/env');
const { ZonaEnvio } = require('../models');
const { Op } = require('sequelize');
const { AppError } = require('../utils/errorHandler');

// Acepta "1605", "B1605", "B1605ABC" (CPA) y devuelve 1605.
function cpNumerico(codigoPostal) {
  const m = String(codigoPostal || '').toUpperCase().match(/^[A-Z]?(\d{4})[A-Z]{0,3}$/);
  return m ? Number(m[1]) : null;
}

async function cotizar(codigoPostal, subtotal = 0) {
  if (!ENV.ENVIO_HABILITADO) return { disponible: false, motivo: 'El envío a domicilio no está disponible' };

  const hayZonas = (await ZonaEnvio.count({ where: { activo: true } })) > 0;
  let costo = ENV.ENVIO_COSTO;
  let zona = null;
  let demora = null;

  if (hayZonas) {
    const cp = cpNumerico(codigoPostal);
    if (cp === null) return { disponible: false, motivo: 'Código postal inválido' };
    const encontrada = await ZonaEnvio.findOne({
      where: { activo: true, cpDesde: { [Op.lte]: cp }, cpHasta: { [Op.gte]: cp } },
      order: [['costo', 'ASC']],
    });
    if (!encontrada) return { disponible: false, motivo: 'Todavía no hacemos envíos a ese código postal. Podés retirarlo en el local.' };
    costo = encontrada.costo;
    zona = encontrada.nombre;
    demora = encontrada.demora;
  }

  const gratis = ENV.ENVIO_GRATIS_DESDE > 0 && subtotal >= ENV.ENVIO_GRATIS_DESDE;
  return { disponible: true, costo: gratis ? 0 : costo, zona, demora, gratis };
}

async function costoParaPedido(codigoPostal, subtotal) {
  const cotizacion = await cotizar(codigoPostal, subtotal);
  if (!cotizacion.disponible) throw new AppError(cotizacion.motivo, 400);
  return cotizacion;
}

module.exports = { cpNumerico, cotizar, costoParaPedido };
