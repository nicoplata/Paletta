import { useState } from 'react';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { formatearPrecio } from '../../config';
import useRecurso from '../../hooks/useRecurso';
import { useToast } from '../../context/ToastContext';
import {
  Actions, Button, ButtonGroup, Card, CardText, CardTitle, CheckLabel, Container, Empty, ErrorBox, Form, FormGroup,
  Grid, Header, Hint, IconButton, Input, Label, Row, Select, Tag, Title,
} from './adminUI';

const VACIO = { codigo: '', descripcion: '', tipo: 'porcentaje', valor: '', minimoCompra: '', desde: '', hasta: '', usosMaximos: '', activo: true };

const aFecha = (iso) => (iso ? iso.slice(0, 10) : '');
const fecha = (iso) => new Date(iso).toLocaleDateString('es-AR');

export function estadoCupon(c, ahora = new Date()) {
  if (!c.activo) return { texto: 'Inactivo', color: '#7f8c8d' };
  if (c.hasta && new Date(c.hasta) < ahora) return { texto: 'Vencido', color: '#7f8c8d' };
  if (c.desde && new Date(c.desde) > ahora) return { texto: 'Programado', color: '#2980b9' };
  if (c.usosMaximos && c.usos >= c.usosMaximos) return { texto: 'Agotado', color: '#7f8c8d' };
  return { texto: 'Vigente', color: '#27ae60' };
}

const CuponesAdmin = () => {
  const { showToast } = useToast();
  const { data: cupones, cargando, error, recargar } = useRecurso('/admin/cupones', { porDefecto: [] });
  const [form, setForm] = useState(null); // null = cerrado; { id?, ...campos }
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const editar = (c) => {
    setErrorForm('');
    setForm(c ? {
      id: c.id,
      codigo: c.codigo,
      descripcion: c.descripcion || '',
      tipo: c.tipo,
      valor: String(c.valor),
      minimoCompra: c.minimoCompra ? String(c.minimoCompra) : '',
      desde: aFecha(c.desde),
      hasta: aFecha(c.hasta),
      usosMaximos: c.usosMaximos ? String(c.usosMaximos) : '',
      activo: c.activo,
    } : VACIO);
  };

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    const { id, ...campos } = form;
    const payload = {
      ...campos,
      valor: Number(campos.valor),
      minimoCompra: campos.minimoCompra === '' ? null : Number(campos.minimoCompra),
      usosMaximos: campos.usosMaximos === '' ? null : Number(campos.usosMaximos),
      desde: campos.desde || null,
      // "hasta" incluye todo ese día
      hasta: campos.hasta ? `${campos.hasta}T23:59:59` : null,
    };
    try {
      if (id) await api.put(`/admin/cupones/${id}`, payload);
      else await api.post('/admin/cupones', payload);
      showToast(id ? 'Cupón actualizado' : 'Cupón creado', 'success');
      setForm(null);
      recargar();
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo guardar el cupón'));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar el cupón ${c.codigo}?`)) return;
    try {
      await api.delete(`/admin/cupones/${c.id}`);
      showToast('Cupón eliminado', 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Cupones</Title>
        {!form && <Button $primario onClick={() => editar(null)}><FaPlus /> Nuevo cupón</Button>}
      </Header>

      {form && (
        <Card style={{ marginBottom: '2rem' }}>
          <Form onSubmit={guardar}>
            {errorForm && <ErrorBox role="alert">{errorForm}</ErrorBox>}
            <Row>
              <FormGroup>
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" name="codigo" value={form.codigo} onChange={(e) => cambiar({ target: { name: 'codigo', value: e.target.value.toUpperCase() } })} required minLength={3} maxLength={40} placeholder="PROMO2027" />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Input id="descripcion" name="descripcion" value={form.descripcion} onChange={cambiar} maxLength={255} placeholder="Ej.: 10% para la promo 2027" />
              </FormGroup>
            </Row>
            <Row>
              <FormGroup>
                <Label htmlFor="tipo">Tipo</Label>
                <Select id="tipo" name="tipo" value={form.tipo} onChange={cambiar}>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto">Monto fijo ($)</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label htmlFor="valor">{form.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto (ARS)'}</Label>
                <Input id="valor" name="valor" type="number" min="0.01" max={form.tipo === 'porcentaje' ? 100 : undefined} step="0.01" value={form.valor} onChange={cambiar} required />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="minimoCompra">Compra mínima (opcional)</Label>
                <Input id="minimoCompra" name="minimoCompra" type="number" min="0" step="0.01" value={form.minimoCompra} onChange={cambiar} />
              </FormGroup>
            </Row>
            <Row>
              <FormGroup>
                <Label htmlFor="desde">Válido desde (opcional)</Label>
                <Input id="desde" name="desde" type="date" value={form.desde} onChange={cambiar} />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="hasta">Válido hasta (opcional)</Label>
                <Input id="hasta" name="hasta" type="date" value={form.hasta} onChange={cambiar} min={form.desde || undefined} />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="usosMaximos">Usos máximos (opcional)</Label>
                <Input id="usosMaximos" name="usosMaximos" type="number" min="1" step="1" value={form.usosMaximos} onChange={cambiar} />
              </FormGroup>
            </Row>
            <FormGroup>
              <CheckLabel>
                <input type="checkbox" name="activo" checked={form.activo} onChange={cambiar} />
                Activo
              </CheckLabel>
              <Hint>El descuento se aplica sobre los productos (no sobre el envío) y nunca supera el subtotal.</Hint>
            </FormGroup>
            <ButtonGroup>
              <Button type="button" onClick={() => setForm(null)}>Cancelar</Button>
              <Button type="submit" $primario disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
            </ButtonGroup>
          </Form>
        </Card>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}
      <Grid>
        {cargando ? <Empty>Cargando...</Empty> : cupones.length === 0 ? <Empty>Todavía no hay cupones.</Empty> : (
          cupones.map((c) => {
            const estado = estadoCupon(c);
            return (
              <Card key={c.id} $inactivo={estado.texto !== 'Vigente'}>
                <CardTitle>{c.codigo}</CardTitle>
                <CardText>
                  <strong>{c.tipo === 'porcentaje' ? `${c.valor}% off` : `${formatearPrecio(c.valor)} off`}</strong>
                  {c.minimoCompra ? ` · mínimo ${formatearPrecio(c.minimoCompra)}` : ''}
                </CardText>
                {c.descripcion && <CardText>{c.descripcion}</CardText>}
                <CardText>
                  Usos: {c.usos}{c.usosMaximos ? ` / ${c.usosMaximos}` : ''}
                  {c.hasta ? ` · hasta el ${fecha(c.hasta)}` : ''}
                </CardText>
                <div style={{ marginTop: '0.5rem' }}><Tag $color={estado.color}>{estado.texto}</Tag></div>
                <Actions>
                  <IconButton onClick={() => editar(c)} aria-label={`Editar ${c.codigo}`}><FaEdit /></IconButton>
                  <IconButton $peligro onClick={() => eliminar(c)} aria-label={`Eliminar ${c.codigo}`}><FaTrash /></IconButton>
                </Actions>
              </Card>
            );
          })
        )}
      </Grid>
    </Container>
  );
};

export default CuponesAdmin;
