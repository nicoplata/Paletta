import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import api, { mensajeError } from '../lib/api';
import { formatearPrecio } from '../config';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/Tienda.css';

export const ESTADOS = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pago confirmado',
  en_preparacion: 'En preparación',
  listo_para_retirar: 'Listo para retirar',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const pasos = (tipoEntrega) => [
  'pendiente_pago',
  'pagado',
  'en_preparacion',
  tipoEntrega === 'envio' ? 'enviado' : 'listo_para_retirar',
  'entregado',
];

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '');

const PedidoEstado = () => {
  const { token } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState(null);
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState(location.state?.pagoError || null);
  const intentos = useRef(0);

  // Mercado Pago vuelve con ?payment_id=...&status=...
  const paymentId = params.get('payment_id') || params.get('collection_id');
  const estadoMp = params.get('status') || params.get('collection_status');

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/pedidos/${token}`);
      setPedido(data);
      return data;
    } catch (err) {
      setError(mensajeError(err, 'No encontramos el pedido'));
      return null;
    }
  }, [token]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (paymentId && /^\d+$/.test(paymentId)) {
        try {
          const { data } = await api.post(`/pedidos/${token}/verificar-pago`, { paymentId });
          if (!cancelado) setPedido(data);
          return;
        } catch {
          // si falla la verificación, mostramos el estado actual; el webhook lo actualizará
        }
      }
      if (!cancelado) await cargar();
    })();
    return () => { cancelado = true; };
  }, [token, paymentId, cargar]);

  // Si MP dijo "aprobado" pero todavía no nos llegó la confirmación, reconsultamos unas veces.
  useEffect(() => {
    if (!pedido || pedido.estado !== 'pendiente_pago' || !['approved', 'in_process', 'pending'].includes(estadoMp)) return undefined;
    if (intentos.current >= 12) return undefined;
    const t = setTimeout(() => { intentos.current += 1; cargar(); }, 5000);
    return () => clearTimeout(t);
  }, [pedido, estadoMp, cargar]);

  const pagar = async () => {
    setPagando(true);
    setErrorPago(null);
    try {
      const { data } = await api.post(`/pedidos/${token}/pagar`);
      window.location.assign(data.initPoint);
    } catch (err) {
      setErrorPago(mensajeError(err, 'No pudimos iniciar el pago.'));
      setPagando(false);
    }
  };

  if (error) {
    return (
      <div className="tienda-pagina tienda-vacio">
        <h1>Pedido no encontrado</h1>
        <p>{error}</p>
        <Link to="/" className="tienda-boton">Volver al inicio</Link>
      </div>
    );
  }
  if (!pedido) return <div className="tienda-pagina"><LoadingSpinner /></div>;

  const vencido = pedido.venceAt && new Date(pedido.venceAt) < new Date();
  const pendiente = pedido.estado === 'pendiente_pago';
  const cancelado = pedido.estado === 'cancelado';
  const lista = pasos(pedido.tipoEntrega);
  const indice = lista.indexOf(pedido.estado);

  return (
    <div className="tienda-pagina">
      <h1>Pedido {pedido.numero}</h1>

      {location.state?.recienCreado && !cancelado && (
        <div className="tienda-aviso ok" role="status">
          ¡Gracias, {pedido.nombre}! Registramos tu pedido. Te enviamos el detalle a <strong>{pedido.email}</strong>.
          Guardá esta página para seguir el estado.
        </div>
      )}
      {pendiente && estadoMp === 'approved' && (
        <div className="tienda-aviso" role="status">Estamos confirmando tu pago con Mercado Pago… esta página se actualiza sola.</div>
      )}
      {pendiente && ['rejected', 'failure', 'null'].includes(estadoMp) && (
        <div className="tienda-aviso error" role="alert">El pago no se completó. Podés intentarlo nuevamente.</div>
      )}
      {cancelado && <div className="tienda-aviso error">Este pedido fue cancelado. Si tenés dudas, <Link to="/contacto">contactanos</Link>.</div>}

      {!cancelado && (
        <ol className="tienda-pasos" aria-label="Estado del pedido">
          {lista.map((e, i) => (
            <li key={e} className={i <= indice ? 'hecho' : ''} aria-current={i === indice ? 'step' : undefined}>{ESTADOS[e]}</li>
          ))}
        </ol>
      )}

      <div className="tienda-grilla">
        <div>
          {pendiente && pedido.metodoPago === 'transferencia' && pedido.transferencia && (
            <section>
              <h2 style={{ fontSize: '1.15rem' }}>Datos para la transferencia</h2>
              <p>Transferí <strong>{formatearPrecio(pedido.total)}</strong> y enviá el comprobante respondiendo el mail del pedido. Indicá <strong>{pedido.numero}</strong> en el concepto.</p>
              <dl className="tienda-datos-pago">
                {pedido.transferencia.alias && (<><dt>Alias</dt><dd>{pedido.transferencia.alias}</dd></>)}
                {pedido.transferencia.cbu && (<><dt>CBU</dt><dd>{pedido.transferencia.cbu}</dd></>)}
                {pedido.transferencia.titular && (<><dt>Titular</dt><dd>{pedido.transferencia.titular}</dd></>)}
                {pedido.transferencia.banco && (<><dt>Banco</dt><dd>{pedido.transferencia.banco}</dd></>)}
              </dl>
              {pedido.venceAt && <p><small>Reservamos el stock hasta el {fecha(pedido.venceAt)}.</small></p>}
            </section>
          )}

          {pendiente && pedido.metodoPago === 'mercadopago' && (
            <section style={{ marginBottom: '1.5rem' }}>
              {errorPago && <div className="tienda-aviso error" role="alert">{errorPago}</div>}
              {vencido ? (
                <p>El tiempo para pagar este pedido venció. <Link to="/productos">Hacé un nuevo pedido</Link>.</p>
              ) : (
                <>
                  <button type="button" className="tienda-boton" onClick={pagar} disabled={pagando}>
                    {pagando ? 'Redirigiendo…' : 'Pagar con Mercado Pago'}
                  </button>
                  {pedido.venceAt && <p><small>Tenés hasta el {fecha(pedido.venceAt)} para completar el pago.</small></p>}
                </>
              )}
            </section>
          )}

          <section>
            <h2 style={{ fontSize: '1.15rem' }}>Entrega</h2>
            <p>
              {pedido.tipoEntrega === 'retiro'
                ? 'Retiro en el local. Te avisamos por mail cuando esté listo.'
                : `Envío a ${pedido.direccion}, ${pedido.ciudad}, ${pedido.provincia} (${pedido.codigoPostal}).`}
            </p>
            <p><small>Pedido realizado el {fecha(pedido.creadoAt)}{pedido.pagadoAt ? ` · Pagado el ${fecha(pedido.pagadoAt)}` : ''}</small></p>
          </section>
        </div>

        <aside className="tienda-resumen" aria-label="Detalle del pedido">
          <h2>Detalle</h2>
          {pedido.items.map((it, i) => (
            <div key={i} className="tienda-fila">
              <span>{it.cantidad} × {it.nombreProducto} <small>(T. {it.talle})</small></span>
              <span>{formatearPrecio(it.subtotal)}</span>
            </div>
          ))}
          <div className="tienda-fila" style={{ marginTop: '0.75rem' }}><span>Subtotal</span><span>{formatearPrecio(pedido.subtotal)}</span></div>
          <div className="tienda-fila"><span>Envío</span><span>{pedido.costoEnvio > 0 ? formatearPrecio(pedido.costoEnvio) : 'Gratis'}</span></div>
          <div className="tienda-fila total"><span>Total</span><span>{formatearPrecio(pedido.total)}</span></div>
          <p style={{ marginTop: '1rem' }}><small>¿Dudas? <Link to="/contacto">Escribinos</Link> indicando el número de pedido.</small></p>
        </aside>
      </div>
    </div>
  );
};

export default PedidoEstado;
