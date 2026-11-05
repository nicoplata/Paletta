import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import api from '../lib/api';
import Contact from '../components/Contact';
import { errorApi, renderConProviders } from './utils';

vi.mock('../lib/api', async (importOriginal) => (await import('./mockApi')).default(importOriginal));

const completar = async (user) => {
  await user.type(screen.getByLabelText('Nombre'), 'María Pérez');
  await user.type(screen.getByLabelText('Email'), 'maria@mail.com');
  await user.type(screen.getByLabelText('Mensaje'), 'Quisiera un presupuesto.');
  await user.click(screen.getByRole('button', { name: 'Enviar' }));
};

describe('Contact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envía el mensaje y limpia el formulario', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { mensaje: 'ok' } });
    renderConProviders(<Contact />);
    await completar(user);
    expect(await screen.findByRole('status')).toHaveTextContent(/gracias/i);
    expect(api.post).toHaveBeenCalledWith('/contacto', {
      nombre: 'María Pérez', email: 'maria@mail.com', mensaje: 'Quisiera un presupuesto.', sitio: '',
    });
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
  });

  it('muestra el error que devuelve el backend', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce(errorApi(429, { error: 'Ya recibimos varios mensajes tuyos.' }));
    renderConProviders(<Contact />);
    await completar(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya recibimos varios mensajes tuyos.');
    expect(screen.getByLabelText('Nombre')).toHaveValue('María Pérez');
  });
});
