// Mejoras de la tienda: cupones de descuento, zonas de envío por código postal
// y columnas de descuento en los pedidos.
const timestamps = (S) => ({
  createdAt: { type: S.DATE, allowNull: false },
  updatedAt: { type: S.DATE, allowNull: false },
});

module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };

      await qi.createTable('Cupones', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        codigo: { type: S.STRING(40), allowNull: false, unique: true },
        descripcion: { type: S.STRING },
        tipo: { type: S.ENUM('porcentaje', 'monto'), allowNull: false },
        valor: { type: S.DECIMAL(12, 2), allowNull: false },
        minimoCompra: { type: S.DECIMAL(12, 2) },
        desde: { type: S.DATE },
        hasta: { type: S.DATE },
        usosMaximos: { type: S.INTEGER },
        usos: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(S),
      }, t);
      await qi.sequelize.query('ALTER TABLE "Cupones" ADD CONSTRAINT "cupones_usos_no_negativo" CHECK ("usos" >= 0);', t);

      await qi.createTable('ZonasEnvio', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        nombre: { type: S.STRING, allowNull: false },
        cpDesde: { type: S.INTEGER, allowNull: false },
        cpHasta: { type: S.INTEGER, allowNull: false },
        costo: { type: S.DECIMAL(12, 2), allowNull: false },
        demora: { type: S.STRING },
        activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(S),
      }, t);
      await qi.sequelize.query('ALTER TABLE "ZonasEnvio" ADD CONSTRAINT "zonas_rango_valido" CHECK ("cpDesde" <= "cpHasta");', t);

      await qi.addColumn('Pedidos', 'cuponCodigo', { type: S.STRING(40) }, t);
      await qi.addColumn('Pedidos', 'descuento', { type: S.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, t);
      await qi.addColumn('Pedidos', 'zonaEnvio', { type: S.STRING }, t);
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.removeColumn('Pedidos', 'zonaEnvio', t);
      await qi.removeColumn('Pedidos', 'descuento', t);
      await qi.removeColumn('Pedidos', 'cuponCodigo', t);
      await qi.dropTable('ZonasEnvio', t);
      await qi.dropTable('Cupones', t);
      await qi.sequelize.query('DROP TYPE IF EXISTS "enum_Cupones_tipo";', t);
    });
  },
};
