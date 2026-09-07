const Joi = require('joi');

const schemas = {
  producto: Joi.object({
    nombre: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.empty': 'El nombre es requerido',
        'string.min': 'El nombre debe tener al menos 3 caracteres',
        'string.max': 'El nombre no puede exceder los 100 caracteres'
      }),
    precio: Joi.number()
      .positive()
      .required()
      .messages({
        'number.base': 'El precio debe ser un número',
        'number.positive': 'El precio debe ser mayor que 0'
      }),
    descripcion: Joi.string()
      .min(10)
      .max(500)
      .required()
      .messages({
        'string.empty': 'La descripción es requerida',
        'string.min': 'La descripción debe tener al menos 10 caracteres',
        'string.max': 'La descripción no puede exceder los 500 caracteres'
      }),
    stock: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.base': 'El stock debe ser un número',
        'number.integer': 'El stock debe ser un número entero',
        'number.min': 'El stock no puede ser negativo'
      }),
    categoriaId: Joi.number()
      .integer()
      .required()
      .messages({
        'number.base': 'La categoría es requerida',
        'number.integer': 'ID de categoría inválido'
      })
  }),

  pedido: Joi.object({
    direccionEnvio: Joi.string()
      .min(10)
      .max(200)
      .required()
      .messages({
        'string.empty': 'La dirección de envío es requerida',
        'string.min': 'La dirección debe tener al menos 10 caracteres',
        'string.max': 'La dirección no puede exceder los 200 caracteres'
      }),
    productos: Joi.array()
      .items(Joi.object({
        productoId: Joi.number().required(),
        cantidad: Joi.number().integer().min(1).required()
      }))
      .min(1)
      .required()
      .messages({
        'array.min': 'El pedido debe contener al menos un producto',
        'array.base': 'La lista de productos es requerida'
      }),
    metodoPago: Joi.string()
      .valid('efectivo', 'tarjeta', 'transferencia')
      .required()
      .messages({
        'any.only': 'Método de pago inválido'
      })
  }),

  usuario: Joi.object({
    nombre: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.empty': 'El nombre es requerido',
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder los 50 caracteres'
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email inválido',
        'string.empty': 'El email es requerido'
      }),
    password: Joi.string()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)
      .required()
      .messages({
        'string.pattern.base': 'La contraseña debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número',
        'string.empty': 'La contraseña es requerida'
      }),
    telefono: Joi.string()
      .pattern(/^\+?[1-9]\d{7,14}$/)
      .messages({
        'string.pattern.base': 'Número de teléfono inválido'
      })
  })
};

module.exports = schemas;
