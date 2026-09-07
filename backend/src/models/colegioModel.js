const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Colegio = sequelize.define('Colegio', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ciudad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    alias: {
      type: DataTypes.STRING,
    },
    nivel: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    grupoInstitucional: {
      type: DataTypes.STRING,
    },
  });

  // ✅ Asociación con el modelo Imagen
  Colegio.associate = (models) => {
    Colegio.hasMany(models.Imagen, {
      foreignKey: 'entidadId',
      constraints: false,
      scope: {
        tipoEntidad: 'colegio'
      },
      as: 'imagenes'
    });
  };

  return Colegio;
};
