const { DataTypes } = require('sequelize');

const ESTADOS = ['pendiente_pago', 'pagado', 'en_preparacion', 'listo_para_retirar', 'enviado', 'entregado', 'cancelado'];
const METODOS_PAGO = ['mercadopago', 'transferencia'];
const TIPOS_ENTREGA = ['retiro', 'envio'];

const dinero = (campo) => ({
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false,
  defaultValue: 0,
  get() {
    const v = this.getDataValue(campo);
    return v === null || v === undefined ? v : Number(v);
  },
});

module.exports = (sequelize) => {
  const Pedido = sequelize.define('Pedido', {
    // Token aleatorio para que el cliente consulte su pedido sin cuenta
    token: { type: DataTypes.UUID, allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
    estado: { type: DataTypes.ENUM(...ESTADOS), allowNull: false, defaultValue: 'pendiente_pago' },

    nombre: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    telefono: { type: DataTypes.STRING, allowNull: false },
    dni: { type: DataTypes.STRING },

    tipoEntrega: { type: DataTypes.ENUM(...TIPOS_ENTREGA), allowNull: false },
    direccion: { type: DataTypes.STRING },
    ciudad: { type: DataTypes.STRING },
    provincia: { type: DataTypes.STRING },
    codigoPostal: { type: DataTypes.STRING },

    notas: { type: DataTypes.TEXT },
    notasInternas: { type: DataTypes.TEXT },

    subtotal: dinero('subtotal'),
    costoEnvio: dinero('costoEnvio'),
    total: dinero('total'),

    metodoPago: { type: DataTypes.ENUM(...METODOS_PAGO), allowNull: false },
    mpPreferenceId: { type: DataTypes.STRING },
    mpPaymentId: { type: DataTypes.STRING },
    mpEstado: { type: DataTypes.STRING },

    venceAt: { type: DataTypes.DATE },
    pagadoAt: { type: DataTypes.DATE },
    canceladoAt: { type: DataTypes.DATE },
    motivoCancelacion: { type: DataTypes.STRING },
  }, {
    tableName: 'Pedidos',
  });

  Pedido.associate = (models) => {
    Pedido.hasMany(models.PedidoItem, { foreignKey: 'pedidoId', as: 'items' });
  };

  // Número legible para el cliente (P-000123)
  Pedido.prototype.numero = function () {
    return `P-${String(this.id).padStart(6, '0')}`;
  };

  Pedido.ESTADOS = ESTADOS;
  Pedido.METODOS_PAGO = METODOS_PAGO;
  Pedido.TIPOS_ENTREGA = TIPOS_ENTREGA;
  return Pedido;
};
