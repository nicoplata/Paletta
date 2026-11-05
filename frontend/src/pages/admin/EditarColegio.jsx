import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import GestorImagenes from '../../components/admin/GestorImagenes';
import {
  Button, ButtonGroup, CheckLabel, Container, ErrorBox, Form, FormGroup, Header, Hint, Input, Label, Row, Title,
} from './adminUI';

const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];
const VACIO = { nombre: '', ciudad: '', alias: '', grupoInstitucional: '', nivel: [], activo: true };

const EditarColegio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [colegio, setColegio] = useState(VACIO);
  const [imagenes, setImagenes] = useState([]);
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setColegio(VACIO);
      setImagenes([]);
      return;
    }
    setCargando(true);
    api.get(`/colegios/admin/${id}`)
      .then(({ data }) => {
        setColegio({
          nombre: data.nombre,
          ciudad: data.ciudad,
          alias: data.alias || '',
          grupoInstitucional: data.grupoInstitucional || '',
          nivel: data.nivel || [],
          activo: data.activo,
        });
        setImagenes(data.imagenes || []);
      })
      .catch((err) => setError(mensajeError(err, 'No se pudo cargar el colegio')))
      .finally(() => setCargando(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setColegio((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleNivel = (nivel) => {
    setColegio((prev) => ({
      ...prev,
      nivel: prev.nivel.includes(nivel) ? prev.nivel.filter((n) => n !== nivel) : [...prev.nivel, nivel],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (id) {
        await api.put(`/colegios/${id}`, colegio);
        showToast('Colegio actualizado', 'success');
        navigate('/admin/dashboard/colegios');
      } else {
        const { data } = await api.post('/colegios', colegio);
        showToast('Colegio creado. Ahora podés cargar su logo.', 'success', 4000);
        navigate(`/admin/dashboard/colegios/${data.id}/editar`, { replace: true });
      }
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el colegio'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Container>Cargando...</Container>;

  return (
    <Container>
      <Header>
        <Title>{id ? 'Editar colegio' : 'Nuevo colegio'}</Title>
      </Header>

      <Form onSubmit={handleSubmit}>
        {error && <ErrorBox role="alert">{error}</ErrorBox>}

        <Row>
          <FormGroup>
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" value={colegio.nombre} onChange={handleChange} required minLength={2} maxLength={150} />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" value={colegio.ciudad} onChange={handleChange} required minLength={2} maxLength={100} />
          </FormGroup>
        </Row>

        <Row>
          <FormGroup>
            <Label htmlFor="alias">Alias (opcional)</Label>
            <Input id="alias" name="alias" value={colegio.alias} onChange={handleChange} maxLength={100} />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="grupoInstitucional">Grupo institucional (opcional)</Label>
            <Input id="grupoInstitucional" name="grupoInstitucional" value={colegio.grupoInstitucional} onChange={handleChange} maxLength={150} />
          </FormGroup>
        </Row>

        <FormGroup>
          <Label as="span">Niveles</Label>
          <div>
            {NIVELES.map((nivel) => (
              <CheckLabel key={nivel}>
                <input type="checkbox" checked={colegio.nivel.includes(nivel)} onChange={() => toggleNivel(nivel)} />
                {nivel}
              </CheckLabel>
            ))}
          </div>
        </FormGroup>

        <FormGroup>
          <CheckLabel>
            <input type="checkbox" name="activo" checked={colegio.activo} onChange={handleChange} />
            Visible en el sitio
          </CheckLabel>
          <Hint>Un colegio inactivo no aparece en el sitio, pero conserva sus productos.</Hint>
        </FormGroup>

        <ButtonGroup>
          <Button type="button" onClick={() => navigate('/admin/dashboard/colegios')}>
            <FaArrowLeft /> Volver
          </Button>
          <Button type="submit" $primario disabled={guardando}>
            <FaSave /> {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </ButtonGroup>
      </Form>

      <GestorImagenes tipoEntidad="colegio" entidadId={id} imagenes={imagenes} onChange={setImagenes} />
    </Container>
  );
};

export default EditarColegio;
