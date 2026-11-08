const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

// Ficha técnica de un modelo de prenda: cuánta tela lleva cada pieza en cada talle,
// qué insumos lleva cada prenda, el desperdicio de corte y lo que cobra el taller.
//   piezas:  [{ rol: 'Cuerpo', porTalle: { S: 1.2, M: 1.3 } }]   (metros, o la unidad de la tela)
//   insumos: [{ rol: 'Cierre', cantidad: 1 }]                     (por prenda)
module.exports = (sequelize) => {
  const ProdModelo = sequelize.define('ProdModelo', {
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    categoria: { type: DataTypes.STRING(40) },
    talles: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    piezas: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    insumos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    desperdicio: dinero('desperdicio', { allowNull: false, defaultValue: 5 }),
    costoConfeccion: dinero('costoConfeccion', { allowNull: false, defaultValue: 0 }),
    pasos: { type: DataTypes.TEXT },
    notas: { type: DataTypes.TEXT },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'ProdModelos' });
  return ProdModelo;
};
