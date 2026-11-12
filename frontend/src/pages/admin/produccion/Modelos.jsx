import { useState } from 'react';
import { FaCopy, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { useEsAdmin } from '../../../context/AuthContext';
import { Button, ButtonGroup, CheckLabel, Empty, ErrorBox, Form, FormGroup, Hint, IconButton, Input, Label, Row, TextArea } from '../adminUI';
import { Tabla, TablaScroll, pesos } from '../egresados/comun';
import { cant } from './comunProduccion';

const VACIO = {
  nombre: '', categoria: '', talles: 'S, M, L, XL', desperdicio: '5', costoConfeccion: '0',
  piezas: [{ rol: 'Cuerpo y mangas', porTalle: {} }, { rol: 'Puños y cintura', porTalle: {} }],
  insumos: [{ rol: 'Etiqueta de talle', cantidad: '1' }],
  pasos: '', notas: '', activo: true,
};

const separarTalles = (txt) => [...new Set(String(txt).split(',').map((t) => t.trim()).filter(Boolean))];

// Ficha técnica: metros de cada pieza por talle, insumos por prenda, desperdicio y costo del taller
const Modelos = () => {
  const { showToast } = useToast();
  const esAdmin = useEsAdmin();
  const { data: lista, cargando, error, recargar } = useRecurso('/admin/produccion/modelos', { porDefecto: [] });
  const [form, setForm] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const talles = form ? separarTalles(form.talles) : [];

  const abrir = (m, copia = false) => {
    setErrorForm('');
    setForm({
      ...VACIO, ...m,
      id: copia ? undefined : m.id,
      nombre: copia ? `${m.nombre} (copia)` : m.nombre,
      categoria: m.categoria || '', pasos: m.pasos || '', notas: m.notas || '',
      talles: m.talles.join(', '), desperdicio: String(m.desperdicio), costoConfeccion: String(m.costoConfeccion),
      piezas: m.piezas.map((p) => ({ rol: p.rol, porTalle: Object.fromEntries(Object.entries(p.porTalle).map(([t, n]) => [t, String(n)])) })),
      insumos: m.insumos.map((i) => ({ rol: i.rol, cantidad: String(i.cantidad) })),
    });
  };

  const setPieza = (i, cambios) => setForm({ ...form, piezas: form.piezas.map((p, j) => (j === i ? { ...p, ...cambios } : p)) });
  const setInsumo = (i, cambios) => setForm({ ...form, insumos: form.insumos.map((p, j) => (j === i ? { ...p, ...cambios } : p)) });

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm('');
    const { id, ...f } = form;
    const datos = {
      nombre: f.nombre, categoria: f.categoria, pasos: f.pasos, notas: f.notas, activo: f.activo,
      talles,
      desperdicio: Number(f.desperdicio) || 0,
      costoConfeccion: Number(f.costoConfeccion) || 0,
      piezas: f.piezas.filter((p) => p.rol.trim()).map((p) => ({
        rol: p.rol.trim(),
        porTalle: Object.fromEntries(talles.map((t) => [t, Number(String(p.porTalle[t] ?? '').replace(',', '.'))]).filter(([, n]) => n > 0)),
      })),
      insumos: f.insumos.filter((i) => i.rol.trim()).map((i) => ({ rol: i.rol.trim(), cantidad: Number(String(i.cantidad).replace(',', '.')) || 0 })),
    };
    try {
      if (id) await api.put(`/admin/produccion/modelos/${id}`, datos);
      else await api.post('/admin/produccion/modelos', datos);
      showToast('Ficha técnica guardada', 'success');
      setForm(null);
      recargar();
    } catch (err) {
      setErrorForm(mensajeError(err));
    }
  };

  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar la ficha técnica ${m.nombre}?`)) return;
    try {
      await api.delete(`/admin/produccion/modelos/${m.id}`);
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 7000);
    }
  };

  if (form) {
    return (
      <Form onSubmit={guardar}>
        <h2>{form.id ? 'Editar ficha técnica' : 'Nueva ficha técnica'}</h2>
        {errorForm && <ErrorBox role="alert">{errorForm}</ErrorBox>}
        <Row>
          <FormGroup><Label htmlFor="f-nombre">Modelo</Label><Input id="f-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Buzo canguro con capucha" /></FormGroup>
          <FormGroup><Label htmlFor="f-cat">Categoría (opcional)</Label><Input id="f-cat" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Buzo, campera, chomba…" /></FormGroup>
        </Row>
        <Row>
          <FormGroup><Label htmlFor="f-talles">Talles (separados por coma)</Label><Input id="f-talles" value={form.talles} onChange={(e) => setForm({ ...form, talles: e.target.value })} required /></FormGroup>
          <FormGroup><Label htmlFor="f-desp">Desperdicio de corte (%)</Label><Input id="f-desp" type="number" min="0" max="100" step="0.5" value={form.desperdicio} onChange={(e) => setForm({ ...form, desperdicio: e.target.value })} /></FormGroup>
          <FormGroup><Label htmlFor="f-costo">Costo de confección por prenda</Label><Input id="f-costo" type="number" min="0" step="1" value={form.costoConfeccion} onChange={(e) => setForm({ ...form, costoConfeccion: e.target.value })} /></FormGroup>
        </Row>

        <h3 style={{ marginTop: 8 }}>Tela por pieza y talle</h3>
        <Hint>Metros (o la unidad de la tela) que lleva una prenda de cada talle. El color se elige después, en cada prenda de la promo.</Hint>
        <TablaScroll>
          <Tabla>
            <thead><tr><th>Pieza</th>{talles.map((t) => <th key={t} className="num">{t}</th>)}<th /></tr></thead>
            <tbody>
              {form.piezas.map((p, i) => (
                <tr key={i}>
                  <td><Input aria-label={`Pieza ${i + 1}`} value={p.rol} onChange={(e) => setPieza(i, { rol: e.target.value })} placeholder="Capucha" style={{ minWidth: 150 }} /></td>
                  {talles.map((t) => (
                    <td key={t}><Input aria-label={`${p.rol || 'Pieza'} talle ${t}`} inputMode="decimal" value={p.porTalle[t] ?? ''} onChange={(e) => setPieza(i, { porTalle: { ...p.porTalle, [t]: e.target.value } })} style={{ width: 72, textAlign: 'right' }} placeholder="0,00" /></td>
                  ))}
                  <td><IconButton type="button" $peligro onClick={() => setForm({ ...form, piezas: form.piezas.filter((_, j) => j !== i) })} aria-label={`Quitar ${p.rol || 'pieza'}`}><FaTrash /></IconButton></td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </TablaScroll>
        <ButtonGroup style={{ justifyContent: 'flex-start' }}><Button type="button" onClick={() => setForm({ ...form, piezas: [...form.piezas, { rol: '', porTalle: {} }] })}><FaPlus /> Agregar pieza</Button></ButtonGroup>

        <h3 style={{ marginTop: 8 }}>Insumos por prenda</h3>
        {form.insumos.map((ins, i) => (
          <Row key={i} style={{ alignItems: 'end' }}>
            <FormGroup><Label htmlFor={`ins-${i}`}>Insumo</Label><Input id={`ins-${i}`} value={ins.rol} onChange={(e) => setInsumo(i, { rol: e.target.value })} placeholder="Cierre 60 cm" /></FormGroup>
            <FormGroup><Label htmlFor={`ins-c-${i}`}>Cantidad por prenda</Label><Input id={`ins-c-${i}`} inputMode="decimal" value={ins.cantidad} onChange={(e) => setInsumo(i, { cantidad: e.target.value })} /></FormGroup>
            <IconButton type="button" $peligro onClick={() => setForm({ ...form, insumos: form.insumos.filter((_, j) => j !== i) })} aria-label={`Quitar ${ins.rol || 'insumo'}`} style={{ marginBottom: 8 }}><FaTrash /></IconButton>
          </Row>
        ))}
        <ButtonGroup style={{ justifyContent: 'flex-start' }}><Button type="button" onClick={() => setForm({ ...form, insumos: [...form.insumos, { rol: '', cantidad: '1' }] })}><FaPlus /> Agregar insumo</Button></ButtonGroup>

        <FormGroup><Label htmlFor="f-pasos">Indicaciones de confección (van en la ficha de taller)</Label><TextArea id="f-pasos" rows={5} value={form.pasos} onChange={(e) => setForm({ ...form, pasos: e.target.value })} placeholder={'1. Unir hombros con overlock\n2. Pegar mangas…'} /></FormGroup>
        <FormGroup><Label htmlFor="f-notas">Notas internas (opcional)</Label><TextArea id="f-notas" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></FormGroup>
        <CheckLabel><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activa (aparece para elegir en las prendas)</CheckLabel>
        <ButtonGroup><Button type="button" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit" $primario>Guardar ficha</Button></ButtonGroup>
      </Form>
    );
  }

  return (
    <>
      <Hint>Una ficha por modelo (no por color): la usan todas las promos que lleven ese modelo.</Hint>
      {error && <ErrorBox>{error}</ErrorBox>}
      <ButtonGroup style={{ justifyContent: 'flex-start', margin: '12px 0' }}><Button $primario onClick={() => { setErrorForm(''); setForm(VACIO); }}><FaPlus /> Nueva ficha técnica</Button></ButtonGroup>
      {cargando ? <Empty>Cargando...</Empty> : lista.length === 0 ? <Empty>Todavía no hay fichas técnicas. Cargá los metros por talle de tus modelos (buzo canguro, campera, chomba…).</Empty> : (
        <TablaScroll>
          <Tabla>
            <thead><tr><th>Modelo</th><th>Talles</th><th>Piezas</th><th>Insumos</th><th className="num">Desperdicio</th><th className="num">Confección</th><th /></tr></thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} style={m.activo ? undefined : { opacity: 0.5 }}>
                  <td><strong>{m.nombre}</strong>{m.categoria ? <><br /><small>{m.categoria}</small></> : null}</td>
                  <td>{m.talles.join(', ')}</td>
                  <td>{m.piezas.map((p) => `${p.rol} (${Object.values(p.porTalle).length ? `${cant(Math.min(...Object.values(p.porTalle)))}–${cant(Math.max(...Object.values(p.porTalle)))}` : 'sin consumo'})`).join(' · ') || '-'}</td>
                  <td>{m.insumos.map((i) => `${i.rol} ×${cant(i.cantidad)}`).join(' · ') || '-'}</td>
                  <td className="num">{cant(m.desperdicio)}%</td>
                  <td className="num">{pesos(m.costoConfeccion)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <IconButton onClick={() => abrir(m)} aria-label={`Editar ${m.nombre}`}><FaEdit /></IconButton>
                    <IconButton onClick={() => abrir(m, true)} aria-label={`Duplicar ${m.nombre}`} title="Duplicar"><FaCopy /></IconButton>
                    {esAdmin && <IconButton $peligro onClick={() => eliminar(m)} aria-label={`Eliminar ${m.nombre}`}><FaTrash /></IconButton>}
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

export default Modelos;
