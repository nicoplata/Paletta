const { DataTypes } = require('sequelize');

// Diseño guardado desde el diseñador de egresados (configuración + imagen renderizada)
module.exports = (sequelize) => {
  const EgrDiseno = sequelize.define('EgrDiseno', {
    // Identificador público corto: egresados.paletta.com.ar/d/<codigo>
    codigo: { type: DataTypes.STRING(12), allowNull: false, unique: true },
    config: { type: DataTypes.JSONB, allowNull: false },
    imagen: { type: DataTypes.STRING, allowNull: false },
    titulo: { type: DataTypes.STRING(160) },
    promoId: { type: DataTypes.INTEGER },
  }, { tableName: 'EgrDisenos' });

  EgrDiseno.associate = (m) => {
    EgrDiseno.belongsTo(m.EgrPromo, { foreignKey: 'promoId', as: 'promo' });
  };
  return EgrDiseno;
};
