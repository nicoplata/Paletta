import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import {
  Button, ButtonGroup, Container, ErrorBox, Form, FormGroup, Header, Hint, Input, Label, Row, Select, Title,
} from './adminUI';

const EditarUsuario = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [usuario, setUsuario] = useState({ nombre: '', email: '', password: '', rol: 'usuario' });
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/usuarios/${id}`)
      .then(({ data }) => setUsuario({ nombre: data.nombre, email: data.email, password: '', rol: data.rol }))
      .catch((err) => setError(mensajeError(err, 'No se pudo cargar el usuario')))
      .finally(() => setCargando(false));
  }, [id]);

  const handleChange = (e) => setUsuario((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (id) {
        const datos = { ...usuario };
        if (!datos.password) delete datos.password;
        await api.put(`/usuarios/${id}`, datos);
      } else {
        await api.post('/usuarios', usuario);
      }
      showToast(id ? 'Usuario actualizado' : 'Usuario creado', 'success');
      navigate('/admin/dashboard/usuarios');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el usuario'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Container>Cargando...</Container>;

  return (
    <Container>
      <Header>
        <Title>{id ? 'Editar usuario' : 'Nuevo usuario'}</Title>
      </Header>
      <Form onSubmit={handleSubmit} autoComplete="off">
        {error && <ErrorBox role="alert">{error}</ErrorBox>}
        <Row>
          <FormGroup>
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" value={usuario.nombre} onChange={handleChange} required minLength={2} maxLength={100} />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" name="email" value={usuario.email} onChange={handleChange} required />
          </FormGroup>
        </Row>
        <Row>
          <FormGroup>
            <Label htmlFor="password">{id ? 'Nueva contraseña' : 'Contraseña'}</Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={usuario.password}
              onChange={handleChange}
              required={!id}
              minLength={10}
              autoComplete="new-password"
            />
            <Hint>{id ? 'Dejala vacía para no cambiarla. ' : ''}Mínimo 10 caracteres.</Hint>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="rol">Rol</Label>
            <Select id="rol" name="rol" value={usuario.rol} onChange={handleChange}>
              <option value="usuario">Usuario</option>
              <option value="administrador">Administrador</option>
            </Select>
            <Hint>Solo los administradores pueden entrar al panel.</Hint>
          </FormGroup>
        </Row>
        <ButtonGroup>
          <Button type="button" onClick={() => navigate('/admin/dashboard/usuarios')}>
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

export default EditarUsuario;
