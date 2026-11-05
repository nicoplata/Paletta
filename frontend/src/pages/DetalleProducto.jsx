import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assetUrl, formatearPrecio, IMAGEN_PRODUCTO_DEFAULT } from '../config';
import { useProductoPublico } from '../hooks/useCatalogo';
import { useTienda } from '../hooks/useTienda';
import { useCarrito } from '../context/CarritoContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/style.css';
import '../styles/Tienda.css';

const contenedor = {
  padding: '2rem',
  maxWidth: '900px',
  margin: '125px auto 2rem',
  background: '#fafbfc',
  borderRadius: '14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  fontFamily: 'opensans, Arial, sans-serif',
};

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

const DetalleProducto = () => {
  const { id } = useParams();
  const { data: producto, loading, error } = useProductoPublico(id);
  const { habilitada, mostrarPrecios } = useTienda();
  const [imagenActiva, setImagenActiva] = useState(0);

  useEffect(() => setImagenActiva(0), [id]);

  useEffect(() => {
    if (producto?.nombre) document.title = `${producto.nombre} | Paletta`;
    return () => { document.title = 'Paletta - Uniformes Escolares y Egresados'; };
  }, [producto]);

  if (loading) return <div style={contenedor}><LoadingSpinner /></div>;
  if (error || !producto) {
    return (
      <div style={contenedor}>
        <p>Producto no encontrado.</p>
        <Link to="/productos">← Volver a productos</Link>
      </div>
    );
  }

  const imagenes = producto.imagenes || [];

  return (
    <div style={contenedor}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ width: 'min(300px, 100%)' }}>
          <img
            src={assetUrl(imagenes[imagenActiva]?.url)}
            alt={producto.nombre}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px', background: '#f0f0f0' }}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGEN_PRODUCTO_DEFAULT; }}
          />
          {imagenes.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {imagenes.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setImagenActiva(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  style={{
                    padding: 0, border: i === imagenActiva ? '2px solid #9c1f23' : '2px solid transparent',
                    borderRadius: 8, background: 'none', cursor: 'pointer',
                  }}
                >
                  <img src={assetUrl(img.url)} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: '1.8rem', color: '#222', marginBottom: '1rem' }}>{producto.nombre}</h1>
          {mostrarPrecios && (
            <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#9c1f23', marginBottom: '1rem' }}>
              {formatearPrecio(producto.precio)}
            </p>
          )}
          <p style={{ fontSize: '1rem', color: '#555', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
            {producto.descripcion || 'Sin descripción'}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>
            <strong>Prenda:</strong> {producto.categoria?.nombre || 'Sin categoría'}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1.5rem' }}>
            <strong>Colegio:</strong>{' '}
            {producto.colegio ? <Link to={`/colegios/${producto.colegio.id}/productos`}>{producto.colegio.nombre}</Link> : 'Sin colegio'}
          </p>

          {habilitada ? (
            <SelectorCompra key={producto.id} producto={producto} />
          ) : (
            <Link to="/contacto" className="tienda-boton">Consultar por este producto</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetalleProducto;
