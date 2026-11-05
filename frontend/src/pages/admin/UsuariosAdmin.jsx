import { useNavigate } from 'react-router-dom';
import { FaEdit, FaPlus, FaTrash, FaUser } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import useRecurso from '../../hooks/useRecurso';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Actions, Button, Card, CardText, CardTitle, Container, Empty, ErrorBox, Grid, Header, IconButton, Tag, Title } from './adminUI';

const UsuariosAdmin = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { usuario: actual } = useAuth();
  const { data: usuarios, cargando, error, recargar } = useRecurso('/usuarios', { porDefecto: [] });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      showToast('Usuario eliminado', 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err, 'Error al eliminar el usuario'), 'error', 5000);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Usuarios</Title>
        <Button $primario onClick={() => navigate('/admin/dashboard/usuarios/nuevo')}>
          <FaPlus /> Nuevo usuario
        </Button>
      </Header>
      {error && <ErrorBox>{error}</ErrorBox>}
      <Grid>
        {cargando ? <Empty>Cargando...</Empty> : usuarios.length === 0 ? <Empty>No hay usuarios.</Empty> : (
          usuarios.map((usuario) => (
            <Card key={usuario.id}>
              <FaUser size={24} color="#3498db" style={{ marginBottom: '1rem' }} />
              <CardTitle>{usuario.nombre}{usuario.id === actual?.id ? ' (vos)' : ''}</CardTitle>
              <CardText>{usuario.email}</CardText>
              <div style={{ marginTop: '0.5rem' }}>
                <Tag $color={usuario.rol === 'administrador' ? 'var(--color-primario)' : '#3498db'}>{usuario.rol}</Tag>
              </div>
              <Actions>
                <IconButton onClick={() => navigate(`/admin/dashboard/usuarios/${usuario.id}/editar`)} aria-label="Editar">
                  <FaEdit size={18} />
                </IconButton>
                {usuario.id !== actual?.id && (
                  <IconButton $peligro onClick={() => handleDelete(usuario.id)} aria-label="Eliminar">
                    <FaTrash size={18} />
                  </IconButton>
                )}
              </Actions>
            </Card>
          ))
        )}
      </Grid>
    </Container>
  );
};

export default UsuariosAdmin;
