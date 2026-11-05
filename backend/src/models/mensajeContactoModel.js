const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MensajeContacto = sequelize.define('MensajeContacto', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING,
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    leido: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'MensajesContacto',
  });

  return MensajeContacto;
};
