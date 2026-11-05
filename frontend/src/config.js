// URL base del backend. Vacía = mismo dominio (nginx en producción, proxy de Vite en desarrollo).
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Modo catálogo (sin precios ni stock) vs. modo e-commerce.
export const MOSTRAR_PRECIOS = import.meta.env.VITE_MOSTRAR_PRECIOS === 'true';

export const IMAGEN_PRODUCTO_DEFAULT = '/img/default-product.jpg';
export const IMAGEN_COLEGIO_DEFAULT = '/imagenes/colegio-default.jpg';

// Convierte una ruta relativa del backend (/uploads/...) en URL absoluta.
export const assetUrl = (ruta, fallback = IMAGEN_PRODUCTO_DEFAULT) => {
  if (!ruta) return fallback;
  if (/^https?:\/\//.test(ruta)) return ruta;
  return `${API_URL}${ruta}`;
};

export const formatearPrecio = (precio) =>
  typeof precio === 'number'
    ? precio.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
    : '';
