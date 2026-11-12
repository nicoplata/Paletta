import axios from 'axios';
import { olvidarPermiso, pedirConfirmacion, permisoVigente } from './confirmacion';
import { API_URL } from '../config';

export const TOKEN_KEY = 'paletta_token';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const conf = permisoVigente();
  if (conf && !config.headers['X-Confirmacion']) config.headers['X-Confirmacion'] = conf;
  return config;
});

// Si la sesión expiró estando en el panel, volvemos al login.
// Si la acción es sensible (428), se pide la contraseña y se reintenta una sola vez.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    if (error.response?.status === 428 && error.response.data?.requiereConfirmacion && !config.yaConfirmado) {
      let token = permisoVigente();
      if (!token || config.headers?.['X-Confirmacion'] === token) {
        olvidarPermiso();
        const ok = await pedirConfirmacion(error.response.data.error);
        token = ok ? permisoVigente() : null;
      }
      if (token) return api({ ...config, yaConfirmado: true, headers: { ...config.headers, 'X-Confirmacion': token } });
      return Promise.reject(Object.assign(error, { cancelado: true }));
    }
    const esLogin = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/confirmar');
    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname.startsWith('/admin/')) {
        window.location.assign('/admin');
      }
    }
    return Promise.reject(error);
  }
);

// Extrae un mensaje legible de un error de la API.
export const mensajeError = (error, porDefecto = 'Ocurrió un error. Intentá nuevamente.') => {
  if (error?.cancelado) return 'Acción cancelada: no se confirmó la contraseña.';
  const data = error?.response?.data;
  if (data?.detalles?.length) return `${data.error}: ${data.detalles.join(', ')}`;
  return data?.error || data?.mensaje || porDefecto;
};

export default api;
