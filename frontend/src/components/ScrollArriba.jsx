import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Al cambiar de página, volver arriba (salvo que haya un #ancla).
const ScrollArriba = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
};

export default ScrollArriba;
