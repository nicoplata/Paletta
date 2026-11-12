// Rol "encargado" (trabajo diario en el panel), registro de actividad de acciones del panel
// y notificaciones internas (campanita del admin).
module.exports = {
  async up(qi, S) {
    // ADD VALUE no puede ir dentro de una transacción junto con su uso: va solo
    await qi.sequelize.query('ALTER TYPE "enum_Users_rol" ADD VALUE IF NOT EXISTS \'encargado\';');
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.addColumn('Users', 'notifLeidasHasta', { type: S.DATE }, t);
      await qi.createTable('Actividades', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        usuarioId: { type: S.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'SET NULL' },
        usuarioNombre: { type: S.STRING(120) },
        rol: { type: S.STRING(20) },
        accion: { type: S.STRING(60), allowNull: false },
        descripcion: { type: S.STRING(500), allowNull: false },
        detalle: { type: S.JSONB },
        sensible: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        ip: { type: S.STRING(60) },
        createdAt: { type: S.DATE, allowNull: false },
      }, t);
      await qi.addIndex('Actividades', ['createdAt'], t);
      await qi.createTable('Notificaciones', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        tipo: { type: S.STRING(40), allowNull: false },
        titulo: { type: S.STRING(200), allowNull: false },
        texto: { type: S.STRING(500) },
        link: { type: S.STRING(300) },
        clave: { type: S.STRING(120), unique: true },
        soloAdmin: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { type: S.DATE, allowNull: false },
      }, t);
      await qi.addIndex('Notificaciones', ['createdAt'], t);
    });
  },

  async down(qi) {
    await qi.sequelize.transaction(async (transaction) => {
      const t = { transaction };
      await qi.dropTable('Notificaciones', t);
      await qi.dropTable('Actividades', t);
      await qi.removeColumn('Users', 'notifLeidasHasta', t);
      // El valor 'encargado' del enum queda (Postgres no permite quitar valores); se pasa a "usuario"
      await qi.sequelize.query('UPDATE "Users" SET rol = \'usuario\' WHERE rol = \'encargado\';', t);
    });
  },
};
