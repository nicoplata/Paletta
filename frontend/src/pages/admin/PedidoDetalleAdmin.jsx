import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { formatearPrecio } from '../../config';
import useRecurso from '../../hooks/useRecurso';
import { useToast } from '../../context/ToastContext';
import { ESTADOS } from '../PedidoEstado';
import { COLOR_ESTADO } from './PedidosAdmin';
import { Button, Container, ErrorBox, Header, Hint, Tag, TextArea, Title } from './adminUI';

const Grilla = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Bloque = styled.section`
  background: #fafbfc;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;

  h2 { font-size: 1.05rem; margin: 0 0 0.75rem; color: #2c3e50; }
  p { margin: 0 0 0.4rem; }
`;

const Fila = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.4rem 0;
  border-bottom: ${({ $sinBorde }) => ($sinBorde ? 'none' : '1px solid #eee')};
  font-weight: ${({ $total }) => ($total ? 700 : 400)};
`;

const Alerta = styled.pre`
  white-space: pre-wrap;
  font-family: inherit;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 8px;
  padding: 0.75rem;
  margin: 0 0 1rem;
`;

// Texto del botón para cada transición
const ACCIONES = {
  pagado: 'Marcar como pagado',
  en_preparacion: 'Pasar a preparación',
  listo_para_retirar: 'Listo para retirar',
  enviado: 'Marcar como enviado',
  entregado: 'Marcar como entregado',
  cancelado: 'Cancelar pedido',
};

// Normaliza un teléfono argentino al formato de wa.me (549 + área + número, sin 0 ni 15).
export const linkWhatsApp = (telefono) => {
  let n = String(telefono).replace(/\D/g, '');
  if (n.startsWith('54')) n = n.slice(2);
  if (n.startsWith('9')) n = n.slice(1);
  if (n.startsWith('0')) n = n.slice(1);
  n = n.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
  return `https://wa.me/549${n}`;
};

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '-');

const PedidoDetalleAdmin = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  const { data: pedido, setData, cargando, error } = useRecurso(`/admin/pedidos/${id}`);
  const [notas, setNotas] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (pedido) setNotas(pedido.notasInternas || '');
  }, [pedido]);

  const cambiarEstado = async (estado) => {
    let motivo;
    if (estado === 'cancelado') {
      motivo = window.prompt('Motivo de la cancelación (se le informa al cliente). El stock vuelve a estar disponible.');
      if (motivo === null) return;
    } else if (estado === 'pagado' && !window.confirm('¿Confirmás que recibiste el pago de este pedido?')) {
      return;
    }
    setProcesando(true);
    try {
      const { data } = await api.patch(`/admin/pedidos/${id}/estado`, { estado, motivo });
      setData(data);
      showToast(`Pedido: ${ESTADOS[data.estado]}`, 'success');
    } catch (err) {
      showToast(mensajeError(err), 'error', 5000);
    } finally {
      setProcesando(false);
    }
  };

  const guardarNotas = async () => {
    try {
      const { data } = await api.patch(`/admin/pedidos/${id}`, { notasInternas: notas });
      setData(data);
      showToast('Notas guardadas', 'success');
    } catch (err) {
      showToast(mensajeError(err), 'error');
    }
  };

  if (cargando) return <Container>Cargando...</Container>;
  if (error || !pedido) return <Container><ErrorBox>{error || 'Pedido no encontrado'}</ErrorBox></Container>;

  const alertas = (pedido.notasInternas || '').split('\n').filter((l) => l.startsWith('⚠️'));

  return (
    <Container>
      <Link to="/admin/dashboard/pedidos" style={{ color: '#7f8c8d', display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: '1rem' }}>
        <FaArrowLeft /> Pedidos
      </Link>
      <Header>
        <Title>Pedido {pedido.numero}</Title>
        <Tag $color={COLOR_ESTADO[pedido.estado]} style={{ fontSize: '0.95rem' }}>{ESTADOS[pedido.estado]}</Tag>
      </Header>

      {alertas.length > 0 && <Alerta role="alert">{alertas.join('\n')}</Alerta>}

      <Grilla>
        <div>
          <Bloque>
            <h2>Productos</h2>
            {pedido.items.map((it) => (
              <Fila key={it.id}>
                <span>{it.cantidad} × {it.nombreProducto}{it.colegio ? ` · ${it.colegio}` : ''} — <strong>Talle {it.talle}</strong></span>
                <span>{formatearPrecio(it.subtotal)}</span>
              </Fila>
            ))}
            <Fila><span>Subtotal</span><span>{formatearPrecio(pedido.subtotal)}</span></Fila>
            <Fila><span>Envío</span><span>{formatearPrecio(pedido.costoEnvio)}</span></Fila>
            <Fila $total $sinBorde><span>Total</span><span>{formatearPrecio(pedido.total)}</span></Fila>
          </Bloque>

          <Bloque>
            <h2>Cliente</h2>
            <p><strong>{pedido.nombre}</strong>{pedido.dni ? ` · DNI ${pedido.dni}` : ''}</p>
            <p><a href={`mailto:${pedido.email}?subject=${encodeURIComponent(`Pedido ${pedido.numero}`)}`}>{pedido.email}</a></p>
            <p><a href={linkWhatsApp(pedido.telefono)} target="_blank" rel="noopener noreferrer">{pedido.telefono}</a> (WhatsApp)</p>
            <p style={{ marginTop: '0.75rem' }}>
              <strong>Entrega:</strong>{' '}
              {pedido.tipoEntrega === 'retiro'
                ? 'Retiro en el local'
                : `${pedido.direccion}, ${pedido.ciudad}, ${pedido.provincia} (CP ${pedido.codigoPostal})`}
            </p>
            {pedido.notas && <p style={{ marginTop: '0.75rem' }}><strong>Comentario del cliente:</strong> {pedido.notas}</p>}
          </Bloque>

          <Bloque>
            <h2>Notas internas</h2>
            <TextArea value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={5000} aria-label="Notas internas" style={{ width: '100%', boxSizing: 'border-box' }} />
            <div style={{ marginTop: '0.75rem' }}>
              <Button type="button" onClick={guardarNotas}><FaSave /> Guardar notas</Button>
            </div>
          </Bloque>
        </div>

        <div>
          <Bloque>
            <h2>Acciones</h2>
            {pedido.transicionesPosibles.length === 0 && <Hint>Este pedido no tiene más acciones.</Hint>}
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {pedido.transicionesPosibles
                .filter((e) => !(e === 'listo_para_retirar' && pedido.tipoEntrega !== 'retiro'))
                .filter((e) => !(e === 'enviado' && pedido.tipoEntrega !== 'envio'))
                .map((e) => (
                  <Button key={e} type="button" $primario={e !== 'cancelado'} disabled={procesando} onClick={() => cambiarEstado(e)}>
                    {ACCIONES[e]}
                  </Button>
                ))}
            </div>
            <Hint style={{ marginTop: '0.75rem' }}>El cliente recibe un mail en cada cambio de estado.</Hint>
          </Bloque>

          <Bloque>
            <h2>Pago</h2>
            <p>{pedido.metodoPago === 'mercadopago' ? 'Mercado Pago' : 'Transferencia'}</p>
            {pedido.mpPaymentId && <p>Pago MP: <strong>{pedido.mpPaymentId}</strong></p>}
            {pedido.mpEstado && <p>Estado MP: {pedido.mpEstado}</p>}
            <p>Creado: {fecha(pedido.createdAt)}</p>
            {pedido.estado === 'pendiente_pago' && <p>Vence: {fecha(pedido.venceAt)}</p>}
            {pedido.pagadoAt && <p>Pagado: {fecha(pedido.pagadoAt)}</p>}
            {pedido.canceladoAt && <p>Cancelado: {fecha(pedido.canceladoAt)}{pedido.motivoCancelacion ? ` (${pedido.motivoCancelacion})` : ''}</p>}
            <p style={{ marginTop: '0.75rem' }}>
              <a href={`/pedido/${pedido.token}`} target="_blank" rel="noopener noreferrer">Ver página del cliente</a>
            </p>
          </Bloque>
        </div>
      </Grilla>
    </Container>
  );
};

export default PedidoDetalleAdmin;
