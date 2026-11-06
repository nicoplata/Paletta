const { DataTypes } = require('sequelize');

// DECIMAL de Postgres llega como string: se expone como número.
const dinero = (campo, { allowNull = true, defaultValue } = {}) => ({
  type: DataTypes.DECIMAL(12, 2),
  allowNull,
  defaultValue,
  get() {
    const v = this.getDataValue(campo);
    return v === null || v === undefined ? v : Number(v);
  },
});

module.exports = { dinero };
