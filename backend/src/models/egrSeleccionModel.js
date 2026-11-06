const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

module.exports = (sequelize) => {
  const EgrSeleccion = sequelize.define('EgrSeleccion', {
    alumnoId: { type: DataTypes.INTEGER, allowNull: false },
    prendaId: { type: DataTypes.INTEGER, allowNull: false },
    talle: { type: DataTypes.STRING(12), allowNull: false },
    bordado: { type: DataTypes.STRING(24) },
    cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    // Precio al momento de elegir (si después cambia la lista, se corrige con el ajuste)
    precioUnitario: dinero('precioUnitario', { allowNull: false }),
  }, { tableName: 'EgrSelecciones' });

  EgrSeleccion.associate = (m) => {
    EgrSeleccion.belongsTo(m.EgrAlumno, { foreignKey: 'alumnoId', as: 'alumno' });
    EgrSeleccion.belongsTo(m.EgrPrenda, { foreignKey: 'prendaId', as: 'prenda' });
  };
  return EgrSeleccion;
};
