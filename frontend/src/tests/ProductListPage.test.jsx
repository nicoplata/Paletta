import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import api from '../lib/api';
import ProductListPage from '../pages/ProductListPage';
import { producto, renderConProviders } from './utils';

vi.mock('../lib/api', async (importOriginal) => (await import('./mockApi')).default(importOriginal));

const colegios = [{ id: 1, nombre: 'San Martín' }, { id: 2, nombre: 'Belgrano' }];
const categorias = [{ id: 1, nombre: 'Campera' }, { id: 2, nombre: 'Buzo' }];

const responder = (productos) => {
  api.get.mockImplementation((url) => {
    if (url === '/productos/public') return Promise.resolve({ data: productos });
    if (url === '/colegios') return Promise.resolve({ data: colegios });
    if (url === '/categorias') return Promise.resolve({ data: categorias });
    return Promise.reject(new Error(`URL inesperada ${url}`));
  });
};

const tarjetas = () => document.querySelectorAll('.productCard');

describe('ProductListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista los productos con su colegio y categoría', async () => {
    responder([producto()]);
    renderConProviders(<ProductListPage />);
    expect(await screen.findByText('Campera egresados')).toBeInTheDocument();
    const card = screen.getByRole('link', { name: /campera egresados/i });
    expect(within(card).getByText('San Martín')).toBeInTheDocument();
    expect(within(card).getByText('Campera')).toBeInTheDocument();
    expect(card).toHaveAttribute('href', '/producto/1');
  });

  it('en modo catálogo no muestra precio ni stock', async () => {
    responder([producto()]);
    renderConProviders(<ProductListPage />);
    await screen.findByText('Campera egresados');
    expect(screen.queryByText(/45\.999/)).not.toBeInTheDocument();
    expect(screen.queryByText(/stock/i)).not.toBeInTheDocument();
  });

  it('filtra por colegio y categoría', async () => {
    const user = userEvent.setup();
    responder([
      producto({ id: 1, nombre: 'Campera SM' }),
      producto({ id: 2, nombre: 'Buzo SM', categoriaId: 2, categoria: categorias[1] }),
      producto({ id: 3, nombre: 'Campera Belgrano', colegioId: 2, colegio: colegios[1] }),
    ]);
    renderConProviders(<ProductListPage />);
    await screen.findByText('Campera SM');
    expect(tarjetas()).toHaveLength(3);

    await user.click(await screen.findByRole('button', { name: 'San Martín' }));
    expect(tarjetas()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Buzo' }));
    expect(tarjetas()).toHaveLength(1);
    expect(screen.getByText('Buzo SM')).toBeInTheDocument();
  });

  it('pagina de a 12 productos', async () => {
    const user = userEvent.setup();
    window.scrollTo = vi.fn();
    responder(Array.from({ length: 14 }, (_, i) => producto({ id: i + 1, nombre: `Producto ${i + 1}` })));
    renderConProviders(<ProductListPage />);
    await screen.findByText('Producto 1');
    expect(tarjetas()).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(tarjetas()).toHaveLength(2);
    expect(screen.getByText('Producto 14')).toBeInTheDocument();
  });

  it('muestra un mensaje si la API falla', async () => {
    api.get.mockRejectedValue(new Error('caída'));
    renderConProviders(<ProductListPage />);
    expect(await screen.findByText(/no se pudo cargar/i)).toBeInTheDocument();
  });
});
