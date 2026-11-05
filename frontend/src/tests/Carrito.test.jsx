import { act, renderHook } from '@testing-library/react';
import { CarritoProvider, reconciliar, useCarrito } from '../context/CarritoContext';

const producto = { id: 1, nombre: 'Campera', precio: 1000, colegio: { nombre: 'SM' }, imagenes: [{ url: '/uploads/a.jpg' }] };
const talleM = { id: 10, talle: 'M', stock: 3 };
const talleL = { id: 11, talle: 'L', stock: 1 };

const render = () => renderHook(() => useCarrito(), { wrapper: CarritoProvider });

describe('CarritoContext', () => {
  beforeEach(() => localStorage.clear());

  it('agrega, acumula y respeta el stock disponible', () => {
    const { result } = render();
    let agregada;
    act(() => { agregada = result.current.agregar(producto, talleM, 2); });
    expect(agregada).toBe(2);
    act(() => { agregada = result.current.agregar(producto, talleM, 5); });
    expect(agregada).toBe(1);
    act(() => { agregada = result.current.agregar(producto, talleM, 1); });
    expect(agregada).toBe(0);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.cantidadTotal).toBe(3);
    expect(result.current.subtotal).toBe(3000);
  });

  it('distingue talles, actualiza cantidades y quita', () => {
    const { result } = render();
    act(() => { result.current.agregar(producto, talleM, 1); });
    act(() => { result.current.agregar(producto, talleL, 1); });
    expect(result.current.items.map((i) => i.talle)).toEqual(['M', 'L']);
    act(() => result.current.actualizarCantidad(10, 99));
    expect(result.current.items[0].cantidad).toBe(3);
    act(() => result.current.actualizarCantidad(10, 0));
    expect(result.current.items.map((i) => i.talle)).toEqual(['L']);
    act(() => result.current.quitar(11));
    expect(result.current.items).toHaveLength(0);
  });

  it('persiste en localStorage y se recupera', () => {
    const { result, unmount } = render();
    act(() => { result.current.agregar(producto, talleM, 2); });
    unmount();
    const { result: otro } = render();
    expect(otro.current.items[0]).toMatchObject({ varianteId: 10, cantidad: 2, nombre: 'Campera', colegio: 'SM' });
  });

  it('ignora un localStorage corrupto', () => {
    localStorage.setItem('paletta_carrito_v1', '{no es json');
    const { result } = render();
    expect(result.current.items).toEqual([]);
  });
});

describe('reconciliar', () => {
  const item = (extra) => ({ varianteId: 10, productoId: 1, nombre: 'Campera', talle: 'M', precio: 1000, stock: 3, cantidad: 2, ...extra });

  it('actualiza precios y avisa', () => {
    const { items, cambios } = reconciliar([item()], [{ ...producto, precio: 1500, variantes: [talleM] }]);
    expect(items[0].precio).toBe(1500);
    expect(cambios[0]).toMatch(/cambió de precio/);
  });

  it('limita al stock actual y quita lo que ya no existe o no tiene stock', () => {
    const { items, cambios } = reconciliar(
      [item({ cantidad: 3 }), item({ varianteId: 99, talle: 'XL' }), item({ varianteId: 11, talle: 'L' })],
      [{ ...producto, variantes: [{ ...talleM, stock: 1 }, { ...talleL, stock: 0 }] }]
    );
    expect(items).toHaveLength(1);
    expect(items[0].cantidad).toBe(1);
    expect(cambios).toHaveLength(3);
  });
});
