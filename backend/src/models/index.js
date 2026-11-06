const { Sequelize } = require('sequelize');
const ENV = require('../config/env');

const opciones = {
  dialect: 'postgres',
  logging: false,
  dialectOptions: ENV.DB_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: { max: 10, min: 0, idle: 10000 },
};

const sequelize = ENV.DATABASE_URL
  ? new Sequelize(ENV.DATABASE_URL, opciones)
  : new Sequelize(ENV.DB_NAME, ENV.DB_USER, ENV.DB_PASSWORD, {
      ...opciones,
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
    });

const db = {
  sequelize,
  Sequelize,
  User: require('./userModel')(sequelize),
  Categoria: require('./categoriaModel')(sequelize),
  Colegio: require('./colegioModel')(sequelize),
  Producto: require('./productoModel')(sequelize),
  Imagen: require('./imagenModel')(sequelize),
  MensajeContacto: require('./mensajeContactoModel')(sequelize),
  Variante: require('./varianteModel')(sequelize),
  Pedido: require('./pedidoModel')(sequelize),
  PedidoItem: require('./pedidoItemModel')(sequelize),
  Cupon: require('./cuponModel')(sequelize),
  ZonaEnvio: require('./zonaEnvioModel')(sequelize),
  Configuracion: require('./configuracionModel')(sequelize),
  EgrPromo: require('./egrPromoModel')(sequelize),
  EgrPrenda: require('./egrPrendaModel')(sequelize),
  EgrAlumno: require('./egrAlumnoModel')(sequelize),
  EgrSeleccion: require('./egrSeleccionModel')(sequelize),
  EgrCuota: require('./egrCuotaModel')(sequelize),
  EgrAviso: require('./egrAvisoModel')(sequelize),
  EgrComprobante: require('./egrComprobanteModel')(sequelize),
};

Object.values(db).forEach((model) => {
  if (model && typeof model.associate === 'function') {
    model.associate(db);
  }
});

module.exports = db;
