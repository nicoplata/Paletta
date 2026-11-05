// Generación de CSV para Excel en español: separador ";", coma decimal y BOM UTF-8.

// Evita la "inyección de fórmulas": un texto que empieza con = + - @ (o tab/CR) se
// ejecutaría como fórmula al abrirlo en Excel. Se le antepone una comilla simple.
const neutralizar = (texto) => (/^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto);

function celda(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return String(Math.round(valor * 100) / 100).replace('.', ',');
  if (valor instanceof Date) {
    const d = valor;
    const dos = (n) => String(n).padStart(2, '0');
    return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
  }
  const texto = neutralizar(String(valor));
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function generarCsv(columnas, filas) {
  const lineas = [columnas.map((c) => celda(c.titulo)).join(';')];
  for (const fila of filas) lineas.push(columnas.map((c) => celda(c.valor(fila))).join(';'));
  return `\uFEFF${lineas.join('\r\n')}\r\n`;
}

module.exports = { generarCsv, celda };
