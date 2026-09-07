import { useState, useEffect } from 'react';
import ProductList from '../components/ProductList';
import FiltroProductos from '../components/FiltroProductos';
import axios from 'axios';
import '../styles/ProductListPage.css';

const ProductListPage = () => {
  const [filtros, setFiltros] = useState({ colegio: '', categoria: '' });
  const [productos, setProductos] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 12;

  useEffect(() => {
    axios.get('http://localhost:3000/api/productos/public')
      .then(res => setProductos(res.data))
      .catch(err => console.error('Error al cargar productos:', err));
  }, []);

  const productosFiltrados = productos.filter(product => {
    const coincideColegio = !filtros.colegio || String(product.colegioId) === filtros.colegio;
    const coincideCategoria = !filtros.categoria || product.categoria === filtros.categoria;
    return coincideColegio && coincideCategoria;
  });

  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
  const productosPaginados = productosFiltrados.slice(
    (paginaActual - 1) * productosPorPagina,
    paginaActual * productosPorPagina
  );

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
    }
  };

  return (
    <div style={{ marginTop: 125 }}>
      <div className="productosLayout">
        <div className="filtrosContainer productos">
          <FiltroProductos onChange={setFiltros} context="productos" />
        </div>

        <div className="productContainer productos">
          <div className="productGridWrapper">
            <ProductList productos={productosPaginados} />
          </div>

          {totalPaginas > 1 && (
            <div className="paginacion">
              <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1}>
                Anterior
              </button>
              {[...Array(totalPaginas)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => cambiarPagina(i + 1)}
                  className={paginaActual === i + 1 ? 'activo' : ''}
                >
                  {i + 1}
                </button>
              ))}
              <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}>
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListPage;
