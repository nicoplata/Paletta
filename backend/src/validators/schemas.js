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
    activo: Joi.boolean().default(true),
    categoriaId: id.required(),
    colegioId: id.required(),
    variantes: Joi.array().items(Joi.object({
      id: id.optional(),
      talle: Joi.string().trim().min(1).max(30).required(),
      stock: Joi.number().integer().min(0).max(100000).required(),
      activo: Joi.boolean().default(true),
    })).min(1).max(40).unique((a, b) => a.talle.toLowerCase() === b.talle.toLowerCase()).required()
      .messages({ 'array.min': 'El producto necesita al menos un talle', 'array.unique': 'Hay talles repetidos' }),
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

const siEnvio = (schema) => Joi.when('tipoEntrega', { is: 'envio', then: schema.required(), otherwise: Joi.any().strip() });

schemas.pedido = Joi.object({
  items: Joi.array().items(Joi.object({
    varianteId: id.required(),
    cantidad: Joi.number().integer().min(1).max(1000).required(),
  })).min(1).max(30).required()
    .messages({ 'array.min': 'El carrito está vacío' }),
  nombre: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().max(150).required(),
  telefono: Joi.string().trim().pattern(/^[0-9+()\-\s]{6,25}$/).required()
    .messages({ 'string.pattern.base': 'Teléfono inválido' }),
  dni: Joi.string().trim().pattern(/^[0-9.]{6,12}$/).allow('', null)
    .messages({ 'string.pattern.base': 'DNI inválido' }),
  tipoEntrega: Joi.string().valid('retiro', 'envio').required(),
  direccion: siEnvio(Joi.string().trim().min(4).max(200)),
  ciudad: siEnvio(Joi.string().trim().min(2).max(100)),
  provincia: siEnvio(Joi.string().trim().min(2).max(100)),
  codigoPostal: siEnvio(Joi.string().trim().pattern(/^[A-Za-z0-9]{4,8}$/)),
  notas: textoOpcional(1000),
  metodoPago: Joi.string().valid('mercadopago', 'transferencia').required(),
});

schemas.tokenParam = Joi.object({ token: Joi.string().guid({ version: 'uuidv4' }).required() }).unknown(true);

schemas.verificarPago = Joi.object({ paymentId: Joi.string().pattern(/^\d{1,20}$/).required() });

schemas.cambioEstado = Joi.object({
  estado: Joi.string().valid('pagado', 'en_preparacion', 'listo_para_retirar', 'enviado', 'entregado', 'cancelado').required(),
  motivo: textoOpcional(200),
});

schemas.pedidoAdmin = Joi.object({ notasInternas: textoOpcional(5000) });

schemas.NIVELES = NIVELES;
module.exports = schemas;
