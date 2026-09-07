import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import FiltroProductos from '../components/FiltroProductos';
import '../styles/ProductListHome.css';

const ProductListHome = () => {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ colegio: '', categoria: '' });

  useEffect(() => {
    axios.get('http://localhost:3000/api/productos/public')
      .then(res => setProducts(res.data))
      .catch(err => console.error('Error al cargar productos:', err));
  }, []);

  const productosFiltrados = products
    .filter(p => !filters.colegio || p.colegioId === parseInt(filters.colegio))
    .filter(p => !filters.categoria || p.categoria === filters.categoria)
    .slice(0, 8);

  return (
    <div className="homeWrapper">
      <div className="productosLayout">
        <FiltroProductos onChange={setFilters} context="home" />
        <div className="productContainer home" id="productos">
          {productosFiltrados.length === 0 ? (
            <p>No hay productos disponibles.</p>
          ) : (
            productosFiltrados.map(product => {
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
                  <div className="category">{product.categoria || 'Sin categoría'}</div>
                  <div className="price">${product.precio.toLocaleString('es-AR')}</div>
                  <div className="description">{product.descripcion}</div>
                  <div className={`stock${product.stock > 0 ? '' : ' out'}`}>
                    {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                  </div>
                </Link>
              );
            })
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
