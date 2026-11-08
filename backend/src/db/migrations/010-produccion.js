// Producción de egresados: catálogo de materiales (telas e insumos), fichas técnicas por modelo
// (consumo de tela por talle) y materiales asignados a cada prenda de una promo.
module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.createTable('ProdMateriales', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        nombre: { type: S.STRING(120), allowNull: false },
        tipo: { type: S.ENUM('tela', 'insumo'), allowNull: false },
        color: { type: S.STRING(60) },
        unidad: { type: S.STRING(12), allowNull: false },
        ancho: { type: S.DECIMAL(6, 2) },
        proveedor: { type: S.STRING(120) },
        precio: { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        stock: { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        notas: { type: S.STRING(500) },
        activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, t);

      await qi.createTable('ProdModelos', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        nombre: { type: S.STRING(120), allowNull: false },
        categoria: { type: S.STRING(40) },
        talles: { type: S.JSONB, allowNull: false, defaultValue: [] },
        piezas: { type: S.JSONB, allowNull: false, defaultValue: [] },
        insumos: { type: S.JSONB, allowNull: false, defaultValue: [] },
        desperdicio: { type: S.DECIMAL(5, 2), allowNull: false, defaultValue: 5 },
        costoConfeccion: { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        pasos: { type: S.TEXT },
        notas: { type: S.TEXT },
        activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, t);

      await qi.addColumn('EgrPrendas', 'modeloId', { type: S.INTEGER, references: { model: 'ProdModelos', key: 'id' }, onDelete: 'SET NULL' }, t);
      await qi.addColumn('EgrPrendas', 'materiales', { type: S.JSONB, allowNull: false, defaultValue: {} }, t);
      await qi.addColumn('EgrPrendas', 'fichaNotas', { type: S.TEXT }, t);
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.removeColumn('EgrPrendas', 'fichaNotas', t);
      await qi.removeColumn('EgrPrendas', 'materiales', t);
      await qi.removeColumn('EgrPrendas', 'modeloId', t);
      await qi.dropTable('ProdModelos', t);
      await qi.dropTable('ProdMateriales', t);
      await qi.sequelize.query('DROP TYPE IF EXISTS "enum_ProdMateriales_tipo";', t);
    });
  },
};
