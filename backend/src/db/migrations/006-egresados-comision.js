// Entrega 2 de egresados: tablero de la comisión (link propio, integrantes, aprobación del diseño)
// y registro de recordatorios enviados por mail (para no repetirlos).
module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.addColumn('EgrPromos', 'comisionToken', { type: S.STRING(32) }, t);
      await qi.addColumn('EgrPromos', 'comisionIntegrantes', { type: S.JSONB, allowNull: false, defaultValue: [] }, t);
      await qi.addColumn('EgrPromos', 'disenoAprobadoPor', { type: S.STRING(120) }, t);
      // Las promos existentes reciben su link de comisión
      const [promos] = await qi.sequelize.query('SELECT id FROM "EgrPromos"', t);
      const crypto = require('crypto');
      for (const { id } of promos) {
        await qi.sequelize.query('UPDATE "EgrPromos" SET "comisionToken" = :tk WHERE id = :id', {
          replacements: { tk: crypto.randomBytes(16).toString('base64url'), id }, ...t,
        });
      }
      await qi.changeColumn('EgrPromos', 'comisionToken', { type: S.STRING(32), allowNull: false }, t);
      await qi.addIndex('EgrPromos', ['comisionToken'], { unique: true, ...t });

      await qi.createTable('EgrAvisos', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        alumnoId: { type: S.INTEGER, allowNull: false, references: { model: 'EgrAlumnos', key: 'id' }, onDelete: 'CASCADE' },
        clave: { type: S.STRING(60), allowNull: false },
        email: { type: S.STRING },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, t);
      await qi.addIndex('EgrAvisos', ['alumnoId', 'clave'], { unique: true, ...t });
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.dropTable('EgrAvisos', t);
      await qi.removeIndex('EgrPromos', ['comisionToken'], t);
      await qi.removeColumn('EgrPromos', 'disenoAprobadoPor', t);
      await qi.removeColumn('EgrPromos', 'comisionIntegrantes', t);
      await qi.removeColumn('EgrPromos', 'comisionToken', t);
    });
  },
};
