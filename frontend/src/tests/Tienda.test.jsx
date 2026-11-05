import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import api from '../lib/api';
import DetalleProducto from '../pages/DetalleProducto';
import Checkout from '../pages/Checkout';
import PedidoEstado from '../pages/PedidoEstado';
import { errorApi, producto, renderConProviders } from './utils';

vi.mock('../lib/api', async (importOriginal) => (await import('./mockApi')).default(importOriginal));

const CONFIG = {
  habilitada: true,
  metodosPago: ['mercadopago', 'transferencia'],
  envio: { habilitado: true, costo: 5000 },
  retiro: { direccion: 'Vélez Sarsfield 4270' },
  maxUnidadesPorItem: 50,
};

const conConfig = (config, rutas = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/tienda/config') return Promise.resolve({ data: config });
    if (rutas[url]) return Promise.resolve({ data: rutas[url] });
    return Promise.reject(new Error(`URL inesperada ${url}`));
  });
};

const carritoGuardado = (items) => localStorage.setItem('paletta_carrito_v1', JSON.stringify(items));
const itemCarrito = { varianteId: 10, productoId: 1, nombre: 'Campera egresados', talle: 'S', precio: 45999.9, stock: 2, cantidad: 2 };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Detalle de producto con tienda', () => {
  const renderDetalle = () => renderConProviders(<DetalleProducto />, { ruta: '/producto/1', path: '/producto/:id' });

  it('con la tienda deshabilitada ofrece consultar', async () => {
    conConfig({ ...CONFIG, habilitada: false }, { '/productos/public/1': producto() });
    renderDetalle();
    expect(await screen.findByRole('link', { name: /consultar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /agregar al carrito/i })).not.toBeInTheDocument();
  });

  it('pide elegir talle, deshabilita los sin stock y agrega al carrito', async () => {
    const user = userEvent.setup();
    conConfig(CONFIG, {
      '/productos/public/1': producto({ variantes: [{ id: 10, talle: 'S', stock: 2, activo: true }, { id: 11, talle: 'M', stock: 0, activo: true }] }),
    });
    renderDetalle();
    const agregar = await screen.findByRole('button', { name: /agregar al carrito/i });
    expect(screen.getByText(/45\.999,90/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M' })).toBeDisabled();

    await user.click(agregar);
    expect(screen.getByRole('alert')).toHaveTextContent('Elegí un talle');

    await user.click(screen.getByRole('button', { name: 'S' }));
    await user.click(agregar);
    expect(await screen.findByText(/agregaste 1 × campera egresados \(talle s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/tenés 1 en el carrito/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('paletta_carrito_v1'))[0]).toMatchObject({ varianteId: 10, cantidad: 1 });
  });
});

describe('Checkout', () => {
  const rutas = [
    <Route key="p" path="/pedido/:token" element={<p>Página del pedido</p>} />,
    <Route key="c" path="/carrito" element={<p>Carrito</p>} />,
  ];
  const renderCheckout = () => renderConProviders(<Checkout />, { ruta: '/checkout', path: '/checkout', rutasExtra: rutas });

  const completarDatos = async (user) => {
    await user.type(await screen.findByLabelText('Nombre y apellido'), 'María Pérez');
    await user.type(screen.getByLabelText('Email'), 'maria@mail.com');
    await user.type(screen.getByLabelText('Teléfono'), '1144445555');
  };

  it('con el carrito vacío vuelve al carrito', async () => {
    conConfig(CONFIG);
    renderCheckout();
    expect(await screen.findByText('Carrito')).toBeInTheDocument();
  });

  it('pedido por transferencia: envía solo ids y cantidades, vacía el carrito y va al pedido', async () => {
    const user = userEvent.setup();
    carritoGuardado([itemCarrito]);
    conConfig(CONFIG);
    api.post.mockResolvedValueOnce({ data: { pedido: { token: 'abc-123' } } });
    renderCheckout();
    await completarDatos(user);
    await user.click(screen.getByLabelText(/transferencia bancaria/i));
    expect(screen.getByText('$ 91.999,80', { selector: '.total span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));

    expect(api.post).toHaveBeenCalledWith('/pedidos', expect.objectContaining({
      nombre: 'María Pérez',
      tipoEntrega: 'retiro',
      metodoPago: 'transferencia',
      items: [{ varianteId: 10, cantidad: 2 }],
    }));
    const payload = api.post.mock.calls[0][1];
    expect(payload.direccion).toBeUndefined();
    expect(await screen.findByText('Página del pedido')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('paletta_carrito_v1'))).toEqual([]);
  });

  it('envío a domicilio suma el costo y pide la dirección', async () => {
    const user = userEvent.setup();
    carritoGuardado([itemCarrito]);
    conConfig(CONFIG);
    renderCheckout();
    await user.click(await screen.findByLabelText(/envío a domicilio/i));
    expect(screen.getByLabelText(/dirección/i)).toBeRequired();
    expect(screen.getByText('$ 96.999,80', { selector: '.total span' })).toBeInTheDocument();
  });

  it('Mercado Pago redirige al checkout de MP', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true });
    carritoGuardado([itemCarrito]);
    conConfig(CONFIG);
    api.post.mockResolvedValueOnce({ data: { pedido: { token: 't' }, pago: { initPoint: 'https://mp.test/pay' } } });
    renderCheckout();
    await completarDatos(user);
    await user.click(screen.getByLabelText(/mercado pago/i));
    await user.click(screen.getByRole('button', { name: /ir a pagar/i }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://mp.test/pay'));
  });

  it('muestra el detalle cuando falta stock y conserva el carrito', async () => {
    const user = userEvent.setup();
    window.scrollTo = vi.fn();
    carritoGuardado([itemCarrito]);
    conConfig({ ...CONFIG, metodosPago: ['transferencia'] });
    api.post.mockRejectedValueOnce(errorApi(409, {
      error: 'No hay stock suficiente para algunos productos',
      detalles: ['Campera egresados (talle S): quedan 1'],
    }));
    renderCheckout();
    await completarDatos(user);
    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No hay stock suficiente');
    expect(alerta).toHaveTextContent('quedan 1');
    expect(JSON.parse(localStorage.getItem('paletta_carrito_v1'))).toHaveLength(1);
  });
});

describe('Página del pedido', () => {
  const pedido = {
    token: 'tok', numero: 'P-000007', estado: 'pendiente_pago', nombre: 'María', email: 'm@m.com',
    tipoEntrega: 'retiro', metodoPago: 'transferencia', subtotal: 1000, costoEnvio: 0, total: 1000,
    creadoAt: new Date().toISOString(), venceAt: new Date(Date.now() + 3600e3).toISOString(),
    items: [{ nombreProducto: 'Campera', talle: 'M', cantidad: 1, precioUnitario: 1000, subtotal: 1000 }],
    transferencia: { alias: 'paletta.ropa', cbu: '000123' },
  };

  it('muestra los datos de transferencia y el estado', async () => {
    api.get.mockResolvedValue({ data: pedido });
    renderConProviders(<PedidoEstado />, { ruta: '/pedido/tok', path: '/pedido/:token' });
    expect(await screen.findByText('Pedido P-000007')).toBeInTheDocument();
    expect(screen.getByText('paletta.ropa')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de pago').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('al volver de Mercado Pago verifica el pago con el backend', async () => {
    api.post.mockResolvedValue({ data: { ...pedido, metodoPago: 'mercadopago', estado: 'pagado', transferencia: undefined } });
    renderConProviders(<PedidoEstado />, { ruta: '/pedido/tok?payment_id=123&status=approved', path: '/pedido/:token' });
    expect(await screen.findByText('Pedido P-000007')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/pedidos/tok/verificar-pago', { paymentId: '123' });
    expect(screen.getByText('Pago confirmado').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});
