const { DataTypes } = require('sequelize');

const dinero = (campo, allowNull = true) => ({
  type: DataTypes.DECIMAL(12, 2),
  allowNull,
  get() {
    const v = this.getDataValue(campo);
    return v === null || v === undefined ? v : Number(v);
  },
});

module.exports = (sequelize) => {
  const Cupon = sequelize.define('Cupon', {
    codigo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      set(v) { this.setDataValue('codigo', String(v).trim().toUpperCase()); },
    },
    descripcion: { type: DataTypes.STRING },
    tipo: { type: DataTypes.ENUM('porcentaje', 'monto'), allowNull: false },
    valor: dinero('valor', false),
    minimoCompra: dinero('minimoCompra'),
    desde: { type: DataTypes.DATE },
    hasta: { type: DataTypes.DATE },
    usosMaximos: { type: DataTypes.INTEGER },
    usos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'Cupones',
  });

  return Cupon;
};
