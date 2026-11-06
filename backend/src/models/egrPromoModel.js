const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

const ESTADOS_PRODUCCION = ['pendiente', 'en_produccion', 'listo', 'entregado'];

module.exports = (sequelize) => {
  const EgrPromo = sequelize.define('EgrPromo', {
    // Identificador aleatorio del link que comparte la comisión (egresados.paletta.com.ar/mi-promo/<slug>)
    slug: { type: DataTypes.STRING(24), allowNull: false, unique: true },
    colegio: { type: DataTypes.STRING, allowNull: false },
    curso: { type: DataTypes.STRING(60), allowNull: false },
    anio: { type: DataTypes.INTEGER, allowNull: false },
    // Cantidad de cuotas que puede elegir cada familia (1 = contado en efectivo con descuento)
    planes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [1, 3, 6] },
    descuentoContado: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
      get() { return Number(this.getDataValue('descuentoContado')); },
    },
    recargoTipo: { type: DataTypes.ENUM('porcentaje', 'monto') },
    recargoValor: dinero('recargoValor'),
    primerVencimiento: { type: DataTypes.DATEONLY, allowNull: false },
    fechaCierre: { type: DataTypes.DATEONLY },
    estadoProduccion: { type: DataTypes.ENUM(...ESTADOS_PRODUCCION), allowNull: false, defaultValue: 'pendiente' },
    disenoAprobadoEl: { type: DataTypes.DATE },
    fechaEntrega: { type: DataTypes.DATEONLY },
    notas: { type: DataTypes.TEXT },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'EgrPromos' });

  EgrPromo.ESTADOS_PRODUCCION = ESTADOS_PRODUCCION;
  EgrPromo.associate = (m) => {
    EgrPromo.hasMany(m.EgrPrenda, { foreignKey: 'promoId', as: 'prendas' });
    EgrPromo.hasMany(m.EgrAlumno, { foreignKey: 'promoId', as: 'alumnos' });
  };
  return EgrPromo;
};
