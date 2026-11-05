// Cambios de la Fase 0: precio como DECIMAL, productos activables,
// colegios.activo NOT NULL, índices y tabla de mensajes de contacto.
module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async (transaction) => {
      await qi.sequelize.query(
        'ALTER TABLE "Productos" ALTER COLUMN "precio" TYPE NUMERIC(12,2) USING ROUND("precio"::numeric, 2);',
        { transaction }
      );

      const productos = await qi.describeTable('Productos', { transaction });
      if (!productos.activo) {
        await qi.addColumn('Productos', 'activo', {
          type: S.BOOLEAN, allowNull: false, defaultValue: true,
        }, { transaction });
      }

      await qi.sequelize.query('UPDATE "Colegios" SET "activo" = true WHERE "activo" IS NULL;', { transaction });
      await qi.changeColumn('Colegios', 'activo', {
        type: S.BOOLEAN, allowNull: false, defaultValue: true,
      }, { transaction });

      await qi.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "imagenes_entidad" ON "Imagenes" ("tipoEntidad", "entidadId");',
        { transaction }
      );
      await qi.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "productos_colegio" ON "Productos" ("colegioId");',
        { transaction }
      );
      await qi.sequelize.query(
        'CREATE INDEX IF NOT EXISTS "productos_categoria" ON "Productos" ("categoriaId");',
        { transaction }
      );

      await qi.createTable('MensajesContacto', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        nombre: { type: S.STRING, allowNull: false },
        email: { type: S.STRING, allowNull: false },
        telefono: { type: S.STRING },
        mensaje: { type: S.TEXT, allowNull: false },
        leido: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { type: S.DATE, allowNull: false },
        updatedAt: { type: S.DATE, allowNull: false },
      }, { transaction });
    });
  },

  async down(qi, S) {
    await qi.dropTable('MensajesContacto');
    await qi.removeColumn('Productos', 'activo');
    await qi.changeColumn('Productos', 'precio', { type: S.FLOAT, allowNull: false });
  },
};
