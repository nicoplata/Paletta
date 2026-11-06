const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

module.exports = (sequelize) => {
  const EgrPrenda = sequelize.define('EgrPrenda', {
    promoId: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.STRING(500) },
    precio: dinero('precio', { allowNull: false }),
    talles: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    conBordado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'EgrPrendas' });

  EgrPrenda.associate = (m) => {
    EgrPrenda.belongsTo(m.EgrPromo, { foreignKey: 'promoId', as: 'promo' });
  };
  return EgrPrenda;
};
