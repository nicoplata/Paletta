import { Link } from 'react-router-dom';
import { assetUrl, formatearPrecio, IMAGEN_PRODUCTO_DEFAULT } from '../config';
import { useTienda } from '../hooks/useTienda';
import '../styles/ProductList.css';

const TarjetaProducto = ({ producto, mostrarColegio = true }) => {
  const { mostrarPrecios } = useTienda();
  const sinStock = mostrarPrecios && producto.stock === 0;

  return (
    <Link to={`/producto/${producto.id}`} className="productCard">
      <div className="tp-imagen">
        <img
          src={assetUrl(producto.imagenes?.[0]?.url)}
          alt={producto.nombre}
          loading="lazy"
          width="400"
          height="400"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGEN_PRODUCTO_DEFAULT; }}
        />
        {producto.categoria?.nombre && <span className="tp-etiqueta category">{producto.categoria.nombre}</span>}
        {sinStock && <span className="tp-etiqueta tp-agotado">Sin stock</span>}
      </div>
      <div className="tp-info">
        <h3>{producto.nombre}</h3>
        {mostrarColegio && producto.colegio?.nombre && <p className="colegio">{producto.colegio.nombre}</p>}
        {producto.descripcion && <p className="description">{producto.descripcion}</p>}
        {mostrarPrecios && <p className="price">{formatearPrecio(producto.precio)}</p>}
      </div>
    </Link>
  );
};

export default TarjetaProducto;
