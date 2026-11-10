const { DataTypes } = require('sequelize');

// Taller externo de confección (el corte se hace en Paletta)
module.exports = (sequelize) => {
  const ProdTaller = sequelize.define('ProdTaller', {
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    contacto: { type: DataTypes.STRING(120) },
    telefono: { type: DataTypes.STRING(30) },
    direccion: { type: DataTypes.STRING(200) },
    notas: { type: DataTypes.STRING(1000) },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'ProdTalleres' });
  ProdTaller.associate = (m) => {
    ProdTaller.hasMany(m.ProdOrden, { foreignKey: 'tallerId', as: 'ordenes' });
  };
  return ProdTaller;
};
