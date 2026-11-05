const Joi = require('joi');

const id = Joi.number().integer().positive();
const textoOpcional = (max) => Joi.string().trim().max(max).allow('', null);

const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];

const schemas = {
  idParam: Joi.object({ id: id.required() }).unknown(true),

  login: Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(1).max(200).required(),
  }),

  producto: Joi.object({
    nombre: Joi.string().trim().min(2).max(150).required(),
    descripcion: textoOpcional(2000),
    precio: Joi.number().min(0).precision(2).required(),
    stock: Joi.number().integer().min(0).default(0),
    activo: Joi.boolean().default(true),
    categoriaId: id.required(),
    colegioId: id.required(),
  }),

  categoria: Joi.object({
    nombre: Joi.string().trim().min(2).max(100).required(),
    descripcion: textoOpcional(1000),
  }),

  colegio: Joi.object({
    nombre: Joi.string().trim().min(2).max(150).required(),
    ciudad: Joi.string().trim().min(2).max(100).required(),
    alias: textoOpcional(100),
    nivel: Joi.array().items(Joi.string().valid(...NIVELES)).unique().default([]),
    activo: Joi.boolean().default(true),
    grupoInstitucional: textoOpcional(150),
  }),

  usuarioCrear: Joi.object({
    nombre: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(10).max(200).required()
      .messages({ 'string.min': 'La contraseña debe tener al menos 10 caracteres' }),
    rol: Joi.string().valid('administrador', 'usuario').default('usuario'),
  }),

  usuarioActualizar: Joi.object({
    nombre: Joi.string().trim().min(2).max(100),
    email: Joi.string().trim().email(),
    password: Joi.string().min(10).max(200).allow('')
      .messages({ 'string.min': 'La contraseña debe tener al menos 10 caracteres' }),
    rol: Joi.string().valid('administrador', 'usuario'),
  }).min(1),

  imagen: Joi.object({
    tipoEntidad: Joi.string().valid('producto', 'colegio').required(),
    entidadId: id.required(),
    descripcion: textoOpcional(255),
  }),

  contacto: Joi.object({
    nombre: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().email().required(),
    telefono: textoOpcional(30),
    mensaje: Joi.string().trim().min(10).max(2000).required(),
    // Honeypot anti-spam: un humano nunca completa este campo
    sitio: Joi.string().allow('', null),
  }),
};

schemas.NIVELES = NIVELES;
module.exports = schemas;
