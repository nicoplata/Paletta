const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Imagen = sequelize.define('Imagen', {
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.STRING,
    },
    tipoEntidad: {
      type: DataTypes.STRING, // 'producto' o 'colegio'
      allowNull: false,
    },
    entidadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'Imagenes',
  });

  Imagen.associate = (models) => {
    Imagen.belongsTo(models.Producto, {
      foreignKey: 'entidadId',
      constraints: false,
      as: 'producto',
    });

    Imagen.belongsTo(models.Colegio, {
      foreignKey: 'entidadId',
      constraints: false,
      as: 'colegio',
    });
  };

  return Imagen;
};
