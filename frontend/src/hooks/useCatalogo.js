import { useQuery } from '@tanstack/react-query';
import api, { mensajeError } from '../lib/api';

const obtener = (url) => async () => (await api.get(url)).data;

const useConsulta = (queryKey, url, opciones = {}) => {
  const consulta = useQuery({ queryKey, queryFn: obtener(url), ...opciones });
  return {
    ...consulta,
    data: consulta.data ?? opciones.porDefecto,
    loading: consulta.isLoading && consulta.fetchStatus !== 'idle',
    errorMensaje: consulta.error ? mensajeError(consulta.error, 'No se pudo cargar la información') : null,
  };
};

export const useProductosPublicos = () => useConsulta(['productos-publicos'], '/productos/public', { porDefecto: [] });
export const useProductoPublico = (id) =>
  useConsulta(['producto-publico', id], `/productos/public/${id}`, { enabled: Boolean(id) });
export const useColegios = () => useConsulta(['colegios'], '/colegios', { porDefecto: [] });
export const useColegio = (id) => useConsulta(['colegio', id], `/colegios/${id}`, { enabled: Boolean(id) });
export const useProductosDeColegio = (id) =>
  useConsulta(['colegio-productos', id], `/colegios/${id}/productos`, { enabled: Boolean(id), porDefecto: [] });
export const useCategorias = () => useConsulta(['categorias'], '/categorias', { porDefecto: [] });

// Filtro compartido por la home y el listado de productos
export const filtrarProductos = (productos, { colegio, categoria }) =>
  productos.filter(
    (p) =>
      (!colegio || String(p.colegioId) === String(colegio)) &&
      (!categoria || String(p.categoriaId) === String(categoria))
  );
