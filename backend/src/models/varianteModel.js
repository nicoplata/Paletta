const { DataTypes } = require('sequelize');

// Variante de un producto (por ahora, el talle). El stock vive en la variante.
module.exports = (sequelize) => {
  const Variante = sequelize.define('Variante', {
    productoId: { type: DataTypes.INTEGER, allowNull: false },
    talle: { type: DataTypes.STRING(30), allowNull: false },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'Variantes',
  });

  Variante.associate = (models) => {
    Variante.belongsTo(models.Producto, { foreignKey: 'productoId', as: 'producto' });
  };

  return Variante;
};
