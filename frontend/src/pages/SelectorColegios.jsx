import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarritoContext } from '../context/CarritoContext';
import '../styles/SelectorColegios.css';

const SelectorColegios = () => {
  const navigate = useNavigate();
  const { setColegioSeleccionado } = useContext(CarritoContext);
  const [colegios, setColegios] = useState([]);

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

  return (
    <div className="selector-colegios">
      <div className="grid-colegios">
        {colegios.map((colegio) => {
          const imagenUrl = colegio.imagenes?.[0]?.url
            ? 
              `http://localhost:3000${colegio.imagenes[0].url}`
            : 'http://localhost:3000/imagenes/colegio-default.jpg';

          return (
            <div key={colegio.id} className="tarjeta-colegio" onClick={() => handleSelect(colegio)}>
              <img
                src={imagenUrl}
                alt={colegio.nombre}
                className="imagen-colegio"
                onError={(e) => { e.target.src = 'http://localhost:3000/imagenes/colegio-default.jpg'; }}
              />
              <div className="info-colegio">
                <h3>{colegio.nombre}</h3>
                <p>{colegio.ciudad}</p>
                <p>{Array.isArray(colegio.nivel) ? colegio.nivel.join(', ') : colegio.nivel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectorColegios;
