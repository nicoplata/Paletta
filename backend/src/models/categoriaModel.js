// models/categoriaModel.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Categoria = sequelize.define('Categoria', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    timestamps: true, // Agrega createdAt y updatedAt
    tableName: 'Categorias', // Opcional: para mantener consistencia en nombres
  });

  return Categoria;
};
