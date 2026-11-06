const { DataTypes } = require('sequelize');

// Recordatorio ya enviado a una familia (clave única por alumno: no se repite)
module.exports = (sequelize) => {
  const EgrAviso = sequelize.define('EgrAviso', {
    alumnoId: { type: DataTypes.INTEGER, allowNull: false },
    clave: { type: DataTypes.STRING(60), allowNull: false },
    email: { type: DataTypes.STRING },
  }, { tableName: 'EgrAvisos' });
  return EgrAviso;
};
