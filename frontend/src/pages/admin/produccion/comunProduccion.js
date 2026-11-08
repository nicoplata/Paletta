// Utilidades compartidas por las pantallas de producción
export const cant = (n, max = 2) => (typeof n === 'number' ? n.toLocaleString('es-AR', { maximumFractionDigits: max }) : '-');
export const nombreMaterial = (m) => (m ? `${m.nombre}${m.color ? ` · ${m.color}` : ''}` : 'Sin elegir');
export const UNIDADES = ['m', 'kg', 'u', 'par', 'cono', 'rollo'];
export const imprimir = () => window.print();
