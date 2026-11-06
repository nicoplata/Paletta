const { DataTypes } = require('sequelize');

// Ajustes generales clave → valor (JSON). Ej.: "egresados.cuenta" con los datos para transferencias.
module.exports = (sequelize) => sequelize.define('Configuracion', {
  clave: { type: DataTypes.STRING(60), primaryKey: true },
  valor: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { tableName: 'Configuraciones' });
