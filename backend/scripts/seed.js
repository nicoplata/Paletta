// Crea (o actualiza) el usuario administrador y las categorías base.
// Uso: ADMIN_EMAIL=admin@paletta.com.ar ADMIN_PASSWORD='...' npm run seed
const { sequelize, User, Categoria } = require('../src/models');

const CATEGORIAS_BASE = ['Campera', 'Buzo', 'Pantalón', 'Remera'];

(async () => {
  try {
    const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE = 'Administrador' } = process.env;

    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      if (ADMIN_PASSWORD.length < 10) {
        throw new Error('ADMIN_PASSWORD debe tener al menos 10 caracteres.');
      }
      const existente = await User.findOne({ where: { email: ADMIN_EMAIL.toLowerCase() } });
      if (existente) {
        await existente.update({ password: ADMIN_PASSWORD, rol: 'administrador' });
        console.log(`Administrador actualizado: ${ADMIN_EMAIL}`);
      } else {
        await User.create({ nombre: ADMIN_NOMBRE, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, rol: 'administrador' });
        console.log(`Administrador creado: ${ADMIN_EMAIL}`);
      }
    } else {
      console.log('ADMIN_EMAIL / ADMIN_PASSWORD no definidos: no se crea administrador.');
    }

    if ((await Categoria.count()) === 0) {
      await Categoria.bulkCreate(CATEGORIAS_BASE.map((nombre) => ({ nombre })));
      console.log('Categorías base creadas.');
    }
  } catch (error) {
    console.error('Error en seed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
