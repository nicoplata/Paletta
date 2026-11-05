import { useNavigate } from 'react-router-dom';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { assetUrl, IMAGEN_COLEGIO_DEFAULT } from '../../config';
import useRecurso from '../../hooks/useRecurso';
import { useToast } from '../../context/ToastContext';
import { Actions, Button, Card, CardText, CardTitle, Container, Empty, ErrorBox, Grid, Header, IconButton, Tag, Title } from './adminUI';

const ColegiosAdmin = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: colegios, cargando, error, recargar } = useRecurso('/colegios/admin', { porDefecto: [] });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este colegio?')) return;
    try {
      await api.delete(`/colegios/${id}`);
      showToast('Colegio eliminado', 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err, 'Error al eliminar el colegio'), 'error', 6000);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Colegios</Title>
        <Button $primario onClick={() => navigate('/admin/dashboard/colegios/nuevo')}>
          <FaPlus /> Nuevo colegio
        </Button>
      </Header>
      {error && <ErrorBox>{error}</ErrorBox>}
      <Grid>
        {cargando ? <Empty>Cargando...</Empty> : colegios.length === 0 ? <Empty>No hay colegios.</Empty> : (
          colegios.map((colegio) => (
            <Card key={colegio.id} $inactivo={!colegio.activo}>
              <img
                src={assetUrl(colegio.imagenes?.[0]?.url, IMAGEN_COLEGIO_DEFAULT)}
                alt=""
                style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '0.75rem' }}
              />
              <CardTitle>{colegio.nombre}</CardTitle>
              <CardText>{colegio.ciudad}</CardText>
              <div style={{ marginTop: '0.5rem' }}>
                {!colegio.activo && <Tag $color="#7f8c8d">Inactivo</Tag>}
                {colegio.nivel?.map((nivel) => <Tag key={nivel}>{nivel}</Tag>)}
              </div>
              <Actions>
                <IconButton onClick={() => navigate(`/admin/dashboard/colegios/${colegio.id}/editar`)} aria-label="Editar">
                  <FaEdit size={18} />
                </IconButton>
                <IconButton $peligro onClick={() => handleDelete(colegio.id)} aria-label="Eliminar">
                  <FaTrash size={18} />
                </IconButton>
              </Actions>
            </Card>
          ))
        )}
      </Grid>
    </Container>
  );
};

export default ColegiosAdmin;
