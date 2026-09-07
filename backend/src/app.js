const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const ENV = require('./config/env');
const { verificarToken } = require('./middleware/auth');
const app = express();

// 📁 Servir imágenes públicas
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));
app.use('/imagenes', express.static(path.join(__dirname, '..', 'public', 'imagenes')));


// 🛡️ CORS correctamente configurado

const allowedOrigins = ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 📦 Parseo de JSON
app.use(express.json());

// 🔐 Rutas públicas
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const imagenesRoutes = require('./routes/imagenes');
app.use('/api/imagenes', imagenesRoutes);

// ✅ Rutas públicas para productos y colegios
const productosRoutes = require('./routes/productos');
app.use('/api/productos', productosRoutes);

const colegiosRoutes = require('./routes/colegios');
app.use('/api/colegios', colegiosRoutes);

// 🔐 Rutas protegidas
const categoriasRoutes = require('./routes/categorias');
app.use('/api/categorias', verificarToken, categoriasRoutes);

const rolesRoutes = require('./routes/roles');
app.use('/roles', verificarToken, rolesRoutes);

const perfilesRoutes = require('./routes/perfiles');
app.use('/perfiles', verificarToken, perfilesRoutes);

const usuariosRoutes = require('./routes/usuarios');
app.use('/api/usuarios', usuariosRoutes);

// 🔄 Sincronizar base de datos
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Base de datos sincronizada');
  })
  .catch((err) => {
    console.error('Error al sincronizar la base de datos:', err);
  });

// 🏠 Ruta base
app.get('/', (req, res) => {
  res.send('¡Backend de Paletta funcionando!');
});

// Add this logging middleware before routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// 🚀 Iniciar servidor
const initializeServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Servidor corriendo en modo ${process.env.NODE_ENV || 'development'} en el puerto ${process.env.PORT || 3000}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

initializeServer();

module.exports = app;
module.exports = app;
module.exports = app;
