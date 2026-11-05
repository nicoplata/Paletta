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
      allowNull: false,
      defaultValue: true,
    },
    grupoInstitucional: {
      type: DataTypes.STRING,
    },
  }, {
    tableName: 'Colegios',
  });

  Colegio.associate = (models) => {
    Colegio.hasMany(models.Producto, { foreignKey: 'colegioId', as: 'productos' });
    Colegio.hasMany(models.Imagen, {
      foreignKey: 'entidadId',
      constraints: false,
      scope: { tipoEntidad: 'colegio' },
      as: 'imagenes',
    });
  };

  return Colegio;
};
