import { useNavigate } from 'react-router-dom';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import useRecurso from '../../hooks/useRecurso';
import { useToast } from '../../context/ToastContext';
import { Actions, Button, Card, CardText, CardTitle, Container, Empty, ErrorBox, Grid, Header, IconButton, Title } from './adminUI';

const CategoriasAdmin = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: categorias, cargando, error, recargar } = useRecurso('/categorias', { porDefecto: [] });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.delete(`/categorias/${id}`);
      showToast('Categoría eliminada', 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err, 'Error al eliminar la categoría'), 'error', 5000);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Categorías</Title>
        <Button $primario onClick={() => navigate('/admin/dashboard/categorias/nuevo')}>
          <FaPlus /> Nueva categoría
        </Button>
      </Header>
      {error && <ErrorBox>{error}</ErrorBox>}
      <Grid>
        {cargando ? <Empty>Cargando...</Empty> : categorias.length === 0 ? <Empty>No hay categorías.</Empty> : (
          categorias.map((categoria) => (
            <Card key={categoria.id}>
              <CardTitle>{categoria.nombre}</CardTitle>
              {categoria.descripcion && <CardText>{categoria.descripcion}</CardText>}
              <Actions>
                <IconButton onClick={() => navigate(`/admin/dashboard/categorias/${categoria.id}/editar`)} aria-label="Editar">
                  <FaEdit />
                </IconButton>
                <IconButton $peligro onClick={() => handleDelete(categoria.id)} aria-label="Eliminar">
                  <FaTrash />
                </IconButton>
              </Actions>
            </Card>
          ))
        )}
      </Grid>
    </Container>
  );
};

export default CategoriasAdmin;
