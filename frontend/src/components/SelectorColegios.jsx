import { useContext } from 'react';
import { CarritoContext } from '../context/CarritoContext';

const SelectorColegios = () => {
  const { setColegioSeleccionado } = useContext(CarritoContext);

  return (
    <div>
      <h2>Selecciona tu Colegio</h2>
      {/* Implementar lógica de selección */}
    </div>
  );
};

export default SelectorColegios;
