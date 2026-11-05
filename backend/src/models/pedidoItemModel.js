const { DataTypes } = require('sequelize');

// Línea de un pedido. Guarda una "foto" del producto y del precio al momento de comprar.
module.exports = (sequelize) => {
  const PedidoItem = sequelize.define('PedidoItem', {
    pedidoId: { type: DataTypes.INTEGER, allowNull: false },
    productoId: { type: DataTypes.INTEGER },
    varianteId: { type: DataTypes.INTEGER },
    nombreProducto: { type: DataTypes.STRING, allowNull: false },
    colegio: { type: DataTypes.STRING },
    talle: { type: DataTypes.STRING(30), allowNull: false },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },
    precioUnitario: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get() { return Number(this.getDataValue('precioUnitario')); },
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get() { return Number(this.getDataValue('subtotal')); },
    },
  }, {
    tableName: 'PedidoItems',
  });

  PedidoItem.associate = (models) => {
    PedidoItem.belongsTo(models.Pedido, { foreignKey: 'pedidoId', as: 'pedido' });
    PedidoItem.belongsTo(models.Variante, { foreignKey: 'varianteId', as: 'variante' });
  };

  return PedidoItem;
};
