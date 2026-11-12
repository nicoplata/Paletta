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

  confirmar: Joi.object({ password: Joi.string().min(1).max(200).required() }),

  usuarioCrear: Joi.object({
    nombre: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(10).max(200).required()
      .messages({ 'string.min': 'La contraseña debe tener al menos 10 caracteres' }),
    rol: Joi.string().valid('administrador', 'encargado', 'usuario').default('usuario'),
    recibeResumen: Joi.boolean().default(false),
  }),

  usuarioActualizar: Joi.object({
    nombre: Joi.string().trim().min(2).max(100),
    email: Joi.string().trim().email(),
    password: Joi.string().min(10).max(200).allow('')
      .messages({ 'string.min': 'La contraseña debe tener al menos 10 caracteres' }),
    rol: Joi.string().valid('administrador', 'encargado', 'usuario'),
    recibeResumen: Joi.boolean(),
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
  cupon: Joi.string().trim().max(40).allow('', null),
});

const itemsCarrito = Joi.array().items(Joi.object({
  varianteId: id.required(),
  cantidad: Joi.number().integer().min(1).max(1000).required(),
})).min(1).max(30);

schemas.validarCupon = Joi.object({
  codigo: Joi.string().trim().min(1).max(40).required(),
  items: itemsCarrito.required(),
});

schemas.cotizarEnvio = Joi.object({
  cp: Joi.string().trim().max(10).required(),
  subtotal: Joi.number().min(0).default(0),
});

schemas.cupon = Joi.object({
  codigo: Joi.string().trim().uppercase().pattern(/^[A-Z0-9_-]{3,40}$/).required()
    .messages({ 'string.pattern.base': 'El código solo puede tener letras, números, guiones y _ (3 a 40)' }),
  descripcion: textoOpcional(255),
  tipo: Joi.string().valid('porcentaje', 'monto').required(),
  valor: Joi.number().positive().precision(2).required()
    .when('tipo', { is: 'porcentaje', then: Joi.number().max(100) }),
  minimoCompra: Joi.number().min(0).precision(2).allow(null),
  desde: Joi.date().allow(null),
  hasta: Joi.date().allow(null).when('desde', { is: Joi.date().required(), then: Joi.date().min(Joi.ref('desde')) }),
  usosMaximos: Joi.number().integer().min(1).allow(null),
  activo: Joi.boolean().default(true),
});

schemas.zonaEnvio = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required(),
  cpDesde: Joi.number().integer().min(1000).max(9999).required(),
  cpHasta: Joi.number().integer().min(1000).max(9999).min(Joi.ref('cpDesde')).required()
    .messages({ 'number.min': 'El CP final debe ser mayor o igual al inicial' }),
  costo: Joi.number().min(0).precision(2).required(),
  demora: textoOpcional(100),
  activo: Joi.boolean().default(true),
});

schemas.exportarPedidos = Joi.object({
  estado: Joi.string().valid('pendiente_pago', 'pagado', 'en_preparacion', 'listo_para_retirar', 'enviado', 'entregado', 'cancelado'),
  desde: Joi.date(),
  hasta: Joi.date(),
  detalle: Joi.string().valid('pedidos', 'items').default('pedidos'),
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
