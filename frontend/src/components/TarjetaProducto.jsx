import { Link } from 'react-router-dom';
import { assetUrl, formatearPrecio, IMAGEN_PRODUCTO_DEFAULT, MOSTRAR_PRECIOS } from '../config';
import '../styles/ProductList.css';

const TarjetaProducto = ({ producto, mostrarColegio = true }) => (
  <Link
    to={`/producto/${producto.id}`}
    className="productCard"
    style={{ textDecoration: 'none', color: 'inherit' }}
  >
    <img
      src={assetUrl(producto.imagenes?.[0]?.url)}
      alt={producto.nombre}
      loading="lazy"
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGEN_PRODUCTO_DEFAULT; }}
    />
    <h3>{producto.nombre}</h3>
    {mostrarColegio && <div className="colegio">{producto.colegio?.nombre || 'Sin colegio'}</div>}
    <div className="category">{producto.categoria?.nombre || 'Sin categoría'}</div>
    {MOSTRAR_PRECIOS && (
      <>
        <div className="price">{formatearPrecio(producto.precio)}</div>
        <div className={`stock${producto.stock > 0 ? '' : ' out'}`}>
          {producto.stock > 0 ? 'En stock' : 'Sin stock'}
        </div>
      </>
    )}
    {producto.descripcion && <div className="description">{producto.descripcion}</div>}
  </Link>
);

export default TarjetaProducto;
