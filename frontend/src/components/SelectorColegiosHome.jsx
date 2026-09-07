import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarritoContext } from '../context/CarritoContext';
import '../styles/SelectorColegiosHome.css';

const SelectorColegiosHome = () => {
  const navigate = useNavigate();
  const { setColegioSeleccionado } = useContext(CarritoContext);
  const [colegios, setColegios] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/colegios');
        if (!res.ok) throw new Error('Error en la respuesta del servidor');
        const colegiosData = await res.json();
        setColegios(colegiosData);
      } catch (err) {
        console.error('Error al cargar colegios:', err);
      }
    };
    fetchData();
  }, []);

  const handleSelect = (colegio) => {
    setColegioSeleccionado(colegio);
    navigate(`/colegios/${colegio.id}/productos`);
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="selector-colegios-home">
      <button className="flecha izquierda" onClick={() => scroll('left')}>‹</button>
      <div className="contenedor-scroll">
        <div className="grid-colegios" ref={scrollRef}>
          {colegios.map((colegio) => {
            const imagenUrl = colegio.imagenes?.[0]?.url
              ? `http://localhost:3000${colegio.imagenes[0].url}`
              : 'http://localhost:3000/imagenes/colegio-default.jpg';

            return (
              <div
                key={colegio.id}
                className="tarjeta-colegio"
                onClick={() => handleSelect(colegio)}
                role="button"
                tabIndex={0}
              >
                <img
                  src={imagenUrl}
                  alt={colegio.nombre}
                  className="imagen-colegio"
                  onError={(e) => { e.target.src = 'http://localhost:3000/imagenes/colegio-default.jpg'; }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <button className="flecha derecha" onClick={() => scroll('right')}>›</button>
    </div>
  );
};

export default SelectorColegiosHome;
