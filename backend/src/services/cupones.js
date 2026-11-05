// Cupones de descuento. El descuento se calcula siempre en el servidor sobre el subtotal de productos.
const { Op } = require('sequelize');
const { Cupon } = require('../models');
const { AppError } = require('../utils/errorHandler');

const redondear = (n) => Math.round(n * 100) / 100;
const normalizar = (codigo) => String(codigo || '').trim().toUpperCase();

// Devuelve el motivo por el que el cupón no aplica, o null si aplica.
function motivoInvalido(cupon, subtotal, ahora = new Date()) {
  if (!cupon || !cupon.activo) return 'El cupón no existe o no está activo';
  if (cupon.desde && ahora < new Date(cupon.desde)) return 'El cupón todavía no está vigente';
  if (cupon.hasta && ahora > new Date(cupon.hasta)) return 'El cupón está vencido';
  if (cupon.usosMaximos !== null && cupon.usosMaximos !== undefined && cupon.usos >= cupon.usosMaximos) {
    return 'El cupón ya alcanzó su límite de usos';
  }
  if (cupon.minimoCompra && subtotal < cupon.minimoCompra) {
    return `El cupón requiere una compra mínima de $ ${cupon.minimoCompra.toLocaleString('es-AR')}`;
  }
  return null;
}

function calcularDescuento(cupon, subtotal) {
  const bruto = cupon.tipo === 'porcentaje' ? (subtotal * cupon.valor) / 100 : cupon.valor;
  return redondear(Math.min(Math.max(bruto, 0), subtotal));
}

// Valida y reserva un uso del cupón dentro de la transacción del pedido (con bloqueo de fila).
async function aplicarEnPedido(codigo, subtotal, transaction) {
  const cupon = await Cupon.findOne({
    where: { codigo: normalizar(codigo) },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  const motivo = motivoInvalido(cupon, subtotal);
  if (motivo) throw new AppError(motivo, 400);
  await cupon.increment('usos', { by: 1, transaction });
  return { codigo: cupon.codigo, descuento: calcularDescuento(cupon, subtotal) };
}

// Al cancelar un pedido se devuelve el uso del cupón.
async function liberarUso(codigo, transaction) {
  if (!codigo) return;
  await Cupon.decrement('usos', { by: 1, where: { codigo, usos: { [Op.gt]: 0 } }, transaction });
}

// Vista previa para el checkout (no reserva usos).
async function previsualizar(codigo, subtotal) {
  const cupon = await Cupon.findOne({ where: { codigo: normalizar(codigo) } });
  const motivo = motivoInvalido(cupon, subtotal);
  if (motivo) throw new AppError(motivo, 400);
  return {
    codigo: cupon.codigo,
    tipo: cupon.tipo,
    valor: cupon.valor,
    descripcion: cupon.descripcion,
    descuento: calcularDescuento(cupon, subtotal),
  };
}

module.exports = { normalizar, motivoInvalido, calcularDescuento, aplicarEnPedido, liberarUso, previsualizar };
