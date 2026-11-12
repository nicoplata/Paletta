const app = require('./app');
const ENV = require('./config/env');
const { sequelize } = require('./models');
const { migrator } = require('./db/migrator');

async function iniciar() {
  try {
    await sequelize.authenticate();
    const pendientes = await migrator.pending();
    if (pendientes.length > 0) {
      console.warn(`⚠️  Hay ${pendientes.length} migración(es) pendiente(s). Ejecutá "npm run db:migrate".`);
    }
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error.message);
    process.exit(1);
  }

  // Cada 5 minutos se cancelan los pedidos impagos vencidos y se libera su stock.
  const { vencerPendientes } = require('./services/pedidos');
  const tareaVencimientos = setInterval(() => {
    vencerPendientes()
      .then((n) => { if (n) console.log(`Pedidos vencidos cancelados: ${n}`); })
      .catch((err) => console.error('Error al vencer pedidos:', err.message));
  }, 5 * 60 * 1000);
  tareaVencimientos.unref();

  // Recordatorios por mail a las familias de egresados (cierre de carga y cuotas)
  require('./services/recordatoriosEgresados').programarRecordatorios();

  // Feed de Instagram de @paletta.egresados (si hay token cargado)
  require('./services/instagram').programarInstagram();

  // Avisos de órdenes atrasadas y resumen diario por mail al equipo del panel
  require('./services/resumenDiario').programarResumen();

  const server = app.listen(ENV.PORT, () => {
    console.log(`Paletta API escuchando en el puerto ${ENV.PORT} (${ENV.NODE_ENV})`);
  });

  const cerrar = (senal) => {
    console.log(`${senal} recibido, cerrando...`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => cerrar('SIGTERM'));
  process.on('SIGINT', () => cerrar('SIGINT'));
}

iniciar();
