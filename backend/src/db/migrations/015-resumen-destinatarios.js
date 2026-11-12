// Quién recibe el resumen diario por mail: se elige por usuario desde el panel (por defecto nadie)
module.exports = {
  async up(qi, S) {
    await qi.addColumn('Users', 'recibeResumen', { type: S.BOOLEAN, allowNull: false, defaultValue: false });
  },
  async down(qi) {
    await qi.removeColumn('Users', 'recibeResumen');
  },
};
