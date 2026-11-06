const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

const ESTADOS_PRODUCCION = ['pendiente', 'en_produccion', 'listo', 'entregado'];
const EgrPromoNormalizar = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

module.exports = (sequelize) => {
  const EgrPromo = sequelize.define('EgrPromo', {
    // Identificador aleatorio del link que comparte la comisión (egresados.paletta.com.ar/mi-promo/<slug>)
    slug: { type: DataTypes.STRING(24), allowNull: false, unique: true },
    // Código de contrato que cargan familias y comisión en egresados.paletta.com.ar/mi-promo (ej.: EGR27-K7M2)
    codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      set(v) {
        const codigo = String(v).trim().toUpperCase().replace(/\s+/g, '');
        this.setDataValue('codigo', codigo);
        this.setDataValue('codigoBusqueda', EgrPromoNormalizar(codigo));
      },
    },
    // El mismo código sin guiones ni espacios: así "egr27 k7m2" encuentra "EGR27-K7M2"
    codigoBusqueda: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    // Clave numérica de 6 dígitos con la que entra la comisión
    comisionClave: { type: DataTypes.STRING(6), allowNull: false },
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
    disenoAprobadoPor: { type: DataTypes.STRING(120) },
    // Link secreto del tablero de la comisión (egresados.paletta.com.ar/mi-promo/comision/<token>)
    comisionToken: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    // [{ nombre, telefono }] — quienes forman la comisión (los cargan ellos en el tablero)
    comisionIntegrantes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    fechaEntrega: { type: DataTypes.DATEONLY },
    notas: { type: DataTypes.TEXT },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'EgrPromos' });

  EgrPromo.ESTADOS_PRODUCCION = ESTADOS_PRODUCCION;
  EgrPromo.normalizarCodigo = EgrPromoNormalizar;
  EgrPromo.associate = (m) => {
    EgrPromo.hasMany(m.EgrPrenda, { foreignKey: 'promoId', as: 'prendas' });
    EgrPromo.hasMany(m.EgrAlumno, { foreignKey: 'promoId', as: 'alumnos' });
    EgrPromo.hasMany(m.EgrDiseno, { foreignKey: 'promoId', as: 'disenos' });
  };
  return EgrPromo;
};
