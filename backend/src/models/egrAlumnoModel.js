const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

module.exports = (sequelize) => {
  const EgrAlumno = sequelize.define('EgrAlumno', {
    promoId: { type: DataTypes.INTEGER, allowNull: false },
    // Número dentro de la promo (forma parte del código de las cuotas)
    numero: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    dni: { type: DataTypes.STRING(8) },
    responsableNombre: { type: DataTypes.STRING(120) },
    responsableEmail: { type: DataTypes.STRING },
    responsableTelefono: { type: DataTypes.STRING(30) },
    plan: { type: DataTypes.INTEGER },
    // Ajuste manual del total (+ recargo / − bonificación), solo desde el panel
    ajuste: dinero('ajuste', { allowNull: false, defaultValue: 0 }),
    ajusteMotivo: { type: DataTypes.STRING },
    agregadoPorFamilia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ultimoIngreso: { type: DataTypes.DATE },
  }, { tableName: 'EgrAlumnos' });

  EgrAlumno.associate = (m) => {
    EgrAlumno.belongsTo(m.EgrPromo, { foreignKey: 'promoId', as: 'promo' });
    EgrAlumno.hasMany(m.EgrSeleccion, { foreignKey: 'alumnoId', as: 'selecciones' });
    EgrAlumno.hasMany(m.EgrCuota, { foreignKey: 'alumnoId', as: 'cuotas' });
  };
  return EgrAlumno;
};
