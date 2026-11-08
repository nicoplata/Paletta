const Joi = require('joi');

const texto = (min, max) => Joi.string().trim().min(min).max(max);
const opcional = (max) => Joi.string().trim().max(max).allow('', null).empty('').default(null);
const numero = (max) => Joi.number().min(0).max(max);
const talle = Joi.string().trim().min(1).max(12);
const rol = texto(1, 60);

const material = {
  nombre: texto(2, 120),
  tipo: Joi.string().valid('tela', 'insumo'),
  color: opcional(60),
  unidad: texto(1, 12),
  ancho: numero(1000).allow(null, ''),
  proveedor: opcional(120),
  precio: numero(100000000),
  stock: numero(100000000),
  notas: opcional(500),
  activo: Joi.boolean(),
};

const modelo = {
  nombre: texto(2, 120),
  categoria: opcional(40),
  talles: Joi.array().items(talle).min(1).max(30).unique(),
  piezas: Joi.array().items(Joi.object({
    rol: rol.required(),
    porTalle: Joi.object().pattern(talle, numero(1000)).default({}),
  })).max(20).unique('rol'),
  insumos: Joi.array().items(Joi.object({
    rol: rol.required(),
    cantidad: numero(1000).required(),
  })).max(40).unique('rol'),
  desperdicio: numero(100),
  costoConfeccion: numero(100000000),
  pasos: opcional(5000),
  notas: opcional(2000),
  activo: Joi.boolean(),
};

const requeridos = (obj, campos) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, campos.includes(k) ? v.required() : v]));

module.exports = {
  idParam: Joi.object({ id: Joi.number().integer().positive().required() }),
  materialNuevo: Joi.object(requeridos(material, ['nombre', 'tipo', 'unidad'])),
  materialEdicion: Joi.object(material).min(1),
  modeloNuevo: Joi.object(requeridos(modelo, ['nombre', 'talles'])),
  modeloEdicion: Joi.object(modelo).min(1),
  calculo: Joi.object({ confirmados: Joi.boolean().default(false) }),
  compras: Joi.object({
    promos: Joi.string().pattern(/^\d+(,\d+){0,49}$/).required().messages({ 'string.pattern.base': 'Elegí al menos una promo' }),
    confirmados: Joi.boolean().default(false),
  }),
};
