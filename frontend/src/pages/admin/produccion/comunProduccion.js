// Utilidades compartidas por las pantallas de producción
export const cant = (n, max = 2) => (typeof n === 'number' ? n.toLocaleString('es-AR', { maximumFractionDigits: max }) : '-');
export const nombreMaterial = (m) => (m ? `${m.nombre}${m.color ? ` · ${m.color}` : ''}` : 'Sin elegir');
export const UNIDADES = ['m', 'kg', 'u', 'par', 'cono', 'rollo'];
export const imprimir = () => window.print();

export const ESTADO_ORDEN = {
  preparando: { nombre: 'Preparando', color: '#7f8c8d' },
  enviada: { nombre: 'En taller', color: '#2980b9' },
  recibida: { nombre: 'Recibida', color: '#27ae60' },
};

export const ETAPAS = [
  { clave: 'pendiente', nombre: 'Sin empezar' },
  { clave: 'materiales', nombre: 'Materiales' },
  { clave: 'cortado', nombre: 'Cortada' },
  { clave: 'taller', nombre: 'En taller' },
  { clave: 'control', nombre: 'Control' },
  { clave: 'listo', nombre: 'Lista' },
];

export const linkWhatsApp = (tel, texto = '') => {
  let n = String(tel).replace(/\D/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (!n.startsWith('54')) n = `549${n}`;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
};

export const hoyISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
