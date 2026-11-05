// Esquema inicial. Es idempotente (CREATE TABLE IF NOT EXISTS) para que funcione
// tanto en una base nueva como en una creada por el antiguo sequelize.sync().
const timestamps = (S) => ({
  createdAt: { type: S.DATE, allowNull: false },
  updatedAt: { type: S.DATE, allowNull: false },
});

module.exports = {
  async up(qi, S) {
    await qi.createTable('Users', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: S.STRING, allowNull: false },
      email: { type: S.STRING, allowNull: false, unique: true },
      password: { type: S.STRING, allowNull: false },
      rol: { type: S.ENUM('administrador', 'usuario'), defaultValue: 'usuario' },
      ...timestamps(S),
    });

    await qi.createTable('Categorias', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: S.STRING, allowNull: false },
      descripcion: { type: S.TEXT },
      ...timestamps(S),
    });

    await qi.createTable('Colegios', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: S.STRING, allowNull: false },
      ciudad: { type: S.STRING, allowNull: false },
      alias: { type: S.STRING },
      nivel: { type: S.ARRAY(S.STRING), allowNull: false, defaultValue: [] },
      activo: { type: S.BOOLEAN, defaultValue: true },
      grupoInstitucional: { type: S.STRING },
      ...timestamps(S),
    });

    await qi.createTable('Productos', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      nombre: { type: S.STRING, allowNull: false },
      descripcion: { type: S.TEXT },
      precio: { type: S.FLOAT, allowNull: false },
      stock: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      categoriaId: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: 'Categorias', key: 'id' },
      },
      colegioId: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: 'Colegios', key: 'id' },
      },
      ...timestamps(S),
    });

    await qi.createTable('Imagenes', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      url: { type: S.STRING, allowNull: false },
      descripcion: { type: S.STRING },
      tipoEntidad: { type: S.STRING, allowNull: false },
      entidadId: { type: S.INTEGER, allowNull: false },
      ...timestamps(S),
    });
  },

  async down(qi) {
    await qi.dropTable('Imagenes', {});
    await qi.dropTable('Productos', {});
    await qi.dropTable('Colegios', {});
    await qi.dropTable('Categorias', {});
    await qi.dropTable('Users', {});
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_Users_rol";');
  },
};
