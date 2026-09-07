import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/style.css';

const DetalleProducto = () => {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const modoCatalogo = true;

  useEffect(() => {
    const fetchProducto = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/productos/public/${id}`);
        if (!res.ok) throw new Error('Error al obtener el producto');
        const data = await res.json();
        setProducto(data);
      } catch (err) {
        console.error('Error al cargar el producto:', err);
        setProducto(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProducto();
  }, [id]);

  if (loading) return <p style={{ padding: '2rem' }}>Cargando...</p>;
  if (!producto) return <p style={{ padding: '2rem' }}>Producto no encontrado.</p>;

  const imagenPrincipal = `http://localhost:3000${producto.imagenes?.[0]?.url}` || '`http://localhost:3000/uploads/default-product.jpg`';

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '900px',
      margin: '125px auto auto auto',
      background: '#fafbfc',
      borderRadius: '14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      fontFamily: 'opensans, Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <img
          src={imagenPrincipal}
          alt={producto.nombre}
          style={{
            width: '300px',
            height: '300px',
            objectFit: 'cover',
            borderRadius: '12px',
            background: '#f0f0f0'
          }}
          onError={(e) => { e.target.onerror = null; e.target.src = '/img/default-product.jpg'; }}
        />

        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.8rem', color: '#222', marginBottom: '1rem' }}>{producto.nombre}</h2>
          <p style={{ fontSize: '1rem', color: '#555', marginBottom: '1rem' }}>
            <strong>Descripción:</strong> {producto.descripcion || 'Sin descripción'}
          </p>
          <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d32f2f', marginBottom: '0.8rem' }}>
            {typeof producto.precio === 'number'
              ? `$${producto.precio.toLocaleString('es-AR')}`
              : 'Precio no disponible'}
          </p>
          <p style={{ fontSize: '0.95rem', color: producto.stock > 0 ? '#388e3c' : '#d32f2f', marginBottom: '0.8rem' }}>
            {producto.stock > 0 ? `Stock: ${producto.stock}` : 'Sin stock'}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>
            <strong>Categoría:</strong> {producto.Categorium?.nombre || 'Sin categoría'}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#888' }}>
            <strong>Colegio:</strong> {producto.Colegio?.nombre || 'Sin colegio'}
          </p>

          {!modoCatalogo && (
            <>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d32f2f', marginBottom: '0.8rem' }}>
                {typeof producto.precio === 'number'
                  ? `$${producto.precio.toLocaleString('es-AR')}`
                  : 'Precio no disponible'}
              </p>
              <p style={{ fontSize: '0.95rem', color: producto.stock > 0 ? '#388e3c' : '#d32f2f', marginBottom: '0.8rem' }}>
                {producto.stock > 0 ? `Stock: ${producto.stock}` : 'Sin stock'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetalleProducto;
