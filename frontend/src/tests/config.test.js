import { assetUrl, formatearPrecio, IMAGEN_PRODUCTO_DEFAULT } from '../config';
import { filtrarProductos } from '../hooks/useCatalogo';

describe('assetUrl', () => {
  it('usa la imagen por defecto si no hay ruta', () => {
    expect(assetUrl(undefined)).toBe(IMAGEN_PRODUCTO_DEFAULT);
    expect(assetUrl('', '/otra.jpg')).toBe('/otra.jpg');
  });

  it('respeta URLs absolutas y deja relativas las del backend', () => {
    expect(assetUrl('https://cdn.x/a.jpg')).toBe('https://cdn.x/a.jpg');
    expect(assetUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg');
  });
});

describe('formatearPrecio', () => {
  it('formatea en pesos argentinos', () => {
    expect(formatearPrecio(38500)).toMatch(/38\.500/);
    expect(formatearPrecio(38500)).toMatch(/\$/);
  });

  it('devuelve vacío si no es número', () => {
    expect(formatearPrecio(undefined)).toBe('');
  });
});

describe('filtrarProductos', () => {
  const productos = [
    { id: 1, colegioId: 1, categoriaId: 1 },
    { id: 2, colegioId: 1, categoriaId: 2 },
    { id: 3, colegioId: 2, categoriaId: 1 },
  ];

  it('sin filtros devuelve todo', () => {
    expect(filtrarProductos(productos, { colegio: '', categoria: '' })).toHaveLength(3);
  });

  it('filtra por colegio y categoría combinados', () => {
    expect(filtrarProductos(productos, { colegio: '1', categoria: '' }).map((p) => p.id)).toEqual([1, 2]);
    expect(filtrarProductos(productos, { colegio: '1', categoria: '1' }).map((p) => p.id)).toEqual([1]);
  });
});

describe('linkWhatsApp', async () => {
  const { linkWhatsApp } = await import('../pages/admin/PedidoDetalleAdmin');
  it.each([
    ['11 4444-5555', 'https://wa.me/5491144445555'],
    ['011 15 4444-5555', 'https://wa.me/5491144445555'],
    ['+54 9 11 4444 5555', 'https://wa.me/5491144445555'],
    ['0221 15 456-7890', 'https://wa.me/5492214567890'],
  ])('%s -> %s', (tel, esperado) => {
    expect(linkWhatsApp(tel)).toBe(esperado);
  });
});

describe('estadoCupon', async () => {
  const { estadoCupon } = await import('../pages/admin/CuponesAdmin');
  const base = { activo: true, usos: 0, usosMaximos: null, desde: null, hasta: null };
  it.each([
    [base, 'Vigente'],
    [{ ...base, activo: false }, 'Inactivo'],
    [{ ...base, hasta: '2000-01-01' }, 'Vencido'],
    [{ ...base, desde: '2999-01-01' }, 'Programado'],
    [{ ...base, usos: 3, usosMaximos: 3 }, 'Agotado'],
  ])('%o -> %s', (cupon, esperado) => {
    expect(estadoCupon(cupon).texto).toBe(esperado);
  });
});
