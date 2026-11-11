// Vuelve a procesar las fotos de la galería con el procesamiento actual (útil para las de baja resolución).
// Toma, en este orden: el original guardado; el archivo del sitio de egresados con el mismo texto
// (si se pasa la carpeta del repo); o la versión grande ya publicada. Cambia el nombre de cada archivo
// para que los navegadores no sigan mostrando la versión vieja.
//   node scripts/reprocesar-galeria.js [~/paletta-egresados]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const db = require('../src/models');
const galeria = require('../src/services/galeriaEgresados');

function fuentesDelRepo(repo) {
  if (!repo) return new Map();
  const contenido = fs.readFileSync(path.join(repo, 'js', 'contenido.js'), 'utf8');
  const lista = vm.runInNewContext(`${contenido}\n;GALERIA`, {}, { timeout: 1000 });
  return new Map(lista.map((g) => [g.alt, path.join(repo, g.foto)]));
}

async function main() {
  const repo = process.argv[2];
  const delRepo = fuentesDelRepo(repo);
  const fotos = await db.EgrFoto.findAll({ order: [['orden', 'ASC']] });
  for (const f of fotos) {
    const original = galeria.rutaOriginal(f.original);
    let fuente = null;
    let deDonde = '';
    if (original && fs.existsSync(original)) { fuente = original; deDonde = 'original'; } else if (delRepo.has(f.alt) && fs.existsSync(delRepo.get(f.alt))) { fuente = delRepo.get(f.alt); deDonde = 'sitio'; } else {
      fuente = path.join(galeria.DIR_GALERIA, `${f.archivo}-1600.webp`);
      deDonde = 'publicada';
    }
    if (!fs.existsSync(fuente)) { console.warn(`✗ ${f.id} ${f.alt}: no se encontró ningún archivo`); continue; }
    const p = await galeria.procesarFoto(fs.readFileSync(fuente), { guardarOriginal: deDonde !== 'original' });
    const anterior = f.archivo;
    await f.update({
      archivo: p.archivo, ancho: p.ancho, alto: p.alto,
      original: deDonde === 'original' ? f.original : p.original,
      anchoOriginal: p.anchoOriginal, altoOriginal: p.altoOriginal,
    });
    galeria.borrarArchivos(anterior);
    console.log(`✓ ${f.id} (${deDonde}) ${p.anchoOriginal}×${p.altoOriginal} → ${p.ancho}×${p.alto}${galeria.esBajaResolucion(f) ? ' · baja resolución' : ''}`);
  }
  console.log(`Listo: ${fotos.length} fotos reprocesadas.`);
}

main().then(() => db.sequelize.close()).catch((err) => { console.error(err.message); process.exit(1); });
