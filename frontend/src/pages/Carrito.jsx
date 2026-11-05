import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assetUrl, formatearPrecio, IMAGEN_PRODUCTO_DEFAULT } from '../config';
import { useCarrito } from '../context/CarritoContext';
import { useProductosPublicos } from '../hooks/useCatalogo';
import { useTienda } from '../hooks/useTienda';
import '../styles/Tienda.css';

const Carrito = () => {
  const navigate = useNavigate();
  const { items, actualizarCantidad, quitar, subtotal, cantidadTotal, sincronizar } = useCarrito();
  const { habilitada, envio, cargando } = useTienda();
  // Traemos el catálogo actualizado para validar precios y stock del carrito guardado
  const { data: productos, isFetched } = useProductosPublicos();
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    if (isFetched && productos.length) setAvisos(sincronizar(productos));
  }, [isFetched, productos, sincronizar]);

  if (!cargando && !habilitada) {
    return (
      <div className="tienda-pagina tienda-vacio">
        <h1>Carrito</h1>
        <p>La tienda online no está disponible en este momento. <Link to="/contacto">Consultanos</Link>.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="tienda-pagina tienda-vacio">
        <h1>Tu carrito está vacío</h1>
        {avisos.length > 0 && <div className="tienda-aviso"><ul>{avisos.map((a) => <li key={a}>{a}</li>)}</ul></div>}
        <Link to="/productos" className="tienda-boton">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="tienda-pagina">
      <h1>Carrito ({cantidadTotal})</h1>
      {avisos.length > 0 && (
        <div className="tienda-aviso" role="status">
          Actualizamos tu carrito:
          <ul>{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      <div className="tienda-grilla">
        <ul className="tienda-items">
          {items.map((it) => (
            <li key={it.varianteId} className="tienda-item">
              <img
                src={assetUrl(it.imagen)}
                alt=""
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGEN_PRODUCTO_DEFAULT; }}
              />
              <div>
                <h3><Link to={`/producto/${it.productoId}`}>{it.nombre}</Link></h3>
                <p>{it.colegio ? `${it.colegio} · ` : ''}Talle {it.talle} · {formatearPrecio(it.precio)} c/u</p>
                <div className="tienda-stepper" role="group" aria-label={`Cantidad de ${it.nombre} talle ${it.talle}`}>
                  <button type="button" onClick={() => actualizarCantidad(it.varianteId, it.cantidad - 1)} aria-label="Restar uno">−</button>
                  <span aria-live="polite">{it.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => actualizarCantidad(it.varianteId, it.cantidad + 1)}
                    disabled={it.cantidad >= it.stock}
                    aria-label="Sumar uno"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="tienda-item-precio">
                {formatearPrecio(it.precio * it.cantidad)}
                <button type="button" className="tienda-link" onClick={() => quitar(it.varianteId)}>Quitar</button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="tienda-resumen" aria-label="Resumen">
          <h2>Resumen</h2>
          <div className="tienda-fila"><span>Subtotal</span><span>{formatearPrecio(subtotal)}</span></div>
          <div className="tienda-fila">
            <span>Envío</span>
            <small>{envio.habilitado ? (envio.costo > 0 ? `${formatearPrecio(envio.costo)} o retiro gratis` : 'Se calcula al finalizar') : 'Retiro en el local'}</small>
          </div>
          <div className="tienda-fila total"><span>Total</span><span>{formatearPrecio(subtotal)}</span></div>
          <button type="button" className="tienda-boton ancho" onClick={() => navigate('/checkout')} style={{ marginTop: '1rem' }}>
            Finalizar compra
          </button>
          <Link to="/productos" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', color: '#9c1f23' }}>
            Seguir comprando
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default Carrito;
