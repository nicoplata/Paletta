import axios from 'axios';
import { API_URL } from '../config';

// Datos de contacto de Paletta Egresados (los mismos que egresados.paletta.com.ar → js/config.js)
export const EGRESADOS = {
  whatsapp: '5491173574623',
  telefono: '(011) 7357-4623',
  direccion: 'Av. Vélez Sarsfield 4270, Munro',
  horarios: 'Lun a vie de 9 a 13 y de 16 a 19:30 · Sáb de 9 a 13',
  sitio: 'https://egresados.paletta.com.ar',
};

export const linkWhatsApp = (texto) => `https://wa.me/${EGRESADOS.whatsapp}?text=${encodeURIComponent(texto)}`;

const claveToken = (slug) => `egr_familia_${slug}`;
export const leerToken = (slug) => {
  try { return localStorage.getItem(claveToken(slug)); } catch { return null; }
};
export const guardarToken = (slug, token) => {
  try {
    if (token) localStorage.setItem(claveToken(slug), token);
    else localStorage.removeItem(claveToken(slug));
  } catch { /* modo privado: la sesión dura lo que la pestaña */ }
};

export const api = axios.create({ baseURL: `${API_URL}/api/egresados`, timeout: 20000 });
export const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const mensajeError = (error, porDefecto = 'Algo salió mal. Probá de nuevo en un momento.') => {
  const data = error?.response?.data;
  if (data?.detalles?.length) return data.detalles.join('. ');
  if (!error?.response) return 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.';
  return data?.error || porDefecto;
};

export const pesos = (n) => (typeof n === 'number'
  ? n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
  : '');

// '2027-03-10' -> '10/03/2027' (sin pasar por Date para no correr el día por zona horaria)
export const fecha = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

export const formatearDni = (dni) => (dni ? String(dni).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');

export const diasHasta = (iso, hoy = new Date()) => {
  if (!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  const objetivo = Date.UTC(a, m - 1, d);
  const base = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo - base) / 86400000);
};

// Vista previa de un plan (el servidor hace la cuenta definitiva al confirmar)
export function previsualizarPlan(base, plan, descuentoContado) {
  const descuento = plan === 1 ? Math.round(base * (descuentoContado / 100)) : 0;
  const total = Math.round(base - descuento);
  const cuota = Math.floor(total / plan);
  return { total, descuento, cuota, ultima: total - cuota * (plan - 1) };
}

export const nombrePlan = (plan, descuento) => (plan === 1
  ? `Contado en efectivo${descuento ? ` (${descuento}% off)` : ''}`
  : `${plan} cuotas`);
