import TarjetaProducto from './TarjetaProducto';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';
import '../styles/ProductList.css';

const ProductList = ({ productos = [], loading = false, error = null, mostrarColegio = true }) => {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="productContainer" id="productos">
      {productos.length === 0 ? (
        <div className="no-products">
          <p>No hay productos disponibles en este momento.</p>
        </div>
      ) : (
        productos.map((producto) => (
          <TarjetaProducto key={producto.id} producto={producto} mostrarColegio={mostrarColegio} />
        ))
      )}
    </div>
  );
};

export default ProductList;
