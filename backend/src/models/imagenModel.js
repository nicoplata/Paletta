const { DataTypes } = require('sequelize');

const TIPOS_ENTIDAD = ['producto', 'colegio'];

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
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isIn: [TIPOS_ENTIDAD] },
    },
    entidadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'Imagenes',
  });

  Imagen.TIPOS_ENTIDAD = TIPOS_ENTIDAD;
  return Imagen;
};
