const { DataTypes } = require('sequelize');

// Registro de actividad del panel: quién hizo qué y cuándo (lo ve solo el administrador)
module.exports = (sequelize) => sequelize.define('Actividad', {
  usuarioId: { type: DataTypes.INTEGER },
  usuarioNombre: { type: DataTypes.STRING(120) },
  rol: { type: DataTypes.STRING(20) },
  accion: { type: DataTypes.STRING(60), allowNull: false },
  descripcion: { type: DataTypes.STRING(500), allowNull: false },
  detalle: { type: DataTypes.JSONB },
  sensible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ip: { type: DataTypes.STRING(60) },
}, { tableName: 'Actividades', updatedAt: false });
