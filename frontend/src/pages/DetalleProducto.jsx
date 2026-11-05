import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assetUrl, formatearPrecio, IMAGEN_PRODUCTO_DEFAULT } from '../config';
import { useProductoPublico } from '../hooks/useCatalogo';
import { useTienda } from '../hooks/useTienda';
import { useCarrito } from '../context/CarritoContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import useSeo, { SITE_URL } from '../hooks/useSeo';
import '../styles/Tienda.css';
import '../styles/Detalle.css';

const SelectorCompra = ({ producto }) => {
  const { agregar, items } = useCarrito();
  const { showToast } = useToast();
  const variantes = producto.variantes || [];
  const [varianteId, setVarianteId] = useState(() => (variantes.length === 1 && variantes[0].stock > 0 ? variantes[0].id : null));
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState('');

  const variante = variantes.find((v) => v.id === varianteId);
  const enCarrito = items.find((it) => it.varianteId === varianteId)?.cantidad || 0;
  const disponible = variante ? variante.stock - enCarrito : 0;
  const sinStock = variantes.every((v) => v.stock <= 0);

  const handleAgregar = () => {
    if (!variante) {
      setError('Elegí un talle');
      return;
    }
    const agregada = agregar(producto, variante, cantidad);
    if (agregada > 0) {
      showToast(`Agregaste ${agregada} × ${producto.nombre} (talle ${variante.talle})`, 'success');
      setCantidad(1);
    } else {
      showToast('Ya tenés en el carrito todo el stock disponible de ese talle', 'warning', 4000);
    }
  };

  if (sinStock) return <p className="tienda-sin-stock">Sin stock por el momento. <Link to="/contacto">Consultanos</Link></p>;

  return (
    <div className="tienda-compra">
      <fieldset className="tienda-talles">
        <legend>Talle</legend>
        {variantes.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`tienda-talle${v.id === varianteId ? ' seleccionado' : ''}`}
            onClick={() => { setVarianteId(v.id); setCantidad(1); setError(''); }}
            disabled={v.stock <= 0}
            aria-pressed={v.id === varianteId}
            title={v.stock <= 0 ? 'Sin stock' : undefined}
          >
            {v.talle}
          </button>
        ))}
      </fieldset>
      {variante && variante.stock <= 5 && <p className="tienda-pocas">¡Últimas {variante.stock} unidades!</p>}
      {error && <p className="tienda-error" role="alert">{error}</p>}

      <div className="tienda-acciones">
        <label className="tienda-cantidad">
          Cantidad
          <input
            type="number"
            min="1"
            max={Math.max(1, disponible)}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Math.min(Number(e.target.value) || 1, Math.max(1, disponible))))}
          />
        </label>
        <button type="button" className="tienda-boton" onClick={handleAgregar} disabled={variante && disponible <= 0}>
          Agregar al carrito
        </button>
      </div>
      {enCarrito > 0 && (
        <p className="tienda-en-carrito">
          Tenés {enCarrito} en el carrito · <Link to="/carrito">Ver carrito</Link>
        </p>
      )}
    </div>
  );
};

// Datos estructurados (schema.org/Product) para buscadores
function jsonLdProducto(producto, conPrecio) {
  if (!producto) return undefined;
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    description: producto.descripcion || undefined,
    image: (producto.imagenes || []).map((i) => (i.url.startsWith('http') ? i.url : `${SITE_URL}${i.url}`)),
    category: producto.categoria?.nombre,
    brand: { '@type': 'Brand', name: 'Paletta' },
    sku: String(producto.id),
  };
  if (conPrecio) {
    datos.offers = {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      price: Number(producto.precio).toFixed(2),
      availability: producto.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/producto/${producto.id}`,
      seller: { '@type': 'Organization', name: 'Paletta' },
    };
  }
  return datos;
}

const DetalleProducto = () => {
  const { id } = useParams();
  const { data: producto, loading, error } = useProductoPublico(id);
  const { habilitada, mostrarPrecios } = useTienda();
  const [imagenActiva, setImagenActiva] = useState(0);

  useEffect(() => setImagenActiva(0), [id]);

  useSeo({
    titulo: producto ? `${producto.nombre}${producto.colegio ? ` - ${producto.colegio.nombre}` : ''}` : 'Producto',
    descripcion: producto
      ? `${producto.nombre}${producto.colegio ? ` del ${producto.colegio.nombre}` : ''}. ${producto.descripcion || ''}`
      : undefined,
    ruta: `/producto/${id}`,
    imagen: producto?.imagenes?.[0]?.url,
    tipo: 'product',
    noindex: Boolean(error),
    jsonLd: jsonLdProducto(producto, mostrarPrecios),
  });

  if (loading) return <div className="pagina angosta"><LoadingSpinner /></div>;
  if (error || !producto) {
    return (
      <div className="pagina angosta">
        <h1 className="pagina-titulo">Producto no encontrado</h1>
        <Link to="/productos">← Volver a productos</Link>
      </div>
    );
  }

  const imagenes = producto.imagenes || [];

  return (
    <div className="pagina angosta">
      <nav className="migas" aria-label="Ubicación">
        <Link to="/productos">Productos</Link>
        {producto.colegio && (<> / <Link to={`/colegios/${producto.colegio.id}/productos`}>{producto.colegio.nombre}</Link></>)}
      </nav>
      <article className="detalle">
        <div className="detalle-galeria">
          <img
            className="detalle-imagen"
            src={assetUrl(imagenes[imagenActiva]?.url)}
            alt={producto.nombre}
            width="600"
            height="600"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGEN_PRODUCTO_DEFAULT; }}
          />
          {imagenes.length > 1 && (
            <div className="detalle-miniaturas">
              {imagenes.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setImagenActiva(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  aria-current={i === imagenActiva}
                >
                  <img src={assetUrl(img.url)} alt="" width="56" height="56" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detalle-info">
          <h1>{producto.nombre}</h1>
          {mostrarPrecios && <p className="detalle-precio">{formatearPrecio(producto.precio)}</p>}
          <p className="detalle-descripcion">{producto.descripcion || 'Sin descripción'}</p>
          <dl className="detalle-datos">
            <dt>Prenda</dt>
            <dd>{producto.categoria?.nombre || 'Sin categoría'}</dd>
            <dt>Colegio</dt>
            <dd>{producto.colegio ? <Link to={`/colegios/${producto.colegio.id}/productos`}>{producto.colegio.nombre}</Link> : 'Sin colegio'}</dd>
          </dl>

          {habilitada ? (
            <SelectorCompra key={producto.id} producto={producto} />
          ) : (
            <Link to="/contacto" className="btn">Consultar por este producto</Link>
          )}
        </div>
      </article>
    </div>
  );
};

export default DetalleProducto;
