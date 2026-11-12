// Configuración común de los tests de integración.
// Usan una base Postgres real (TEST_DB_NAME, por defecto "paletta_test") que se recrea en cada archivo.
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'paletta_test';
process.env.JWT_SECRET = 'secreto-de-tests-con-mas-de-32-caracteres!!';
process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'paletta-uploads-'));
process.env.PRIVADO_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'paletta-privado-'));
delete process.env.MAIL_HOST; // nunca enviar mails desde los tests

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');
const { migrator } = require('../src/db/migrator');

const ADMIN = { nombre: 'Admin', email: 'admin@test.com', password: 'ClaveAdmin123', rol: 'administrador' };
const OPERADOR = { nombre: 'Operador', email: 'op@test.com', password: 'ClaveOperador123', rol: 'usuario' };
const ENCARGADO = { nombre: 'Encargada', email: 'encargada@test.com', password: 'ClaveEncargada123', rol: 'encargado' };

async function resetearBase() {
  await db.sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrator.up();
}

async function crearUsuario(datos) {
  return db.User.create(datos);
}

async function tokenDe({ email, password }) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login falló: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

// Prepara base limpia + admin + operador y devuelve los headers de cada uno.
async function confirmacionDe(token, password) {
  const res = await request(app).post('/api/auth/confirmar').set({ Authorization: `Bearer ${token}` }).send({ password });
  if (res.status !== 200) throw new Error(`Confirmación falló: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

// Prepara base limpia + admin + encargada + operador y devuelve los headers de cada uno.
// "admin" ya viene con la contraseña confirmada (acciones sensibles); "adminSinConfirmar" no.
async function prepararEscenario() {
  await resetearBase();
  await crearUsuario(ADMIN);
  await crearUsuario(OPERADOR);
  await crearUsuario(ENCARGADO);
  const tokenAdmin = await tokenDe(ADMIN);
  const tokenEncargado = await tokenDe(ENCARGADO);
  return {
    admin: { Authorization: `Bearer ${tokenAdmin}`, 'X-Confirmacion': await confirmacionDe(tokenAdmin, ADMIN.password) },
    adminSinConfirmar: { Authorization: `Bearer ${tokenAdmin}` },
    encargado: { Authorization: `Bearer ${tokenEncargado}`, 'X-Confirmacion': await confirmacionDe(tokenEncargado, ENCARGADO.password) },
    operador: { Authorization: `Bearer ${await tokenDe(OPERADOR)}` },
  };
}

async function crearCatalogoBase() {
  const categoria = await db.Categoria.create({ nombre: 'Campera' });
  const colegio = await db.Colegio.create({ nombre: 'San Martín', ciudad: 'Munro', nivel: ['Secundaria'] });
  return { categoria, colegio };
}

async function cerrar() {
  await db.sequelize.close();
  fs.rmSync(process.env.UPLOADS_DIR, { recursive: true, force: true });
  fs.rmSync(process.env.PRIVADO_DIR, { recursive: true, force: true });
}

// PNG mínimo válido (1x1) para probar subidas
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

module.exports = {
  ENCARGADO,
  app, request, db, ADMIN, OPERADOR, PNG,
  resetearBase, crearUsuario, tokenDe, prepararEscenario, crearCatalogoBase, cerrar,
};
