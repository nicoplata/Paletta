// Configuración de pm2 para el backend.
// Uso (desde la raíz del repo en la VPS):
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save && pm2 startup
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'paletta-api',
      cwd: path.join(__dirname, '..', 'backend'),
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
      time: true,
    },
  ],
};
