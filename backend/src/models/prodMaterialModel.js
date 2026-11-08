const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

// Tela o insumo que se compra para producir (frisa, rib, cierres, etiquetas, hilo…).
module.exports = (sequelize) => {
  const ProdMaterial = sequelize.define('ProdMaterial', {
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    tipo: { type: DataTypes.ENUM('tela', 'insumo'), allowNull: false },
    color: { type: DataTypes.STRING(60) },
    unidad: { type: DataTypes.STRING(12), allowNull: false },
    ancho: dinero('ancho'),
    proveedor: { type: DataTypes.STRING(120) },
    precio: dinero('precio', { allowNull: false, defaultValue: 0 }),
    stock: dinero('stock', { allowNull: false, defaultValue: 0 }),
    notas: { type: DataTypes.STRING(500) },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'ProdMateriales' });
  return ProdMaterial;
};
