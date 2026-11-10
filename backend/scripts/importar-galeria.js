// Importa a la galería administrable las fotos que hoy están fijas en el sitio de egresados
// (js/contenido.js → GALERIA, archivos en assets/promos). Se corre una sola vez en el servidor:
//   node scripts/importar-galeria.js ~/paletta-egresados
// Si la galería ya tiene fotos no hace nada (con --forzar las agrega igual).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const db = require('../src/models');
const { procesarFoto } = require('../src/services/galeriaEgresados');

async function main() {
  const repo = process.argv[2];
  const forzar = process.argv.includes('--forzar');
  if (!repo) throw new Error('Uso: node scripts/importar-galeria.js <carpeta del repo paletta-egresados> [--forzar]');
  const contenido = fs.readFileSync(path.join(repo, 'js', 'contenido.js'), 'utf8');
  // contenido.js solo declara datos (const X = [...]): se evalúa aislado para leer GALERIA
  const galeria = vm.runInNewContext(`${contenido}\n;GALERIA`, {}, { timeout: 1000 });
  if (!Array.isArray(galeria)) throw new Error('No se encontró GALERIA en contenido.js');

  const existentes = await db.EgrFoto.count();
  if (existentes && !forzar) {
    console.log(`La galería ya tiene ${existentes} fotos: no se importa nada (usá --forzar para agregarlas igual).`);
    return;
  }
  let orden = existentes ? (await db.EgrFoto.max('orden')) + 1 : 0;
  for (const g of galeria) {
    const archivo = path.join(repo, g.foto);
    if (!fs.existsSync(archivo)) { console.warn(`Falta ${g.foto}, se saltea.`); continue; }
    const p = await procesarFoto(fs.readFileSync(archivo));
    await db.EgrFoto.create({
      ...p,
      tipo: g.tipo === 'Promos reales' ? 'promo' : 'diseno',
      anio: /^\d{4}$/.test(String(g.anio || '')) ? String(g.anio) : null,
      colegio: g.colegio || null,
      alt: g.alt || '',
      diseno: g.diseno || null,
      orden: orden++,
    });
    console.log(`✓ ${g.foto}`);
  }
  console.log(`Listo: la galería tiene ${await db.EgrFoto.count()} fotos.`);
}

main().then(() => db.sequelize.close()).catch((err) => { console.error(err.message); process.exit(1); });
