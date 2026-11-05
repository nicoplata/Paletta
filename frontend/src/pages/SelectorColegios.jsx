import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarritoContext } from '../context/CarritoContext';
import TarjetaColegio from '../components/TarjetaColegio';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useColegios } from '../hooks/useCatalogo';
import '../styles/SelectorColegios.css';

const SelectorColegios = () => {
  const navigate = useNavigate();
  const { setColegioSeleccionado } = useContext(CarritoContext);
  const { data: colegios, loading, errorMensaje } = useColegios();

  const handleSelect = (colegio) => {
    setColegioSeleccionado(colegio);
    navigate(`/colegios/${colegio.id}/productos`);
  };

  return (
    <div className="selector-colegios">
      {loading && <LoadingSpinner />}
      {errorMensaje && <p style={{ textAlign: 'center' }}>{errorMensaje}</p>}
      <div className="grid-colegios">
        {colegios.map((colegio) => (
          <TarjetaColegio key={colegio.id} colegio={colegio} onSelect={handleSelect} conInfo />
        ))}
      </div>
    </div>
  );
};

export default SelectorColegios;
