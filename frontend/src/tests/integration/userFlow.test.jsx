import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import App from '../App';

// Mock de axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  defaults: { headers: { common: {} } }
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Integration Tests - User Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('complete shopping flow', async () => {
    const mockProducts = [
      {
        id: 1,
        nombre: 'Producto Test',
        precio: 100,
        descripcion: 'Descripción test',
        imagenes: ['/img/test.jpg']
      }
    ];

    // Mock de las llamadas a la API
    axios.get.mockResolvedValueOnce({ data: mockProducts });

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(screen.getByText('Producto Test')).toBeInTheDocument();
    });

    // Agregar al carrito
    const addToCartButton = screen.getByText(/agregar al carrito/i);
    fireEvent.click(addToCartButton);

    // Verificar que se muestre el toast de confirmación
    expect(screen.getByText(/producto agregado al carrito/i)).toBeInTheDocument();

    // Ir al carrito
    const cartButton = screen.getByLabelText(/ver carrito/i);
    fireEvent.click(cartButton);

    // Verificar que el producto esté en el carrito
    expect(screen.getByText('Producto Test')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();

    // Proceder al checkout
    const checkoutButton = screen.getByText(/finalizar compra/i);
    fireEvent.click(checkoutButton);

    // Verificar que estamos en el formulario de checkout
    expect(screen.getByText(/datos de envío/i)).toBeInTheDocument();
  });
});
