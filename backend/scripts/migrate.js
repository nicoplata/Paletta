// Uso: npm run db:migrate            (aplica migraciones pendientes)
//      npm run db:migrate -- down    (revierte la última)
//      npm run db:migrate -- status
const { migrator, sequelize } = require('../src/db/migrator');

(async () => {
  const accion = process.argv[2] || 'up';
  try {
    if (accion === 'down') {
      await migrator.down();
    } else if (accion === 'status') {
      const ejecutadas = await migrator.executed();
      const pendientes = await migrator.pending();
      console.log('Ejecutadas:', ejecutadas.map((m) => m.name));
      console.log('Pendientes:', pendientes.map((m) => m.name));
    } else {
      await migrator.up();
      console.log('Migraciones aplicadas.');
    }
  } catch (error) {
    console.error('Error en migraciones:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
