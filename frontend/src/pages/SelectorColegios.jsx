import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarritoContext } from '../context/CarritoContext';
import TarjetaColegio from '../components/TarjetaColegio';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useColegios } from '../hooks/useCatalogo';
import useSeo from '../hooks/useSeo';
import '../styles/SelectorColegios.css';

const SelectorColegios = () => {
  const navigate = useNavigate();
  const { setColegioSeleccionado } = useContext(CarritoContext);
  const { data: colegios, loading, errorMensaje } = useColegios();

  useSeo({
    titulo: 'Uniformes por colegio',
    descripcion: `Elegí tu colegio y encontrá su uniforme: ${colegios.slice(0, 6).map((c) => c.nombre).join(', ') || 'colegios de zona norte'}. Paletta, Munro.`,
    ruta: '/colegios',
  });

  const handleSelect = (colegio) => {
    setColegioSeleccionado(colegio);
    navigate(`/colegios/${colegio.id}/productos`);
  };

  return (
    <div className="pagina selector-colegios">
      <h1 className="pagina-titulo">Elegí tu colegio</h1>
      {loading && <LoadingSpinner />}
      {errorMensaje && <p className="aviso error">{errorMensaje}</p>}
      <div className="grid-colegios">
        {colegios.map((colegio) => (
          <TarjetaColegio key={colegio.id} colegio={colegio} onSelect={handleSelect} conInfo />
        ))}
      </div>
    </div>
  );
};

export default SelectorColegios;
