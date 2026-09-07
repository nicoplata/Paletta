const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Perfil = sequelize.define('Perfil', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
    rol: {
      type: DataTypes.ENUM('usuario', 'administrador'),
      allowNull: false,
    },
  }, {
    tableName: 'Perfiles' // 👈 Esto fuerza el nombre correcto de la tabla
  });

  return Perfil;
};

