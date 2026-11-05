import { useEffect, useState } from 'react';
import { useCategorias, useColegios } from '../hooks/useCatalogo';
import '../styles/FiltroProductos.css';

const OpcionFiltro = ({ seleccionada, onClick, children }) => (
  <li>
    <button type="button" className={`filtroOpcion${seleccionada ? ' selected' : ''}`} onClick={onClick} aria-pressed={seleccionada}>
      {children}
    </button>
  </li>
);

const FiltroProductos = ({ onChange, context = 'productos' }) => {
  const { data: colegios } = useColegios();
  const { data: categorias } = useCategorias();
  const [colegio, setColegio] = useState('');
  const [categoria, setCategoria] = useState('');
  // En pantallas chicas los grupos arrancan plegados para no tapar los productos
  const [esMobile] = useState(() => window.matchMedia?.('(max-width: 768px)').matches ?? false);
  const [showColegios, setShowColegios] = useState(!esMobile);
  const [showCategorias, setShowCategorias] = useState(!esMobile);

  useEffect(() => {
    onChange?.({ colegio, categoria });
  }, [colegio, categoria, onChange]);

  return (
    <div className={`filtrosContainer ${context}`}>
      <div className="filtroGrupo">
        <button type="button" className="toggleBtn" onClick={() => setShowColegios(!showColegios)} aria-expanded={showColegios}>
          Colegio {showColegios ? '▲' : '▼'}
        </button>
        {showColegios && (
          <ul className="filtroOpciones">
            <OpcionFiltro seleccionada={!colegio} onClick={() => setColegio('')}>Todos</OpcionFiltro>
            {colegios.map((c) => (
              <OpcionFiltro key={c.id} seleccionada={colegio === String(c.id)} onClick={() => setColegio(String(c.id))}>
                {c.nombre}
              </OpcionFiltro>
            ))}
          </ul>
        )}
      </div>

      <div className="filtroGrupo">
        <button type="button" className="toggleBtn" onClick={() => setShowCategorias(!showCategorias)} aria-expanded={showCategorias}>
          Prenda {showCategorias ? '▲' : '▼'}
        </button>
        {showCategorias && (
          <ul className="filtroOpciones">
            <OpcionFiltro seleccionada={!categoria} onClick={() => setCategoria('')}>Todas</OpcionFiltro>
            {categorias.map((c) => (
              <OpcionFiltro key={c.id} seleccionada={categoria === String(c.id)} onClick={() => setCategoria(String(c.id))}>
                {c.nombre}
              </OpcionFiltro>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FiltroProductos;
