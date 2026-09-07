import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/ProductList.css';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('http://localhost:3000/api/productos/public');
        setProducts(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar los productos');
        console.error('Error al cargar productos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="productContainer" id="productos">
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : products.length === 0 ? (
        <div className="no-products">
          <p>No hay productos disponibles en este momento.</p>
        </div>
      ) : (
        products.map(product => {
          const imagenPrincipal = `http://localhost:3000${product.imagenes?.[0]?.url}` || '`http://localhost:3000/uploads/default-product.jpg`';

          return (
            <Link
              to={`/producto/${product.id}`}
              key={product.id}
              className="productCard"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <img
                src={imagenPrincipal}
                alt={product.nombre}
                onError={e => { e.target.onerror = null; e.target.src = '/img/default-product.jpg'; }}
              />
              <h3>{product.nombre}</h3>
              <div className="colegio">{product.colegio?.nombre || 'Sin colegio'}</div>
              <div className="category">{product.categoria || 'Sin categoría'}</div>
              <div className="price oculto">${product.precio.toLocaleString('es-AR')}</div>
              <div className={`stock oculto${product.stock > 0 ? '' : ' out'}`}>
                {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
              </div>
              <div className="description">{product.descripcion}</div>
            </Link>

          );
        })
      )}
    </div>
  );
};

export default ProductList;
