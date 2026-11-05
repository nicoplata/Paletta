import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assetUrl, formatearPrecio, IMAGEN_PRODUCTO_DEFAULT, MOSTRAR_PRECIOS } from '../config';
import { useProductoPublico } from '../hooks/useCatalogo';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/style.css';

const contenedor = {
  padding: '2rem',
  maxWidth: '900px',
  margin: '125px auto 2rem',
  background: '#fafbfc',
  borderRadius: '14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  fontFamily: 'opensans, Arial, sans-serif',
};

const DetalleProducto = () => {
  const { id } = useParams();
  const { data: producto, loading, error } = useProductoPublico(id);
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
          <p style={{ fontSize: '1rem', color: '#555', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
            {producto.descripcion || 'Sin descripción'}
          </p>
          {MOSTRAR_PRECIOS && (
            <>
              <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#d32f2f', marginBottom: '0.8rem' }}>
                {formatearPrecio(producto.precio)}
              </p>
              <p style={{ fontSize: '0.95rem', color: producto.stock > 0 ? '#388e3c' : '#d32f2f', marginBottom: '0.8rem' }}>
                {producto.stock > 0 ? 'En stock' : 'Sin stock'}
              </p>
            </>
          )}
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>
            <strong>Prenda:</strong> {producto.categoria?.nombre || 'Sin categoría'}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1.5rem' }}>
            <strong>Colegio:</strong>{' '}
            {producto.colegio ? <Link to={`/colegios/${producto.colegio.id}/productos`}>{producto.colegio.nombre}</Link> : 'Sin colegio'}
          </p>
          <Link
            to="/contacto"
            style={{ display: 'inline-block', background: '#9c1f23', color: '#fff', padding: '0.7rem 1.6rem', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}
          >
            Consultar por este producto
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DetalleProducto;
