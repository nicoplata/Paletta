const { DataTypes } = require('sequelize');

// Foto de la galería de egresados. "archivo" es la base del nombre: se guardan <archivo>-1600.webp y <archivo>-640.webp
module.exports = (sequelize) => sequelize.define('EgrFoto', {
  archivo: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  ancho: { type: DataTypes.INTEGER, allowNull: false },
  alto: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.ENUM('promo', 'diseno'), allowNull: false, defaultValue: 'promo' },
  anio: { type: DataTypes.STRING(4) },
  colegio: { type: DataTypes.STRING(150) },
  alt: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
  // Abre el diseñador con esa prenda y colores ('tipo=canguro&estilo=chevron&pal=a.b.c')
  diseno: { type: DataTypes.STRING(200) },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  // Original sin tocar (carpeta privada) y su tamaño real: sirven para reprocesar y avisar si es de baja resolución
  original: { type: DataTypes.STRING(120) },
  anchoOriginal: { type: DataTypes.INTEGER },
  altoOriginal: { type: DataTypes.INTEGER },
}, { tableName: 'EgrFotos' });
