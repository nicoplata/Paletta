import { useState } from 'react';
import { Link } from 'react-router-dom';
import FiltroProductos from './FiltroProductos';
import TarjetaProducto from './TarjetaProducto';
import LoadingSpinner from './common/LoadingSpinner';
import { filtrarProductos, useProductosPublicos } from '../hooks/useCatalogo';
import '../styles/ProductListHome.css';

const ProductListHome = () => {
  const { data: productos, loading, errorMensaje } = useProductosPublicos();
  const [filtros, setFiltros] = useState({ colegio: '', categoria: '' });

  const destacados = filtrarProductos(productos, filtros).slice(0, 8);

  return (
    <div className="homeWrapper">
      <div className="productosLayout">
        <FiltroProductos onChange={setFiltros} context="home" />
        <div className="productContainer home" id="productos">
          {loading ? (
            <LoadingSpinner />
          ) : errorMensaje ? (
            <p>{errorMensaje}</p>
          ) : destacados.length === 0 ? (
            <p>No hay productos disponibles.</p>
          ) : (
            destacados.map((producto) => <TarjetaProducto key={producto.id} producto={producto} mostrarColegio={false} />)
          )}
          <div className="verMasContainer">
            <Link to="/productos" className="verMasBtn">Ver más productos</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductListHome;
