const { DataTypes } = require('sequelize');

// Aviso interno del panel (campanita). "clave" evita duplicados (ej. el mismo presupuesto dos veces).
module.exports = (sequelize) => sequelize.define('Notificacion', {
  tipo: { type: DataTypes.STRING(40), allowNull: false },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  texto: { type: DataTypes.STRING(500) },
  link: { type: DataTypes.STRING(300) },
  clave: { type: DataTypes.STRING(120), unique: true },
  soloAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'Notificaciones', updatedAt: false });
