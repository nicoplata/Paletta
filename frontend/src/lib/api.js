import axios from 'axios';
import { API_URL } from '../config';

export const TOKEN_KEY = 'paletta_token';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si la sesión expiró estando en el panel, volvemos al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const esLogin = error.config?.url?.includes('/auth/login');
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
  const data = error?.response?.data;
  if (data?.detalles?.length) return `${data.error}: ${data.detalles.join(', ')}`;
  return data?.error || data?.mensaje || porDefecto;
};

export default api;
