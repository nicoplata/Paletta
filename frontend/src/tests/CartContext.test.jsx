import { renderHook, act } from '@testing-library/react';
import { useCart } from '../context/CartContext';

// Mock del provider para las pruebas
const wrapper = ({ children }) => (
  <CartProvider>{children}</CartProvider>
);

describe('useCart', () => {
  it('inicia con un carrito vacío', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
    expect(result.current.cantidad).toBe(0);
  });

  it('puede agregar items al carrito', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const mockItem = {
      id: 1,
      nombre: 'Test Product',
      precio: 100
    };

    act(() => {
      result.current.addItem(mockItem);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(100);
    expect(result.current.cantidad).toBe(1);
  });

  it('puede actualizar la cantidad de un item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const mockItem = {
      id: 1,
      nombre: 'Test Product',
      precio: 100
    };

    act(() => {
      result.current.addItem(mockItem);
      result.current.updateQuantity(1, 3);
    });

    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.total).toBe(300);
    expect(result.current.cantidad).toBe(3);
  });

  it('puede eliminar items del carrito', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    const mockItem = {
      id: 1,
      nombre: 'Test Product',
      precio: 100
    };

    act(() => {
      result.current.addItem(mockItem);
      result.current.removeItem(1);
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
    expect(result.current.cantidad).toBe(0);
  });
});
