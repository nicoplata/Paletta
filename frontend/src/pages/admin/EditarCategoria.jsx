import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Button, ButtonGroup, Container, ErrorBox, Form, FormGroup, Header, Input, Label, TextArea, Title } from './adminUI';

const EditarCategoria = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categoria, setCategoria] = useState({ nombre: '', descripcion: '' });
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/categorias/${id}`)
      .then(({ data }) => setCategoria({ nombre: data.nombre, descripcion: data.descripcion || '' }))
      .catch((err) => setError(mensajeError(err, 'No se pudo cargar la categoría')))
      .finally(() => setCargando(false));
  }, [id]);

  const handleChange = (e) => setCategoria((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (id) await api.put(`/categorias/${id}`, categoria);
      else await api.post('/categorias', categoria);
      showToast(id ? 'Categoría actualizada' : 'Categoría creada', 'success');
      navigate('/admin/dashboard/categorias');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar la categoría'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Container>Cargando...</Container>;

  return (
    <Container>
      <Header>
        <Title>{id ? 'Editar categoría' : 'Nueva categoría'}</Title>
      </Header>
      <Form onSubmit={handleSubmit}>
        {error && <ErrorBox role="alert">{error}</ErrorBox>}
        <FormGroup>
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" value={categoria.nombre} onChange={handleChange} required minLength={2} maxLength={100} />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="descripcion">Descripción (opcional)</Label>
          <TextArea id="descripcion" name="descripcion" value={categoria.descripcion} onChange={handleChange} maxLength={1000} />
        </FormGroup>
        <ButtonGroup>
          <Button type="button" onClick={() => navigate('/admin/dashboard/categorias')}>
            <FaArrowLeft /> Volver
          </Button>
          <Button type="submit" $primario disabled={guardando}>
            <FaSave /> {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </ButtonGroup>
      </Form>
    </Container>
  );
};

export default EditarCategoria;
