// Producción (entrega 2): talleres externos, órdenes de taller, etapa de cada prenda
// y contrato firmado de la promo (archivo privado).
module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.createTable('ProdTalleres', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        nombre: { type: S.STRING(120), allowNull: false },
        contacto: { type: S.STRING(120) },
        telefono: { type: S.STRING(30) },
        direccion: { type: S.STRING(200) },
        notas: { type: S.STRING(1000) },
        activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, t);

      await qi.createTable('ProdOrdenes', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        prendaId: { type: S.INTEGER, allowNull: false, references: { model: 'EgrPrendas', key: 'id' }, onDelete: 'CASCADE' },
        tallerId: { type: S.INTEGER, allowNull: false, references: { model: 'ProdTalleres', key: 'id' }, onDelete: 'RESTRICT' },
        cantidades: { type: S.JSONB, allowNull: false, defaultValue: {} },
        recibidas: { type: S.JSONB, allowNull: false, defaultValue: {} },
        falladas: { type: S.JSONB, allowNull: false, defaultValue: {} },
        precioUnitario: { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        estado: { type: S.ENUM('preparando', 'enviada', 'recibida'), allowNull: false, defaultValue: 'preparando' },
        enviadaEl: { type: S.DATEONLY },
        compromisoEl: { type: S.DATEONLY },
        recibidaEl: { type: S.DATEONLY },
        notas: { type: S.TEXT },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, t);
      await qi.addIndex('ProdOrdenes', ['prendaId'], t);
      await qi.addIndex('ProdOrdenes', ['tallerId'], t);

      await qi.addColumn('EgrPrendas', 'etapa', { type: S.STRING(20), allowNull: false, defaultValue: 'pendiente' }, t);
      await qi.addColumn('EgrPrendas', 'seguimiento', { type: S.JSONB, allowNull: false, defaultValue: {} }, t);

      await qi.addColumn('EgrPromos', 'contratoArchivo', { type: S.STRING }, t);
      await qi.addColumn('EgrPromos', 'contratoTipo', { type: S.STRING(40) }, t);
      await qi.addColumn('EgrPromos', 'contratoSubidoEl', { type: S.DATE }, t);
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.removeColumn('EgrPromos', 'contratoSubidoEl', t);
      await qi.removeColumn('EgrPromos', 'contratoTipo', t);
      await qi.removeColumn('EgrPromos', 'contratoArchivo', t);
      await qi.removeColumn('EgrPrendas', 'seguimiento', t);
      await qi.removeColumn('EgrPrendas', 'etapa', t);
      await qi.dropTable('ProdOrdenes', t);
      await qi.dropTable('ProdTalleres', t);
      await qi.sequelize.query('DROP TYPE IF EXISTS "enum_ProdOrdenes_estado";', t);
    });
  },
};
