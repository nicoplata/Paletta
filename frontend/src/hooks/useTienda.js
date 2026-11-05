import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { MOSTRAR_PRECIOS } from '../config';

const SIN_TIENDA = { habilitada: false, metodosPago: [], envio: { habilitado: false, costo: 0 }, retiro: {}, maxUnidadesPorItem: 50 };

// Configuración pública de la tienda (habilitada, medios de pago, envío).
export const useTienda = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['tienda-config'],
    queryFn: async () => (await api.get('/tienda/config')).data,
    staleTime: 1000 * 60 * 10,
  });
  const config = data || SIN_TIENDA;
  return {
    ...config,
    cargando: isLoading,
    // Con la tienda activa siempre se muestran precios; si no, depende de VITE_MOSTRAR_PRECIOS.
    mostrarPrecios: MOSTRAR_PRECIOS || config.habilitada,
  };
};
