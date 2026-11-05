import { FaEnvelopeOpen, FaReply, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import useRecurso from '../../hooks/useRecurso';
import { useToast } from '../../context/ToastContext';
import { Actions, Card, CardText, CardTitle, Container, Empty, ErrorBox, Header, IconButton, Tag, Title } from './adminUI';

const fecha = (iso) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

const MensajesAdmin = () => {
  const { showToast } = useToast();
  const { data: mensajes, setData, cargando, error } = useRecurso('/contacto', { porDefecto: [] });

  const marcar = async (mensaje) => {
    try {
      const { data } = await api.patch(`/contacto/${mensaje.id}`, { leido: !mensaje.leido });
      setData((prev) => prev.map((m) => (m.id === data.id ? data : m)));
    } catch (err) {
      showToast(mensajeError(err), 'error');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    try {
      await api.delete(`/contacto/${id}`);
      setData((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      showToast(mensajeError(err), 'error');
    }
  };

  const noLeidos = mensajes.filter((m) => !m.leido).length;

  return (
    <Container>
      <Header>
        <Title>Mensajes de contacto {noLeidos > 0 && <Tag $color="#e74c3c">{noLeidos} sin leer</Tag>}</Title>
      </Header>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {cargando ? <Empty>Cargando...</Empty> : mensajes.length === 0 ? <Empty>No hay mensajes.</Empty> : (
          mensajes.map((m) => (
            <Card key={m.id} style={{ borderLeft: m.leido ? '4px solid #eee' : '4px solid #e74c3c' }}>
              <CardTitle>{m.nombre}</CardTitle>
              <CardText>
                <a href={`mailto:${m.email}`}>{m.email}</a>{m.telefono ? ` · ${m.telefono}` : ''} · {fecha(m.createdAt)}
              </CardText>
              <p style={{ whiteSpace: 'pre-line', color: '#2c3e50' }}>{m.mensaje}</p>
              <Actions>
                <IconButton as="a" href={`mailto:${m.email}?subject=${encodeURIComponent('Consulta Paletta')}`} aria-label="Responder">
                  <FaReply />
                </IconButton>
                <IconButton onClick={() => marcar(m)} aria-label={m.leido ? 'Marcar como no leído' : 'Marcar como leído'} title={m.leido ? 'Marcar como no leído' : 'Marcar como leído'}>
                  <FaEnvelopeOpen />
                </IconButton>
                <IconButton $peligro onClick={() => eliminar(m.id)} aria-label="Eliminar">
                  <FaTrash />
                </IconButton>
              </Actions>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
};

export default MensajesAdmin;
