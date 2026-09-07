import { useEffect, useState } from 'react';
import '../styles/FiltroProductos.css';

const FiltroProductos = ({ onChange, context = 'productos' }) => {
  const [colegios, setColegios] = useState([]);
  const [selectedColegio, setSelectedColegio] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [showColegios, setShowColegios] = useState(true);
  const [showCategorias, setShowCategorias] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/colegios')
      .then(res => res.json())
      .then(data => setColegios(data))
      .catch(err => console.error('Error al cargar colegios:', err));
  }, []);

  useEffect(() => {
    onChange?.({ colegio: selectedColegio, categoria: selectedCategoria });
  }, [selectedColegio, selectedCategoria]);

  return (
    <div className={`filtrosContainer ${context}`}>
      <div className="filtroGrupo">
        <button className="toggleBtn" onClick={() => setShowColegios(!showColegios)}>
          Colegio {showColegios ? '▲' : '▼'}
        </button>
        {showColegios && (
          <ul className="filtroOpciones">
            <li
              className={!selectedColegio ? 'selected' : ''}
              onClick={() => setSelectedColegio('')}
            >
              Todos
            </li>
            {colegios.map(c => (
              <li
                key={c.id}
                className={selectedColegio === String(c.id) ? 'selected' : ''}
                onClick={() => setSelectedColegio(String(c.id))}
              >
                {c.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="filtroGrupo">
        <button className="toggleBtn" onClick={() => setShowCategorias(!showCategorias)}>
          Prenda {showCategorias ? '▲' : '▼'}
        </button>
        {showCategorias && (
          <ul className="filtroOpciones">
            {['', 'Campera', 'Buzo', 'Pantalón', 'Remera'].map(cat => (
              <li
                key={cat || 'todas'}
                className={selectedCategoria === cat ? 'selected' : ''}
                onClick={() => setSelectedCategoria(cat)}
              >
                {cat || 'Todas'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FiltroProductos;
