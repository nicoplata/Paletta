import { useCallback, useEffect, useState } from 'react';
import api, { mensajeError } from '../lib/api';

// Carga un recurso de la API (para el panel admin) y expone recargar().
const useRecurso = (url, { porDefecto = null, habilitado = true } = {}) => {
  const [data, setData] = useState(porDefecto);
  const [cargando, setCargando] = useState(habilitado);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    if (!habilitado) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await api.get(url);
      setData(respuesta.data);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar la información'));
    } finally {
      setCargando(false);
    }
  }, [url, habilitado]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { data, setData, cargando, error, recargar };
};

export default useRecurso;
