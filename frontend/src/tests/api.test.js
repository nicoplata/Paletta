import api, { mensajeError, TOKEN_KEY } from '../lib/api';

describe('cliente api', () => {
  beforeEach(() => localStorage.clear());

  it('agrega el token guardado en cada request', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    const handler = api.interceptors.request.handlers[0].fulfilled;
    const config = handler({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc');
  });

  it('no agrega Authorization sin token', () => {
    const handler = api.interceptors.request.handlers[0].fulfilled;
    expect(handler({ headers: {} }).headers.Authorization).toBeUndefined();
  });

  it('ante un 401 borra el token', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    const onError = api.interceptors.response.handlers[0].rejected;
    await expect(onError({ config: { url: '/productos' }, response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('un 401 del login no borra un token existente', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc');
    const onError = api.interceptors.response.handlers[0].rejected;
    await expect(onError({ config: { url: '/auth/login' }, response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('abc');
  });
});

describe('mensajeError', () => {
  it('incluye los detalles de validación', () => {
    const err = { response: { data: { error: 'Datos inválidos', detalles: ['precio requerido'] } } };
    expect(mensajeError(err)).toBe('Datos inválidos: precio requerido');
  });

  it('usa el mensaje por defecto si no hay respuesta', () => {
    expect(mensajeError(new Error('Network'), 'Sin conexión')).toBe('Sin conexión');
  });
});
