import { useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarritoContext } from '../context/CarritoContext';
import TarjetaColegio from './TarjetaColegio';
import { useColegios } from '../hooks/useCatalogo';
import '../styles/SelectorColegiosHome.css';

const SelectorColegiosHome = () => {
  const navigate = useNavigate();
  const { setColegioSeleccionado } = useContext(CarritoContext);
  const { data: colegios } = useColegios();
  const scrollRef = useRef(null);

  const handleSelect = (colegio) => {
    setColegioSeleccionado(colegio);
    navigate(`/colegios/${colegio.id}/productos`);
  };

  const scroll = (direction) => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  if (colegios.length === 0) return null;

  return (
    <div className="selector-colegios-home">
      <button type="button" className="flecha izquierda" onClick={() => scroll('left')} aria-label="Anterior">‹</button>
      <div className="contenedor-scroll">
        <div className="grid-colegios" ref={scrollRef}>
          {colegios.map((colegio) => (
            <TarjetaColegio key={colegio.id} colegio={colegio} onSelect={handleSelect} />
          ))}
        </div>
      </div>
      <button type="button" className="flecha derecha" onClick={() => scroll('right')} aria-label="Siguiente">›</button>
    </div>
  );
};

export default SelectorColegiosHome;
