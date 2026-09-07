import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import LoginAdmin from '../pages/LoginAdmin';

jest.mock('axios');

describe('Integration Tests - Admin Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('admin login and dashboard access', async () => {
    const mockUser = {
      id: 1,
      email: 'admin@test.com',
      role: 'admin'
    };

    axios.post.mockResolvedValueOnce({
      data: {
        token: 'fake-token',
        user: mockUser
      }
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginAdmin />
        </AuthProvider>
      </BrowserRouter>
    );

    // Llenar el formulario de login
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@test.com' }
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'password123' }
    });

    // Enviar el formulario
    fireEvent.click(screen.getByText(/iniciar sesión/i));

    // Verificar redirección al dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/admin/dashboard');
    });

    // Verificar que se muestre el contenido del dashboard
    expect(screen.getByText(/panel de administración/i)).toBeInTheDocument();
  });
});
