const { DataTypes } = require('sequelize');

// Pedido de presupuesto hecho desde el diseñador, con el diseño adjunto
module.exports = (sequelize) => {
  const EgrPresupuesto = sequelize.define('EgrPresupuesto', {
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    telefono: { type: DataTypes.STRING(30), allowNull: false },
    email: { type: DataTypes.STRING },
    colegio: { type: DataTypes.STRING(150), allowNull: false },
    curso: { type: DataTypes.STRING(60) },
    cantidad: { type: DataTypes.INTEGER },
    anio: { type: DataTypes.INTEGER },
    mensaje: { type: DataTypes.TEXT },
    disenoId: { type: DataTypes.INTEGER },
    promoId: { type: DataTypes.INTEGER },
    estado: { type: DataTypes.ENUM('nuevo', 'contactado', 'convertido', 'descartado'), allowNull: false, defaultValue: 'nuevo' },
    notas: { type: DataTypes.TEXT },
  }, { tableName: 'EgrPresupuestos' });

  EgrPresupuesto.associate = (m) => {
    EgrPresupuesto.belongsTo(m.EgrDiseno, { foreignKey: 'disenoId', as: 'diseno' });
    EgrPresupuesto.belongsTo(m.EgrPromo, { foreignKey: 'promoId', as: 'promo' });
  };
  return EgrPresupuesto;
};
