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
    <section className="selector-colegios-home" aria-labelledby="titulo-colegios">
      <div className="cabecera">
        <p className="eyebrow" id="titulo-colegios">Elegí tu colegio</p>
        <div className="flechas">
          <button type="button" className="flecha" onClick={() => scroll('left')} aria-label="Ver colegios anteriores">←</button>
          <button type="button" className="flecha" onClick={() => scroll('right')} aria-label="Ver más colegios">→</button>
        </div>
      </div>
      <div className="grid-colegios" ref={scrollRef}>
        {colegios.map((colegio) => (
          <TarjetaColegio key={colegio.id} colegio={colegio} onSelect={handleSelect} />
        ))}
      </div>
    </section>
  );
};

export default SelectorColegiosHome;
