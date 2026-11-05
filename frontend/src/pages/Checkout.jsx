import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api, { mensajeError } from '../lib/api';
import { formatearPrecio } from '../config';
import { useCarrito } from '../context/CarritoContext';
import { useTienda } from '../hooks/useTienda';
import useSeo from '../hooks/useSeo';
import '../styles/Tienda.css';

const DATOS_KEY = 'paletta_checkout_datos';

const VACIO = {
  nombre: '', email: '', telefono: '', dni: '',
  tipoEntrega: 'retiro', direccion: '', ciudad: '', provincia: 'Buenos Aires', codigoPostal: '',
  notas: '', metodoPago: '',
};

const METODOS = {
  mercadopago: { titulo: 'Mercado Pago', detalle: 'Tarjeta de crédito, débito, dinero en cuenta o efectivo. Te redirigimos a Mercado Pago.' },
  transferencia: { titulo: 'Transferencia bancaria', detalle: 'Te mostramos los datos al confirmar. Reservamos el stock mientras esperamos el pago.' },
};

// Recordamos los datos de contacto (no los de pago) para la próxima compra.
const leerDatos = () => {
  try {
    return { ...VACIO, ...JSON.parse(localStorage.getItem(DATOS_KEY) || '{}'), notas: '', metodoPago: '' };
  } catch {
    return VACIO;
  }
};

const Campo = ({ label, name, valores, onChange, completo, ...props }) => (
  <label className={`tienda-campo${completo ? ' completo' : ''}`}>
    {label}
    <input name={name} value={valores[name]} onChange={onChange} {...props} />
  </label>
);

const Checkout = () => {
  useSeo({ titulo: 'Finalizar compra', noindex: true });
  const navigate = useNavigate();
  const { items, subtotal, vaciar } = useCarrito();
  const tienda = useTienda();
  const [datos, setDatos] = useState(leerDatos);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  // Elegir automáticamente el método si hay uno solo
  useEffect(() => {
    if (!datos.metodoPago && tienda.metodosPago.length === 1) {
      setDatos((d) => ({ ...d, metodoPago: tienda.metodosPago[0] }));
    }
  }, [tienda.metodosPago, datos.metodoPago]);

  if (!tienda.cargando && !tienda.habilitada) return <Navigate to="/carrito" replace />;
  if (items.length === 0 && !enviando) return <Navigate to="/carrito" replace />;

  const esEnvio = datos.tipoEntrega === 'envio';
  const costoEnvio = esEnvio ? tienda.envio.costo : 0;
  const total = subtotal + costoEnvio;

  const handleChange = (e) => setDatos((d) => ({ ...d, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!datos.metodoPago) {
      setError({ mensaje: 'Elegí un medio de pago' });
      return;
    }
    setError(null);
    setEnviando(true);
    const payload = {
      ...datos,
      items: items.map((it) => ({ varianteId: it.varianteId, cantidad: it.cantidad })),
    };
    if (!esEnvio) {
      delete payload.direccion;
      delete payload.ciudad;
      delete payload.provincia;
      delete payload.codigoPostal;
    }

    try {
      const { data } = await api.post('/pedidos', payload);
      try {
        const { nombre, email, telefono, dni, tipoEntrega, direccion, ciudad, provincia, codigoPostal } = datos;
        localStorage.setItem(DATOS_KEY, JSON.stringify({ nombre, email, telefono, dni, tipoEntrega, direccion, ciudad, provincia, codigoPostal }));
      } catch {
        // sin almacenamiento: no pasa nada
      }
      vaciar();
      if (data.pago?.initPoint) {
        window.location.assign(data.pago.initPoint);
        return;
      }
      navigate(`/pedido/${data.pedido.token}`, { replace: true, state: { recienCreado: true, pagoError: data.pagoError } });
    } catch (err) {
      const detalles = err.response?.data?.detalles;
      setError({
        mensaje: err.response?.status === 409 ? mensajeError(err).split(':')[0] : mensajeError(err, 'No pudimos registrar el pedido.'),
        detalles: detalles?.length ? detalles : null,
        stock: err.response?.status === 409,
      });
      setEnviando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="tienda-pagina">
      <h1>Finalizar compra</h1>

      {error && (
        <div className="tienda-aviso error" role="alert">
          {error.mensaje}
          {error.detalles && <ul>{error.detalles.map((d) => <li key={d}>{d}</li>)}</ul>}
          {error.stock && <p style={{ margin: '0.5rem 0 0' }}><Link to="/carrito">Revisar el carrito</Link></p>}
        </div>
      )}

      <form className="tienda-grilla tienda-form" onSubmit={handleSubmit} noValidate={false}>
        <div>
          <fieldset>
            <legend>Tus datos</legend>
            <div className="tienda-campos">
              <Campo label="Nombre y apellido" name="nombre" valores={datos} onChange={handleChange} required minLength={2} maxLength={100} autoComplete="name" />
              <Campo label="Email" name="email" type="email" valores={datos} onChange={handleChange} required autoComplete="email" />
              <Campo label="Teléfono" name="telefono" type="tel" valores={datos} onChange={handleChange} required pattern="[0-9+\(\)\s\-]{6,25}" autoComplete="tel" />
              <Campo label="DNI (opcional)" name="dni" valores={datos} onChange={handleChange} pattern="[0-9.]{6,12}" inputMode="numeric" />
            </div>
          </fieldset>

          <fieldset>
            <legend>Entrega</legend>
            <label className={`tienda-opcion${!esEnvio ? ' seleccionada' : ''}`}>
              <input type="radio" name="tipoEntrega" value="retiro" checked={!esEnvio} onChange={handleChange} />
              <span>
                <strong>Retiro en el local · Gratis</strong>
                <small>{tienda.retiro?.direccion}</small>
              </span>
            </label>
            {tienda.envio.habilitado && (
              <label className={`tienda-opcion${esEnvio ? ' seleccionada' : ''}`}>
                <input type="radio" name="tipoEntrega" value="envio" checked={esEnvio} onChange={handleChange} />
                <span>
                  <strong>Envío a domicilio · {tienda.envio.costo > 0 ? formatearPrecio(tienda.envio.costo) : 'Gratis'}</strong>
                  <small>Te contactamos para coordinar la entrega.</small>
                </span>
              </label>
            )}
            {esEnvio && (
              <div className="tienda-campos" style={{ marginTop: '0.5rem' }}>
                <Campo label="Dirección (calle, número, piso/depto)" name="direccion" valores={datos} onChange={handleChange} required minLength={4} completo autoComplete="street-address" />
                <Campo label="Localidad" name="ciudad" valores={datos} onChange={handleChange} required autoComplete="address-level2" />
                <Campo label="Provincia" name="provincia" valores={datos} onChange={handleChange} required autoComplete="address-level1" />
                <Campo label="Código postal" name="codigoPostal" valores={datos} onChange={handleChange} required pattern="[A-Za-z0-9]{4,8}" autoComplete="postal-code" />
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend>Medio de pago</legend>
            {tienda.metodosPago.length === 0 && <p>No hay medios de pago disponibles. <Link to="/contacto">Contactanos</Link>.</p>}
            {tienda.metodosPago.map((m) => (
              <label key={m} className={`tienda-opcion${datos.metodoPago === m ? ' seleccionada' : ''}`}>
                <input type="radio" name="metodoPago" value={m} checked={datos.metodoPago === m} onChange={handleChange} required />
                <span>
                  <strong>{METODOS[m]?.titulo || m}</strong>
                  <small>{METODOS[m]?.detalle}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Comentarios (opcional)</legend>
            <label className="tienda-campo completo">
              <span className="sr-only">Comentarios</span>
              <textarea name="notas" rows={3} maxLength={1000} value={datos.notas} onChange={handleChange} placeholder="Ej.: nombre para el bordado, horario de entrega…" />
            </label>
          </fieldset>
        </div>

        <aside className="tienda-resumen" aria-label="Resumen del pedido">
          <h2>Tu pedido</h2>
          {items.map((it) => (
            <div key={it.varianteId} className="tienda-fila">
              <span>{it.cantidad} × {it.nombre} <small>(T. {it.talle})</small></span>
              <span>{formatearPrecio(it.precio * it.cantidad)}</span>
            </div>
          ))}
          <div className="tienda-fila" style={{ marginTop: '0.75rem' }}><span>Subtotal</span><span>{formatearPrecio(subtotal)}</span></div>
          <div className="tienda-fila"><span>Envío</span><span>{costoEnvio > 0 ? formatearPrecio(costoEnvio) : 'Gratis'}</span></div>
          <div className="tienda-fila total"><span>Total</span><span>{formatearPrecio(total)}</span></div>
          <button type="submit" className="tienda-boton ancho" disabled={enviando || tienda.metodosPago.length === 0} style={{ marginTop: '1rem' }}>
            {enviando ? 'Procesando…' : datos.metodoPago === 'mercadopago' ? 'Ir a pagar' : 'Confirmar pedido'}
          </button>
          <Link to="/carrito" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', color: '#9c1f23' }}>Volver al carrito</Link>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
