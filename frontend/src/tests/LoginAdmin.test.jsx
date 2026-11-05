import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import api, { TOKEN_KEY } from '../lib/api';
import LoginAdmin from '../pages/admin/LoginAdmin';
import { errorApi, renderConProviders } from './utils';

vi.mock('../lib/api', async (importOriginal) => (await import('./mockApi')).default(importOriginal));

const completar = async (email, password) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/correo/i), email);
  await user.type(screen.getByLabelText(/contraseña/i), password);
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
};

const render = () =>
  renderConProviders(<LoginAdmin />, {
    ruta: '/admin',
    path: '/admin',
    rutasExtra: <Route path="/admin/dashboard" element={<p>Dashboard</p>} />,
  });

describe('LoginAdmin', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('un administrador entra al dashboard y se guarda el token', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'tok', usuario: { id: 1, rol: 'administrador' } } });
    render();
    await completar('admin@paletta.com.ar', 'ClaveSegura123');
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'admin@paletta.com.ar', password: 'ClaveSegura123' });
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
  });

  it('muestra el error del backend con credenciales inválidas', async () => {
    api.post.mockRejectedValueOnce(errorApi(401, { error: 'Email o contraseña incorrectos' }));
    render();
    await completar('admin@paletta.com.ar', 'mala');
    expect(await screen.findByText('Email o contraseña incorrectos')).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('rechaza usuarios sin rol administrador y no deja la sesión abierta', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'tok', usuario: { id: 2, rol: 'usuario' } } });
    render();
    await completar('op@paletta.com.ar', 'ClaveSegura123');
    expect(await screen.findByText(/no tiene acceso/i)).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBeNull());
    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/admin');
  });
});
