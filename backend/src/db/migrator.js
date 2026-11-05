const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const { sequelize, Sequelize } = require('../models');

const migrator = new Umzug({
  migrations: {
    glob: ['migrations/*.js', { cwd: path.join(__dirname) }],
    resolve: ({ name, path: ruta, context }) => {
      const migracion = require(ruta);
      return {
        name,
        up: async () => migracion.up(context, Sequelize),
        down: async () => migracion.down(context, Sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
  logger: console,
});

module.exports = { migrator, sequelize };
