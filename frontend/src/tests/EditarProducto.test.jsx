import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import api from '../lib/api';
import EditarProducto from '../pages/admin/EditarProducto';
import { errorApi, producto, renderConProviders } from './utils';

vi.mock('../lib/api', async (importOriginal) => (await import('./mockApi')).default(importOriginal));

const base = (url) => {
  if (url === '/categorias') return Promise.resolve({ data: [{ id: 1, nombre: 'Campera' }, { id: 2, nombre: 'Buzo' }] });
  if (url === '/colegios/admin') return Promise.resolve({ data: [{ id: 1, nombre: 'San Martín', activo: true }] });
  if (url === '/productos/1') return Promise.resolve({ data: producto() });
  return Promise.reject(new Error(url));
};

const rutas = [
  <Route key="e" path="/admin/dashboard/productos/:id/editar" element={<EditarProducto />} />,
  <Route key="l" path="/admin/dashboard/productos" element={<p>Listado</p>} />,
];

describe('EditarProducto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation(base);
  });

  it('crea un producto enviando números y redirige a la edición para cargar imágenes', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 7 } });
    renderConProviders(<EditarProducto />, { ruta: '/admin/dashboard/productos/nuevo', path: '/admin/dashboard/productos/nuevo', rutasExtra: rutas });

    expect(screen.getByText(/guardá primero/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nombre'), 'Buzo canguro');
    await user.selectOptions(await screen.findByLabelText('Categoría'), await screen.findByRole('option', { name: 'Buzo' }));
    await user.selectOptions(screen.getByLabelText('Colegio'), await screen.findByRole('option', { name: 'San Martín' }));
    await user.type(screen.getByLabelText('Precio (ARS)'), '38500.5');
    // talle "Único" por defecto -> lo renombro a M y agrego L
    await user.clear(screen.getByLabelText('Talle 1'));
    await user.type(screen.getByLabelText('Talle 1'), 'M');
    await user.clear(screen.getByLabelText('Stock del talle M'));
    await user.type(screen.getByLabelText('Stock del talle M'), '25');
    await user.click(screen.getByRole('button', { name: /agregar talle/i }));
    await user.type(screen.getByLabelText('Talle 2'), 'L');
    await user.clear(screen.getByLabelText('Stock del talle L'));
    await user.type(screen.getByLabelText('Stock del talle L'), '3');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(api.post).toHaveBeenCalledWith('/productos', expect.objectContaining({
      nombre: 'Buzo canguro', precio: 38500.5, categoriaId: 2, colegioId: 1, activo: true,
      variantes: [{ talle: 'M', stock: 25, activo: true }, { talle: 'L', stock: 3, activo: true }],
    }));
    await waitFor(() => expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin/dashboard/productos/7/editar'));
  });

  it('carga un producto existente y guarda los cambios', async () => {
    const user = userEvent.setup();
    api.put.mockResolvedValueOnce({ data: {} });
    renderConProviders(<EditarProducto />, { ruta: '/admin/dashboard/productos/1/editar', path: '/admin/dashboard/productos/:id/editar', rutasExtra: [rutas[1]] });

    expect(await screen.findByDisplayValue('Campera egresados')).toBeInTheDocument();
    expect(screen.getByAltText('Imagen 1')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/visible en el sitio/i));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(api.put).toHaveBeenCalledWith('/productos/1', expect.objectContaining({
      activo: false,
      precio: 45999.9,
      variantes: [{ id: 10, talle: 'S', stock: 2, activo: true }, { id: 11, talle: 'M', stock: 1, activo: true }],
    }));
    expect(await screen.findByText('Listado')).toBeInTheDocument();
  });

  it('muestra los errores de validación del backend', async () => {
    const user = userEvent.setup();
    api.put.mockRejectedValueOnce(errorApi(400, { error: 'Datos inválidos', detalles: ['"precio" must be >= 0'] }));
    renderConProviders(<EditarProducto />, { ruta: '/admin/dashboard/productos/1/editar', path: '/admin/dashboard/productos/:id/editar' });
    await screen.findByDisplayValue('Campera egresados');
    await user.click(screen.getByRole('button', { name: /guardar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Datos inválidos: "precio" must be >= 0');
  });
});
