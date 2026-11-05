const { DataTypes } = require('sequelize');

// Zona de envío: rango de códigos postales (numéricos de 4 dígitos) con su costo.
module.exports = (sequelize) => {
  const ZonaEnvio = sequelize.define('ZonaEnvio', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    cpDesde: { type: DataTypes.INTEGER, allowNull: false },
    cpHasta: { type: DataTypes.INTEGER, allowNull: false },
    costo: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get() { return Number(this.getDataValue('costo')); },
    },
    demora: { type: DataTypes.STRING },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'ZonasEnvio',
  });

  return ZonaEnvio;
};
