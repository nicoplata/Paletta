const { DataTypes } = require('sequelize');

// Comprobante de transferencia subido por una familia (el archivo se guarda fuera de la carpeta pública)
module.exports = (sequelize) => {
  const EgrComprobante = sequelize.define('EgrComprobante', {
    cuotaId: { type: DataTypes.INTEGER, allowNull: false },
    archivo: { type: DataTypes.STRING, allowNull: false },
    nombreOriginal: { type: DataTypes.STRING },
    tipo: { type: DataTypes.STRING(60), allowNull: false },
    tamano: { type: DataTypes.INTEGER, allowNull: false },
    estado: { type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'), allowNull: false, defaultValue: 'pendiente' },
    motivoRechazo: { type: DataTypes.STRING },
    revisadoEl: { type: DataTypes.DATE },
  }, { tableName: 'EgrComprobantes' });

  EgrComprobante.associate = (m) => {
    EgrComprobante.belongsTo(m.EgrCuota, { foreignKey: 'cuotaId', as: 'cuota' });
  };
  return EgrComprobante;
};
