import { useEffect } from 'react';
import { CONTACTO } from '../datosContacto';

// /egresados quedó de la versión anterior: lleva al sitio de egresados (nginx también lo redirige con 301).
const IrAEgresados = () => {
  useEffect(() => {
    window.location.replace(CONTACTO.sitioEgresados);
  }, []);
  return (
    <p className="pagina">
      Te llevamos a <a href={CONTACTO.sitioEgresados}>Paletta Egresados</a>…
    </p>
  );
};

export default IrAEgresados;
