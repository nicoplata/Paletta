const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

module.exports = (sequelize) => {
  const EgrCuota = sequelize.define('EgrCuota', {
    alumnoId: { type: DataTypes.INTEGER, allowNull: false },
    numero: { type: DataTypes.INTEGER, allowNull: false },
    importe: dinero('importe', { allowNull: false }),
    vencimiento: { type: DataTypes.DATEONLY, allowNull: false },
    // informada = la familia subió un comprobante y Paletta lo está revisando
    estado: { type: DataTypes.ENUM('pendiente', 'informada', 'pagada'), allowNull: false, defaultValue: 'pendiente' },
    pagadaEl: { type: DataTypes.DATEONLY },
    medio: { type: DataTypes.ENUM('efectivo', 'transferencia') },
    // Recargo efectivamente cobrado (se fija al registrar el pago)
    recargo: dinero('recargo', { allowNull: false, defaultValue: 0 }),
    nota: { type: DataTypes.STRING },
  }, { tableName: 'EgrCuotas' });

  EgrCuota.associate = (m) => {
    EgrCuota.belongsTo(m.EgrAlumno, { foreignKey: 'alumnoId', as: 'alumno' });
    EgrCuota.hasMany(m.EgrComprobante, { foreignKey: 'cuotaId', as: 'comprobantes' });
  };
  return EgrCuota;
};
