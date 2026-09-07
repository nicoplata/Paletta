const { Sequelize } = require('sequelize');
const config = require('../config/config.js')['development'];

let sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect
  }
);

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Model definitions
db.User = require('./userModel')(sequelize);
db.Producto = require('./productoModel')(sequelize);
db.Categoria = require('./categoriaModel')(sequelize);
db.Colegio = require('./colegioModel')(sequelize);
db.Imagen = require('./imagenModel')(sequelize);

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName] && db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;