const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { db, resetearBase, cerrar } = require('./helpers');
const { migrator } = require('../src/db/migrator');

describe('Migraciones', () => {
  before(resetearBase);
  after(cerrar);

  it('no quedan migraciones pendientes', async () => {
    assert.deepEqual(await migrator.pending(), []);
  });

  it('se pueden revertir y volver a aplicar', async () => {
    await migrator.down({ to: 0 });
    assert.equal((await migrator.executed()).length, 0);
    await migrator.up();
    assert.deepEqual(await migrator.pending(), []);
  });

  it('el esquema coincide con los modelos (precio decimal, columnas nuevas)', async () => {
    const productos = await db.sequelize.getQueryInterface().describeTable('Productos');
    const [[precio]] = await db.sequelize.query(
      `SELECT data_type, numeric_precision, numeric_scale FROM information_schema.columns
       WHERE table_name = 'Productos' AND column_name = 'precio'`
    );
    assert.deepEqual(precio, { data_type: 'numeric', numeric_precision: 12, numeric_scale: 2 });
    assert.ok(productos.activo);
    const mensajes = await db.sequelize.getQueryInterface().describeTable('MensajesContacto');
    assert.ok(mensajes.leido);
  });

  it('la migración inicial es idempotente sobre tablas existentes', async () => {
    await db.sequelize.query('DELETE FROM "SequelizeMeta"');
    await migrator.up({ to: '001-esquema-inicial.js' });
    assert.equal((await migrator.executed()).length, 1);
    await db.sequelize.query('INSERT INTO "SequelizeMeta"(name) VALUES (\'002-fase0-produccion.js\')');
  });
});
