// Galería: se guarda el original de cada foto (para poder reprocesarla) y su tamaño real
// (para avisar en el panel cuando tiene poca resolución).
module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      await qi.addColumn('EgrFotos', 'original', { type: S.STRING(120) }, { transaction });
      await qi.addColumn('EgrFotos', 'anchoOriginal', { type: S.INTEGER }, { transaction });
      await qi.addColumn('EgrFotos', 'altoOriginal', { type: S.INTEGER }, { transaction });
    });
  },
  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      for (const c of ['altoOriginal', 'anchoOriginal', 'original']) await qi.removeColumn('EgrFotos', c, { transaction });
    });
  },
};
