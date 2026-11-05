import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import useRecurso from '../../hooks/useRecurso';
import { useToast } from '../../context/ToastContext';
import GestorImagenes from '../../components/admin/GestorImagenes';
import EditorVariantes from '../../components/admin/EditorVariantes';
import {
  Button, ButtonGroup, CheckLabel, Container, ErrorBox, Form, FormGroup, Header, Hint, Input, Label, Row, Select, TextArea, Title,
} from './adminUI';

const VACIO = {
  nombre: '', descripcion: '', precio: '', categoriaId: '', colegioId: '', activo: true,
  variantes: [{ talle: 'Único', stock: '0', activo: true }],
};

const EditarProducto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: categorias } = useRecurso('/categorias', { porDefecto: [] });
  const { data: colegios } = useRecurso('/colegios/admin', { porDefecto: [] });

  const [producto, setProducto] = useState(VACIO);
  const [imagenes, setImagenes] = useState([]);
  const [cargando, setCargando] = useState(Boolean(id));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setProducto(VACIO);
      setImagenes([]);
      return;
    }
    setCargando(true);
    api.get(`/productos/${id}`)
      .then(({ data }) => {
        setProducto({
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          precio: String(data.precio ?? ''),
          variantes: (data.variantes || []).map((v) => ({ id: v.id, talle: v.talle, stock: String(v.stock), activo: v.activo })),
          categoriaId: String(data.categoriaId),
          colegioId: String(data.colegioId),
          activo: data.activo,
        });
        setImagenes(data.imagenes || []);
      })
      .catch((err) => setError(mensajeError(err, 'No se pudo cargar el producto')))
      .finally(() => setCargando(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProducto((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    const payload = {
      ...producto,
      precio: Number(producto.precio),
      variantes: producto.variantes.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        talle: v.talle.trim(),
        stock: Number(v.stock || 0),
        activo: v.activo,
      })),
      categoriaId: Number(producto.categoriaId),
      colegioId: Number(producto.colegioId),
    };
    try {
      if (id) {
        await api.put(`/productos/${id}`, payload);
        showToast('Producto actualizado', 'success');
        navigate('/admin/dashboard/productos');
      } else {
        const { data } = await api.post('/productos', payload);
        showToast('Producto creado. Ahora podés cargarle imágenes.', 'success', 4000);
        navigate(`/admin/dashboard/productos/${data.id}/editar`, { replace: true });
      }
    } catch (err) {
      setError(mensajeError(err, 'No se pudo guardar el producto'));
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Container>Cargando...</Container>;

  return (
    <Container>
      <Header>
        <Title>{id ? 'Editar producto' : 'Nuevo producto'}</Title>
      </Header>

      <Form onSubmit={handleSubmit}>
        {error && <ErrorBox role="alert">{error}</ErrorBox>}

        <FormGroup>
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" value={producto.nombre} onChange={handleChange} required minLength={2} maxLength={150} />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="descripcion">Descripción</Label>
          <TextArea id="descripcion" name="descripcion" value={producto.descripcion} onChange={handleChange} maxLength={2000} />
        </FormGroup>

        <Row>
          <FormGroup>
            <Label htmlFor="categoriaId">Categoría</Label>
            <Select id="categoriaId" name="categoriaId" value={producto.categoriaId} onChange={handleChange} required>
              <option value="">Seleccioná...</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="colegioId">Colegio</Label>
            <Select id="colegioId" name="colegioId" value={producto.colegioId} onChange={handleChange} required>
              <option value="">Seleccioná...</option>
              {colegios.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.activo ? '' : ' (inactivo)'}</option>)}
            </Select>
          </FormGroup>
        </Row>

        <Row>
          <FormGroup>
            <Label htmlFor="precio">Precio (ARS)</Label>
            <Input id="precio" type="number" name="precio" min="0" step="0.01" value={producto.precio} onChange={handleChange} required />
          </FormGroup>
        </Row>

        <FormGroup>
          <Label as="span">Talles y stock</Label>
          <EditorVariantes
            variantes={producto.variantes}
            onChange={(variantes) => setProducto((prev) => ({ ...prev, variantes }))}
          />
        </FormGroup>

        <FormGroup>
          <CheckLabel>
            <input type="checkbox" name="activo" checked={producto.activo} onChange={handleChange} />
            Visible en el sitio
          </CheckLabel>
          <Hint>Si lo desmarcás, el producto deja de mostrarse en el catálogo pero no se borra.</Hint>
        </FormGroup>

        <ButtonGroup>
          <Button type="button" onClick={() => navigate('/admin/dashboard/productos')}>
            <FaArrowLeft /> Volver
          </Button>
          <Button type="submit" $primario disabled={guardando}>
            <FaSave /> {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </ButtonGroup>
      </Form>

      <GestorImagenes tipoEntidad="producto" entidadId={id} imagenes={imagenes} onChange={setImagenes} />
    </Container>
  );
};

export default EditarProducto;
