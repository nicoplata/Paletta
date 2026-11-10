const { DataTypes } = require('sequelize');
const { dinero } = require('./_dinero');

module.exports = (sequelize) => {
  const EgrPrenda = sequelize.define('EgrPrenda', {
    promoId: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING, allowNull: false },
    descripcion: { type: DataTypes.STRING(500) },
    precio: dinero('precio', { allowNull: false }),
    talles: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    conBordado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Producción: ficha técnica y material elegido para cada pieza/insumo ({ rol: materialId })
    modeloId: { type: DataTypes.INTEGER },
    materiales: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    fichaNotas: { type: DataTypes.TEXT },
    // Seguimiento interno: etapa actual y fecha en que llegó a cada etapa ({ cortado: '2027-05-02' })
    etapa: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
    seguimiento: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  }, { tableName: 'EgrPrendas' });

  EgrPrenda.associate = (m) => {
    EgrPrenda.belongsTo(m.EgrPromo, { foreignKey: 'promoId', as: 'promo' });
    EgrPrenda.belongsTo(m.ProdModelo, { foreignKey: 'modeloId', as: 'modelo' });
    EgrPrenda.hasMany(m.ProdOrden, { foreignKey: 'prendaId', as: 'ordenes' });
  };
  return EgrPrenda;
};
