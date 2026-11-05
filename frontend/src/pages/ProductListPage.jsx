import { useEffect, useState } from 'react';
import ProductList from '../components/ProductList';
import FiltroProductos from '../components/FiltroProductos';
import { filtrarProductos, useProductosPublicos } from '../hooks/useCatalogo';
import '../styles/ProductListPage.css';

const PRODUCTOS_POR_PAGINA = 12;

const ProductListPage = () => {
  const { data: productos, loading, errorMensaje } = useProductosPublicos();
  const [filtros, setFiltros] = useState({ colegio: '', categoria: '' });
  const [paginaActual, setPaginaActual] = useState(1);

  // Al cambiar los filtros volvemos a la primera página
  useEffect(() => setPaginaActual(1), [filtros]);

  const filtrados = filtrarProductos(productos, filtros);
  const totalPaginas = Math.ceil(filtrados.length / PRODUCTOS_POR_PAGINA);
  const paginados = filtrados.slice((paginaActual - 1) * PRODUCTOS_POR_PAGINA, paginaActual * PRODUCTOS_POR_PAGINA);

  const cambiarPagina = (nueva) => {
    if (nueva >= 1 && nueva <= totalPaginas) {
      setPaginaActual(nueva);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ marginTop: 125 }}>
      <div className="productosLayout">
        <FiltroProductos onChange={setFiltros} context="productos" />

        <div className="productContainer productos">
          <div className="productGridWrapper">
            <ProductList productos={paginados} loading={loading} error={errorMensaje} />
          </div>

          {totalPaginas > 1 && (
            <nav className="paginacion" aria-label="Paginación">
              <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1}>Anterior</button>
              {Array.from({ length: totalPaginas }, (_, i) => (
                <button
                  key={i}
                  onClick={() => cambiarPagina(i + 1)}
                  className={paginaActual === i + 1 ? 'activo' : ''}
                  aria-current={paginaActual === i + 1 ? 'page' : undefined}
                >
                  {i + 1}
                </button>
              ))}
              <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}>Siguiente</button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListPage;
