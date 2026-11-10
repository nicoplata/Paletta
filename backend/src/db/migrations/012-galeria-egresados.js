// Galería de buzos de egresados: fotos que se suben desde el panel (optimizadas a WebP)
// y que el sitio egresados.paletta.com.ar muestra sin tener que redeployar.
module.exports = {
  async up(qi, S) {
    await qi.createTable('EgrFotos', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      archivo: { type: S.STRING(80), allowNull: false, unique: true },
      ancho: { type: S.INTEGER, allowNull: false },
      alto: { type: S.INTEGER, allowNull: false },
      tipo: { type: S.ENUM('promo', 'diseno'), allowNull: false, defaultValue: 'promo' },
      anio: { type: S.STRING(4) },
      colegio: { type: S.STRING(150) },
      alt: { type: S.STRING(200), allowNull: false, defaultValue: '' },
      diseno: { type: S.STRING(200) },
      orden: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      visible: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: S.DATE, allowNull: false },
      updatedAt: { type: S.DATE, allowNull: false },
    });
    await qi.addIndex('EgrFotos', ['visible', 'orden']);
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      await qi.dropTable('EgrFotos', { transaction });
      await qi.sequelize.query('DROP TYPE IF EXISTS "enum_EgrFotos_tipo";', { transaction });
    });
  },
};
