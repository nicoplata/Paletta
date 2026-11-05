const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Categoria = sequelize.define('Categoria', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'Categorias',
  });

  Categoria.associate = (models) => {
    Categoria.hasMany(models.Producto, { foreignKey: 'categoriaId', as: 'productos' });
  };

  return Categoria;
};
