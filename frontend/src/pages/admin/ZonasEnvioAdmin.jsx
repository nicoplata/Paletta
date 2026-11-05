import { useState } from 'react';
import styled from 'styled-components';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { formatearPrecio } from '../../config';
import useRecurso from '../../hooks/useRecurso';
import { useToast } from '../../context/ToastContext';
import {
  Button, ButtonGroup, Card, CheckLabel, Container, Empty, ErrorBox, Form, FormGroup, Header, Hint, IconButton,
  Input, Label, Row, Tag, Title,
} from './adminUI';

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    text-align: left;
    padding: 0.7rem 0.5rem;
    border-bottom: 1px solid var(--color-borde);
  }

  th {
    font-size: 0.85rem;
    color: #7f8c8d;
  }
`;

const VACIO = { nombre: '', cpDesde: '', cpHasta: '', costo: '', demora: '', activo: true };

const ZonasEnvioAdmin = () => {
  const { showToast } = useToast();
  const { data: zonas, cargando, error, recargar } = useRecurso('/admin/zonas-envio', { porDefecto: [] });
  const [form, setForm] = useState(null);
  const [errorForm, setErrorForm] = useState('');

  const editar = (z) => {
    setErrorForm('');
    setForm(z ? { id: z.id, nombre: z.nombre, cpDesde: String(z.cpDesde), cpHasta: String(z.cpHasta), costo: String(z.costo), demora: z.demora || '', activo: z.activo } : VACIO);
  };

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const { id, ...campos } = form;
    const payload = { ...campos, cpDesde: Number(campos.cpDesde), cpHasta: Number(campos.cpHasta), costo: Number(campos.costo) };
    try {
      if (id) await api.put(`/admin/zonas-envio/${id}`, payload);
      else await api.post('/admin/zonas-envio', payload);
      showToast(id ? 'Zona actualizada' : 'Zona creada', 'success');
      setForm(null);
      recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo guardar la zona'));
    }
  };

  const eliminar = async (z) => {
    if (!window.confirm(`¿Eliminar la zona ${z.nombre}?`)) return;
    try {
      await api.delete(`/admin/zonas-envio/${z.id}`);
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error');
    }
  };

  return (
    <Container>
      <Header>
        <Title>Zonas de envío</Title>
        {!form && <Button $primario onClick={() => editar(null)}><FaPlus /> Nueva zona</Button>}
      </Header>
      <Hint style={{ marginBottom: '1.5rem' }}>
        Si no cargás ninguna zona, el envío usa el costo fijo configurado en el servidor. Si cargás zonas,
        solo se hacen envíos a los códigos postales que estén dentro de algún rango.
      </Hint>

      {form && (
        <Card style={{ marginBottom: '2rem' }}>
          <Form onSubmit={guardar}>
            {errorForm && <ErrorBox role="alert">{errorForm}</ErrorBox>}
            <Row>
              <FormGroup>
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" value={form.nombre} onChange={cambiar} required placeholder="Vicente López" />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="demora">Demora (opcional)</Label>
                <Input id="demora" name="demora" value={form.demora} onChange={cambiar} placeholder="24 a 48 h hábiles" />
              </FormGroup>
            </Row>
            <Row>
              <FormGroup>
                <Label htmlFor="cpDesde">CP desde</Label>
                <Input id="cpDesde" name="cpDesde" type="number" min="1000" max="9999" value={form.cpDesde} onChange={cambiar} required />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="cpHasta">CP hasta</Label>
                <Input id="cpHasta" name="cpHasta" type="number" min={form.cpDesde || 1000} max="9999" value={form.cpHasta} onChange={cambiar} required />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="costo">Costo (ARS)</Label>
                <Input id="costo" name="costo" type="number" min="0" step="0.01" value={form.costo} onChange={cambiar} required />
              </FormGroup>
            </Row>
            <CheckLabel>
              <input type="checkbox" name="activo" checked={form.activo} onChange={cambiar} />
              Activa
            </CheckLabel>
            <ButtonGroup>
              <Button type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button type="submit" $primario>Guardar</Button>
            </ButtonGroup>
          </Form>
        </Card>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}
      {cargando ? <Empty>Cargando...</Empty> : zonas.length === 0 ? <Empty>No hay zonas: se usa el costo fijo.</Empty> : (
        <Tabla>
          <thead>
            <tr><th>Zona</th><th>Códigos postales</th><th>Costo</th><th>Demora</th><th>Estado</th><th aria-label="Acciones" /></tr>
          </thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z.id}>
                <td>{z.nombre}</td>
                <td>{z.cpDesde} a {z.cpHasta}</td>
                <td>{z.costo > 0 ? formatearPrecio(z.costo) : 'Gratis'}</td>
                <td>{z.demora || '-'}</td>
                <td>{z.activo ? <Tag $color="#27ae60">Activa</Tag> : <Tag $color="#7f8c8d">Inactiva</Tag>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <IconButton onClick={() => editar(z)} aria-label={`Editar ${z.nombre}`}><FaEdit /></IconButton>
                  <IconButton $peligro onClick={() => eliminar(z)} aria-label={`Eliminar ${z.nombre}`}><FaTrash /></IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Container>
  );
};

export default ZonasEnvioAdmin;
