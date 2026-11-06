// Entrega 3 de egresados: comprobantes de transferencia subidos por las familias.
// La cuota pasa a "informada" mientras Paletta revisa el comprobante.
module.exports = {
  async up(qi, S) {
    // ADD VALUE no se puede usar dentro de la misma transacción en la que se crea: va aparte
    await qi.sequelize.query('ALTER TYPE "enum_EgrCuotas_estado" ADD VALUE IF NOT EXISTS \'informada\';');
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.createTable('EgrComprobantes', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        cuotaId: { type: S.INTEGER, allowNull: false, references: { model: 'EgrCuotas', key: 'id' }, onDelete: 'CASCADE' },
        archivo: { type: S.STRING, allowNull: false },
        nombreOriginal: { type: S.STRING },
        tipo: { type: S.STRING(60), allowNull: false },
        tamano: { type: S.INTEGER, allowNull: false },
        estado: { type: S.ENUM('pendiente', 'aprobado', 'rechazado'), allowNull: false, defaultValue: 'pendiente' },
        motivoRechazo: { type: S.STRING },
        revisadoEl: { type: S.DATE },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, t);
      await qi.addIndex('EgrComprobantes', ['cuotaId'], t);
      await qi.addIndex('EgrComprobantes', ['estado'], t);
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.dropTable('EgrComprobantes', t);
      await qi.sequelize.query('DROP TYPE IF EXISTS "enum_EgrComprobantes_estado";', t);
      // Postgres no permite quitar un valor de un enum: las cuotas informadas vuelven a pendiente
      await qi.sequelize.query('UPDATE "EgrCuotas" SET estado = \'pendiente\' WHERE estado = \'informada\';', t);
    });
  },
};
