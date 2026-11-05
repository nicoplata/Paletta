import { renderHook } from '@testing-library/react';
import useSeo, { SEO_DEFAULT } from '../hooks/useSeo';

const meta = (sel) => document.head.querySelector(sel)?.getAttribute('content');

describe('useSeo', () => {
  it('aplica título, descripción, canonical, Open Graph y JSON-LD, y los restaura al salir', () => {
    const { unmount } = renderHook(() => useSeo({
      titulo: 'Campera egresados',
      descripcion: '  Campera   bordada ',
      ruta: '/producto/1',
      imagen: '/uploads/a.jpg',
      tipo: 'product',
      jsonLd: { '@type': 'Product', name: 'Campera' },
    }));

    expect(document.title).toBe('Campera egresados | Paletta');
    expect(meta('meta[name="description"]')).toBe('Campera bordada');
    expect(meta('meta[property="og:image"]')).toMatch(/\/uploads\/a\.jpg$/);
    expect(meta('meta[property="og:type"]')).toBe('product');
    expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toMatch(/\/producto\/1$/);
    expect(JSON.parse(document.head.querySelector('script[data-seo]').textContent).name).toBe('Campera');

    unmount();
    expect(document.title).toBe(SEO_DEFAULT.titulo);
    expect(document.head.querySelector('script[data-seo]')).toBeNull();
  });

  it('marca noindex las páginas privadas', () => {
    const { unmount } = renderHook(() => useSeo({ titulo: 'Carrito', noindex: true }));
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow');
    unmount();
    expect(meta('meta[name="robots"]')).toBe('index, follow');
  });
});
