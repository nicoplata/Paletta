import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { CarritoProvider } from '../context/CarritoContext';
import { ToastProvider } from '../context/ToastContext';

// Muestra la ruta actual para poder verificar redirecciones.
export const UbicacionActual = () => <div data-testid="ubicacion">{useLocation().pathname}</div>;

export function renderConProviders(ui, { ruta = '/', path = '*', rutasExtra = null } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <AuthProvider>
          <CarritoProvider>
            <ToastProvider>
              <Routes>
                <Route path={path} element={ui} />
                {rutasExtra}
              </Routes>
              <UbicacionActual />
            </ToastProvider>
          </CarritoProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export const errorApi = (status, data) => Object.assign(new Error('API error'), { response: { status, data } });

export const producto = (over = {}) => ({
  id: 1,
  nombre: 'Campera egresados',
  descripcion: 'Campera bordada',
  precio: 45999.9,
  stock: 3,
  activo: true,
  categoriaId: 1,
  colegioId: 1,
  categoria: { id: 1, nombre: 'Campera' },
  colegio: { id: 1, nombre: 'San Martín', ciudad: 'Munro' },
  imagenes: [{ id: 1, url: '/uploads/a.jpg' }],
  ...over,
});
