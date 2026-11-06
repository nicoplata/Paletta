// Diseños guardados desde el diseñador de egresados.paletta.com.ar y pedidos de presupuesto con el diseño adjunto.
module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.createTable('EgrDisenos', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        codigo: { type: S.STRING(12), allowNull: false, unique: true },
        config: { type: S.JSONB, allowNull: false },
        imagen: { type: S.STRING, allowNull: false },
        titulo: { type: S.STRING(160) },
        promoId: { type: S.INTEGER, references: { model: 'EgrPromos', key: 'id' }, onDelete: 'SET NULL' },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, t);
      await qi.addIndex('EgrDisenos', ['promoId'], t);

      await qi.createTable('EgrPresupuestos', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        nombre: { type: S.STRING(120), allowNull: false },
        telefono: { type: S.STRING(30), allowNull: false },
        email: { type: S.STRING },
        colegio: { type: S.STRING(150), allowNull: false },
        curso: { type: S.STRING(60) },
        cantidad: { type: S.INTEGER },
        anio: { type: S.INTEGER },
        mensaje: { type: S.TEXT },
        disenoId: { type: S.INTEGER, references: { model: 'EgrDisenos', key: 'id' }, onDelete: 'SET NULL' },
        promoId: { type: S.INTEGER, references: { model: 'EgrPromos', key: 'id' }, onDelete: 'SET NULL' },
        estado: { type: S.ENUM('nuevo', 'contactado', 'convertido', 'descartado'), allowNull: false, defaultValue: 'nuevo' },
        notas: { type: S.TEXT },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, t);
      await qi.addIndex('EgrPresupuestos', ['estado'], t);
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.dropTable('EgrPresupuestos', t);
      await qi.dropTable('EgrDisenos', t);
      await qi.sequelize.query('DROP TYPE IF EXISTS "enum_EgrPresupuestos_estado";', t);
    });
  },
};
