// Entrada única al portal: cada promo tiene un código de contrato legible (lo cargan familias y comisión)
// y la comisión entra con una clave numérica corta en lugar de un link secreto.
const crypto = require('crypto');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I/L
const normalizar = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');

module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.addColumn('EgrPromos', 'codigo', { type: S.STRING(20) }, t);
      await qi.addColumn('EgrPromos', 'codigoBusqueda', { type: S.STRING(20) }, t);
      await qi.addColumn('EgrPromos', 'comisionClave', { type: S.STRING(6) }, t);
      const [promos] = await qi.sequelize.query('SELECT id, anio FROM "EgrPromos"', t);
      for (const p of promos) {
        let sufijo = '';
        for (let i = 0; i < 4; i += 1) sufijo += ALFABETO[crypto.randomInt(ALFABETO.length)];
        const codigo = `EGR${String(p.anio).slice(-2)}-${sufijo}`;
        await qi.sequelize.query('UPDATE "EgrPromos" SET codigo = :codigo, "codigoBusqueda" = :busqueda, "comisionClave" = :clave WHERE id = :id', {
          replacements: { codigo, busqueda: normalizar(codigo), clave: String(crypto.randomInt(100000, 1000000)), id: p.id }, ...t,
        });
      }
      await qi.changeColumn('EgrPromos', 'codigo', { type: S.STRING(20), allowNull: false }, t);
      await qi.changeColumn('EgrPromos', 'codigoBusqueda', { type: S.STRING(20), allowNull: false }, t);
      await qi.changeColumn('EgrPromos', 'comisionClave', { type: S.STRING(6), allowNull: false }, t);
      await qi.addIndex('EgrPromos', ['codigoBusqueda'], { unique: true, ...t });
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.removeIndex('EgrPromos', ['codigoBusqueda'], t);
      await qi.removeColumn('EgrPromos', 'comisionClave', t);
      await qi.removeColumn('EgrPromos', 'codigoBusqueda', t);
      await qi.removeColumn('EgrPromos', 'codigo', t);
    });
  },
};
