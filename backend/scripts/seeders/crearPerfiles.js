const { sequelize, Perfil } = require('../../src/models');

async function crearPerfilesIniciales() {
  try {
    await sequelize.sync();

    const perfiles = [
      { nombre: 'Administrador', descripcion: 'Acceso total al sistema', rol: 'administrador' },
      { nombre: 'Usuario', descripcion: 'Acceso limitado a funciones operativas', rol: 'usuario' }
    ];

    for (const perfil of perfiles) {
      await Perfil.findOrCreate({ where: { rol: perfil.rol }, defaults: perfil });
    }

    console.log('Perfiles creados o ya existentes');
    process.exit();
  } catch (error) {
    console.error('Error al crear perfiles:', error);
    process.exit(1);
  }
}

crearPerfilesIniciales();
