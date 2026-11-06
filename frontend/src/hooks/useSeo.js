import { useEffect } from 'react';

// URL pública canónica (para canonical y Open Graph). En producción: https://www.paletta.com.ar
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');

export const SEO_DEFAULT = {
  tituloSitio: 'Paletta Uniformes',
  titulo: 'Paletta Uniformes - Uniformes escolares en Munro',
  descripcion: 'Paletta Uniformes: uniformes escolares, institucionales y de empresa con fabricación propia en Munro, Vicente López. Elegí tu colegio y encontrá cada prenda.',
  imagen: '/img/og-paletta.jpg',
};

const absoluta = (url) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

function setMeta(atributo, clave, contenido) {
  let el = document.head.querySelector(`meta[${atributo}="${clave}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(atributo, clave);
    document.head.appendChild(el);
  }
  el.setAttribute('content', contenido);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Configura título, descripción, canonical, Open Graph, robots y JSON-LD de la página actual.
 * Al desmontar, vuelve a los valores por defecto del sitio.
 */
export default function useSeo({ titulo, descripcion, ruta, imagen, tipo = 'website', noindex = false, jsonLd } = {}) {
  const jsonLdTexto = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    const tituloFinal = titulo ? `${titulo} | ${SEO_DEFAULT.tituloSitio}` : SEO_DEFAULT.titulo;
    const desc = (descripcion || SEO_DEFAULT.descripcion).replace(/\s+/g, ' ').trim().slice(0, 300);
    const url = `${SITE_URL}${ruta ?? window.location.pathname}`;
    const img = absoluta(imagen || SEO_DEFAULT.imagen);

    document.title = tituloFinal;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setCanonical(url);
    setMeta('property', 'og:title', tituloFinal);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:type', tipo);
    setMeta('name', 'twitter:title', tituloFinal);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', img);

    let script;
    if (jsonLdTexto) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seo = 'pagina';
      script.textContent = jsonLdTexto;
      document.head.appendChild(script);
    }

    return () => {
      script?.remove();
      document.title = SEO_DEFAULT.titulo;
      setMeta('name', 'description', SEO_DEFAULT.descripcion);
      setMeta('name', 'robots', 'index, follow');
    };
  }, [titulo, descripcion, ruta, imagen, tipo, noindex, jsonLdTexto]);
}
