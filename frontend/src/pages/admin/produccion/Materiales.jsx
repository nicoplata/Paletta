import { useState } from 'react';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { Button, ButtonGroup, CheckLabel, Empty, ErrorBox, Form, FormGroup, Hint, IconButton, Input, Label, Row, Select, Tag } from '../adminUI';
import { Tabla, TablaScroll, pesos } from '../egresados/comun';
import { UNIDADES, cant } from './comunProduccion';

const VACIO = { nombre: '', tipo: 'tela', color: '', unidad: 'm', ancho: '', proveedor: '', precio: '0', stock: '0', notas: '', activo: true };

// Catálogo de telas e insumos con precio y stock (la lista de compras descuenta el stock)
const Materiales = () => {
  const { showToast } = useToast();
  const { data: lista, cargando, error, recargar } = useRecurso('/admin/produccion/materiales', { porDefecto: [] });
  const [form, setForm] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm('');
    const { id, ...f } = form;
    const datos = { ...f, precio: Number(f.precio) || 0, stock: Number(f.stock) || 0, ancho: f.ancho === '' ? null : Number(f.ancho) };
    try {
      if (id) await api.put(`/admin/produccion/materiales/${id}`, datos);
      else await api.post('/admin/produccion/materiales', datos);
      showToast('Material guardado', 'success');
      setForm(null);
      recargar();
    } catch (err) {
      setErrorForm(mensajeError(err));
    }
  };

  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar ${m.nombre}${m.color ? ` ${m.color}` : ''}? Las prendas que lo usen quedan sin material elegido.`)) return;
    try {
      await api.delete(`/admin/produccion/materiales/${m.id}`);
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  if (form) {
    return (
      <Form onSubmit={guardar}>
        <h2>{form.id ? 'Editar material' : 'Nuevo material'}</h2>
        {errorForm && <ErrorBox role="alert">{errorForm}</ErrorBox>}
        <Row>
          <FormGroup><Label htmlFor="m-nombre">Nombre</Label><Input id="m-nombre" value={form.nombre} onChange={cambiar('nombre')} required placeholder="Frisa invisible" /></FormGroup>
          <FormGroup><Label htmlFor="m-color">Color (opcional)</Label><Input id="m-color" value={form.color} onChange={cambiar('color')} placeholder="Azul marino" /></FormGroup>
        </Row>
        <Row>
          <FormGroup>
            <Label htmlFor="m-tipo">Tipo</Label>
            <Select id="m-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, unidad: e.target.value === 'tela' ? 'm' : 'u' })}>
              <option value="tela">Tela (se calcula por talle)</option>
              <option value="insumo">Insumo (cantidad por prenda)</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <Label htmlFor="m-unidad">Unidad</Label>
            <Select id="m-unidad" value={form.unidad} onChange={cambiar('unidad')}>
              {[...new Set([...UNIDADES, form.unidad])].map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </FormGroup>
          {form.tipo === 'tela' && <FormGroup><Label htmlFor="m-ancho">Ancho (m, opcional)</Label><Input id="m-ancho" type="number" min="0" step="0.01" value={form.ancho} onChange={cambiar('ancho')} /></FormGroup>}
        </Row>
        <Row>
          <FormGroup><Label htmlFor="m-precio">Precio por {form.unidad}</Label><Input id="m-precio" type="number" min="0" step="0.01" value={form.precio} onChange={cambiar('precio')} /></FormGroup>
          <FormGroup><Label htmlFor="m-stock">Stock actual ({form.unidad})</Label><Input id="m-stock" type="number" min="0" step="0.01" value={form.stock} onChange={cambiar('stock')} /></FormGroup>
          <FormGroup><Label htmlFor="m-prov">Proveedor (opcional)</Label><Input id="m-prov" value={form.proveedor} onChange={cambiar('proveedor')} /></FormGroup>
        </Row>
        <FormGroup><Label htmlFor="m-notas">Notas (opcional)</Label><Input id="m-notas" value={form.notas} onChange={cambiar('notas')} placeholder="Código del proveedor, gramaje…" /></FormGroup>
        <CheckLabel><input type="checkbox" checked={form.activo} onChange={cambiar('activo')} /> Activo (aparece para elegir en las prendas)</CheckLabel>
        <ButtonGroup><Button type="button" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit" $primario>Guardar</Button></ButtonGroup>
      </Form>
    );
  }

  return (
    <>
      <Hint>Las telas se calculan con los metros por talle de cada ficha técnica; los insumos, por prenda. El stock se descuenta de la lista de compras.</Hint>
      {error && <ErrorBox>{error}</ErrorBox>}
      <ButtonGroup style={{ justifyContent: 'flex-start', margin: '12px 0' }}><Button $primario onClick={() => { setErrorForm(''); setForm(VACIO); }}><FaPlus /> Nuevo material</Button></ButtonGroup>
      {cargando ? <Empty>Cargando...</Empty> : lista.length === 0 ? <Empty>Todavía no cargaste materiales. Empezá por las telas que más usás (frisa, rib, jersey) y los insumos (cierres, etiquetas, cordones).</Empty> : (
        <TablaScroll>
          <Tabla>
            <thead><tr><th>Material</th><th>Tipo</th><th>Proveedor</th><th className="num">Precio</th><th className="num">Stock</th><th /></tr></thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} style={m.activo ? undefined : { opacity: 0.5 }}>
                  <td><strong>{m.nombre}</strong>{m.color ? ` · ${m.color}` : ''}{m.notas && <><br /><small>{m.notas}</small></>}</td>
                  <td><Tag $color={m.tipo === 'tela' ? '#2980b9' : '#8e44ad'}>{m.tipo === 'tela' ? 'Tela' : 'Insumo'}</Tag></td>
                  <td>{m.proveedor || '-'}</td>
                  <td className="num">{pesos(m.precio)} / {m.unidad}</td>
                  <td className="num">{cant(m.stock)} {m.unidad}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <IconButton onClick={() => { setErrorForm(''); setForm({ ...VACIO, ...m, color: m.color || '', proveedor: m.proveedor || '', notas: m.notas || '', ancho: m.ancho ?? '', precio: String(m.precio), stock: String(m.stock) }); }} aria-label={`Editar ${m.nombre}`}><FaEdit /></IconButton>
                    <IconButton $peligro onClick={() => eliminar(m)} aria-label={`Eliminar ${m.nombre}`}><FaTrash /></IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </TablaScroll>
      )}
    </>
  );
};

export default Materiales;
