import { screen } from '@testing-library/react';
import { Route } from 'react-router-dom';
import api, { TOKEN_KEY } from '../lib/api';
import RutaProtegida from '../routes/RutaProtegida';
import { errorApi, renderConProviders } from './utils';

vi.mock('../lib/api', async (importOriginal) => (await import('./mockApi')).default(importOriginal));

const render = () =>
  renderConProviders(
    <RutaProtegida rolRequerido="administrador"><p>Zona privada</p></RutaProtegida>,
    { ruta: '/admin/dashboard', path: '/admin/dashboard', rutasExtra: [
      <Route key="l" path="/admin" element={<p>Login</p>} />,
      <Route key="h" path="/" element={<p>Home</p>} />,
    ] }
  );

describe('RutaProtegida', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('sin sesión redirige al login', async () => {
    render();
    expect(await screen.findByText('Login')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('con token válido de administrador muestra el contenido', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    api.get.mockResolvedValueOnce({ data: { usuario: { id: 1, rol: 'administrador' } } });
    render();
    expect(await screen.findByText('Zona privada')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/auth/me');
  });

  it('con token vencido limpia la sesión y redirige al login', async () => {
    localStorage.setItem(TOKEN_KEY, 'vencido');
    api.get.mockRejectedValueOnce(errorApi(401, { error: 'Sesión inválida' }));
    render();
    expect(await screen.findByText('Login')).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('un usuario sin rol de administrador vuelve a la home', async () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    api.get.mockResolvedValueOnce({ data: { usuario: { id: 2, rol: 'usuario' } } });
    render();
    expect(await screen.findByText('Home')).toBeInTheDocument();
  });
});
