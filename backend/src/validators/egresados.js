const Joi = require('joi');

const id = Joi.number().integer().positive();
const fecha = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).message('fecha inválida (AAAA-MM-DD)');
const texto = (min, max) => Joi.string().trim().min(min).max(max);
const opcional = (max) => Joi.string().trim().max(max).allow('', null).empty('').default(null);
const dni = Joi.string().trim().replace(/[.\s]/g, '').pattern(/^\d{7,8}$/).message('el DNI tiene que tener 7 u 8 números');
const telefono = Joi.string().trim().pattern(/^[+\d][\d\s()-]{7,28}$/).message('teléfono inválido');
const plan = Joi.number().integer().valid(1, 2, 3, 4, 5, 6, 8, 10, 12);

const promo = {
  colegio: texto(2, 150),
  curso: texto(1, 60),
  anio: Joi.number().integer().min(2020).max(2100),
  planes: Joi.array().items(plan).min(1).unique(),
  descuentoContado: Joi.number().min(0).max(50),
  recargoTipo: Joi.string().valid('porcentaje', 'monto').allow(null),
  recargoValor: Joi.number().min(0).allow(null),
  primerVencimiento: fecha,
  fechaCierre: fecha.allow(null, ''),
  estadoProduccion: Joi.string().valid('pendiente', 'en_produccion', 'listo', 'entregado'),
  fechaEntrega: fecha.allow(null, ''),
  notas: opcional(2000),
  activo: Joi.boolean(),
};

const prenda = {
  nombre: texto(2, 120),
  descripcion: opcional(500),
  precio: Joi.number().min(0).max(100000000),
  talles: Joi.array().items(Joi.string().trim().min(1).max(12)).min(1).max(30).unique(),
  conBordado: Joi.boolean(),
  orden: Joi.number().integer().min(0).max(999),
  activo: Joi.boolean(),
};

const requeridos = (obj, campos) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, campos.includes(k) ? v.required() : v]));

module.exports = {
  slugParam: Joi.object({ slug: Joi.string().pattern(/^[A-Za-z0-9_-]{6,24}$/).required() }),
  idParam: Joi.object({ id: id.required() }).unknown(true),

  // Familias
  ingresar: Joi.object({ alumnoId: id.required(), dni: dni.required() }),
  sumarme: Joi.object({ nombre: texto(3, 120).required(), dni: dni.required() }),
  datosFamilia: Joi.object({
    nombre: texto(3, 120).required(),
    dni: dni.required(),
    responsableNombre: texto(3, 120).required(),
    responsableEmail: Joi.string().trim().lowercase().email().max(200).required(),
    responsableTelefono: telefono.required(),
  }),
  prendas: Joi.object({
    items: Joi.array().max(20).items(Joi.object({
      prendaId: id.required(),
      talle: Joi.string().trim().min(1).max(12).required(),
      bordado: Joi.string().trim().max(20).allow('', null),
      cantidad: Joi.number().integer().min(1).max(10).default(1),
    })).required(),
  }),
  plan: Joi.object({ plan: plan.required() }),

  // Panel
  promoNueva: Joi.object(requeridos(promo, ['colegio', 'curso', 'anio', 'primerVencimiento'])),
  promoEdicion: Joi.object(promo).min(1),
  prendaNueva: Joi.object(requeridos(prenda, ['nombre', 'precio', 'talles'])),
  prendaEdicion: Joi.object(prenda).min(1),
  alumnosNuevos: Joi.object({ nombres: Joi.array().items(texto(3, 120)).min(1).max(200).required() }),
  alumnoAdmin: Joi.object({
    nombre: texto(3, 120),
    dni: dni.allow(null, ''),
    responsableNombre: opcional(120),
    responsableEmail: Joi.string().trim().lowercase().email().max(200).allow('', null).empty('').default(null),
    responsableTelefono: telefono.allow('', null).empty('').default(null),
    plan: plan.allow(null),
    ajuste: Joi.number().min(-100000000).max(100000000),
    ajusteMotivo: opcional(255),
  }).min(1),
  pago: Joi.object({
    medio: Joi.string().valid('efectivo', 'transferencia').required(),
    fecha: fecha.allow(null, ''),
    cobrarRecargo: Joi.boolean().default(true),
    nota: opcional(255),
  }),
  buscar: Joi.object({ q: Joi.string().trim().min(2).max(60).required() }),
  cuenta: Joi.object({
    alias: opcional(60),
    cbu: Joi.string().trim().pattern(/^\d{22}$/).message('el CBU/CVU tiene 22 números').allow('', null).empty('').default(null),
    titular: opcional(120),
    banco: opcional(120),
    cuit: Joi.string().trim().pattern(/^\d{2}-?\d{8}-?\d$/).message('CUIT inválido').allow('', null).empty('').default(null),
  }),
};
