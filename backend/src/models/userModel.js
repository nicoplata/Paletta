const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

// administrador: todo · encargado: trabajo diario del panel, sin configuración ni borrados importantes · usuario: sin panel
const ROLES = ['administrador', 'encargado', 'usuario'];

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(valor) {
        this.setDataValue('email', String(valor).trim().toLowerCase());
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM(...ROLES),
      defaultValue: 'usuario',
    },
    // Hasta cuándo vio las notificaciones del panel (para el contador de no leídas)
    notifLeidasHasta: { type: DataTypes.DATE },
    // Recibe el resumen diario de pendientes por mail (lo elige el administrador)
    recibeResumen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'Users',
    // Nunca devolver el hash por defecto
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { conPassword: { attributes: { include: ['password'] } } },
  });

  const hashear = async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  };
  User.beforeCreate(hashear);
  User.beforeUpdate(hashear);

  User.prototype.compararPassword = function (passwordIngresada) {
    return bcrypt.compare(passwordIngresada, this.password);
  };

  User.prototype.toJSON = function () {
    const valores = { ...this.get() };
    delete valores.password;
    return valores;
  };

  User.ROLES = ROLES;
  return User;
};
