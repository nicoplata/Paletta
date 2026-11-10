const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

// Orden de taller: prendas cortadas que se mandan a coser ({ talle: cantidad }) y su recepción
module.exports = (sequelize) => {
  const ProdOrden = sequelize.define('ProdOrden', {
    prendaId: { type: DataTypes.INTEGER, allowNull: false },
    tallerId: { type: DataTypes.INTEGER, allowNull: false },
    cantidades: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    recibidas: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    falladas: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    precioUnitario: dinero('precioUnitario', { allowNull: false, defaultValue: 0 }),
    estado: { type: DataTypes.ENUM('preparando', 'enviada', 'recibida'), allowNull: false, defaultValue: 'preparando' },
    enviadaEl: { type: DataTypes.DATEONLY },
    compromisoEl: { type: DataTypes.DATEONLY },
    recibidaEl: { type: DataTypes.DATEONLY },
    notas: { type: DataTypes.TEXT },
  }, { tableName: 'ProdOrdenes' });

  ProdOrden.associate = (m) => {
    ProdOrden.belongsTo(m.EgrPrenda, { foreignKey: 'prendaId', as: 'prenda' });
    ProdOrden.belongsTo(m.ProdTaller, { foreignKey: 'tallerId', as: 'taller' });
  };
  return ProdOrden;
};
