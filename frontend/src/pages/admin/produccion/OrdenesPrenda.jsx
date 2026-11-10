import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaPrint, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { Button, ButtonGroup, ErrorBox, Form, FormGroup, Hint, IconButton, Input, Label, Row, Select, Tag } from '../adminUI';
import { Seccion, Tabla, TablaScroll, fecha, pesos } from '../egresados/comun';
import { ESTADO_ORDEN, hoyISO } from './comunProduccion';

const aNumeros = (obj) => Object.fromEntries(Object.entries(obj).map(([t, n]) => [t, Number(n) || 0]).filter(([, n]) => n > 0));

// Tabla de cantidades por talle editable (envío o recepción)
const PorTalle = ({ talles, valores, onChange, prefijo }) => (
  <TablaScroll>
    <Tabla>
      <thead><tr>{talles.map((t) => <th key={t} className="num">{t}</th>)}</tr></thead>
      <tbody>
        <tr>
          {talles.map((t) => (
            <td key={t}><Input aria-label={`${prefijo} talle ${t}`} type="number" min="0" value={valores[t] ?? ''} onChange={(e) => onChange({ ...valores, [t]: e.target.value })} style={{ width: 64, textAlign: 'right' }} /></td>
          ))}
        </tr>
      </tbody>
    </Tabla>
  </TablaScroll>
);

// Órdenes de taller de una prenda: crear, enviar, recibir (con fallas) e imprimir la ficha
const OrdenesPrenda = ({ prenda, talleres, onCambio }) => {
  const { showToast } = useToast();
  const [nueva, setNueva] = useState(null);
  const [recibiendo, setRecibiendo] = useState(null);
  const [error, setError] = useState('');
  const talles = prenda.curva.map((c) => c.talle);
  const pendientes = Object.values(prenda.pendienteTaller).reduce((a, n) => a + n, 0);
  const hoy = hoyISO();

  const accion = async (fn, ok) => {
    setError('');
    try {
      await fn();
      if (ok) showToast(ok, 'success');
      setNueva(null);
      setRecibiendo(null);
      onCambio();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const crear = (e) => {
    e.preventDefault();
    accion(() => api.post('/admin/produccion/ordenes', {
      prendaId: prenda.prendaId, tallerId: Number(nueva.tallerId), cantidades: aNumeros(nueva.cantidades),
      precioUnitario: Number(nueva.precioUnitario) || 0, compromisoEl: nueva.compromisoEl, notas: nueva.notas,
    }), 'Orden de taller creada');
  };

  const recibir = (e) => {
    e.preventDefault();
    accion(() => api.put(`/admin/produccion/ordenes/${recibiendo.id}`, {
      estado: 'recibida', recibidas: aNumeros(recibiendo.recibidas), falladas: aNumeros(recibiendo.falladas),
    }), 'Recepción registrada');
  };

  const activos = talleres.filter((t) => t.activo);

  return (
    <Seccion>
      <h2 style={{ marginBottom: 4 }}>{prenda.nombre}</h2>
      <Hint>{prenda.unidades} prendas · {pendientes ? `faltan mandar a taller ${pendientes}` : 'todo asignado a talleres'}</Hint>
      {error && <ErrorBox role="alert">{error}</ErrorBox>}

      {prenda.ordenes.length > 0 && (
        <TablaScroll>
          <Tabla>
            <thead><tr><th>Orden</th><th>Taller</th><th>Talles</th><th>Estado</th><th>Fechas</th><th className="num">Total</th><th /></tr></thead>
            <tbody>
              {prenda.ordenes.map((o) => (
                <tr key={o.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><strong>{o.numero}</strong></td>
                  <td>{o.taller?.nombre}</td>
                  <td>{talles.filter((t) => o.cantidades[t]).map((t) => `${t}: ${o.cantidades[t]}`).join(' · ')}<br /><small>{o.enviadas} prendas</small>
                    {o.estado === 'recibida' && <><br /><small>Recibidas {o.recibidasTotal}{o.falladasTotal ? ` · ${o.falladasTotal} con fallas` : ''}</small></>}
                  </td>
                  <td><Tag $color={ESTADO_ORDEN[o.estado].color}>{ESTADO_ORDEN[o.estado].nombre}</Tag></td>
                  <td>
                    {o.enviadaEl && <small>Enviada {fecha(o.enviadaEl)}<br /></small>}
                    {o.compromisoEl && <small style={o.estado !== 'recibida' && o.compromisoEl < hoy ? { color: '#c0392b', fontWeight: 700 } : undefined}>Vuelve {fecha(o.compromisoEl)}<br /></small>}
                    {o.recibidaEl && <small>Recibida {fecha(o.recibidaEl)}</small>}
                  </td>
                  <td className="num">{pesos(o.total)}<br /><small>{pesos(o.precioUnitario)} c/u</small></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {o.estado === 'preparando' && <Button type="button" onClick={() => accion(() => api.put(`/admin/produccion/ordenes/${o.id}`, { estado: 'enviada' }), 'Orden marcada como enviada')} style={{ padding: '0.35rem 0.7rem' }}>Enviar</Button>}
                    {o.estado === 'enviada' && <Button type="button" onClick={() => setRecibiendo({ id: o.id, numero: o.numero, recibidas: { ...o.cantidades }, falladas: {} })} style={{ padding: '0.35rem 0.7rem' }}>Recibir</Button>}
                    <IconButton as={Link} to={`/admin/dashboard/produccion/ordenes/${o.id}`} aria-label={`Ficha de taller ${o.numero}`} title="Ficha de taller"><FaPrint /></IconButton>
                    <IconButton $peligro onClick={() => window.confirm(`¿Eliminar la orden ${o.numero}?`) && accion(() => api.delete(`/admin/produccion/ordenes/${o.id}`), 'Orden eliminada')} aria-label={`Eliminar ${o.numero}`}><FaTrash /></IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </TablaScroll>
      )}

      {recibiendo && (
        <Form onSubmit={recibir} style={{ marginTop: 12 }}>
          <h3>Recepción de {recibiendo.numero}</h3>
          <Label>Recibidas por talle</Label>
          <PorTalle talles={talles} valores={recibiendo.recibidas} onChange={(v) => setRecibiendo({ ...recibiendo, recibidas: v })} prefijo="Recibidas" />
          <Label>Con fallas (vuelven al taller o se reponen)</Label>
          <PorTalle talles={talles} valores={recibiendo.falladas} onChange={(v) => setRecibiendo({ ...recibiendo, falladas: v })} prefijo="Con fallas" />
          <ButtonGroup><Button type="button" onClick={() => setRecibiendo(null)}>Cancelar</Button><Button type="submit" $primario>Registrar recepción</Button></ButtonGroup>
        </Form>
      )}

      {nueva ? (
        <Form onSubmit={crear} style={{ marginTop: 12 }}>
          <h3>Nueva orden de taller</h3>
          {activos.length === 0 && <Hint>Primero cargá un taller en <Link to="/admin/dashboard/produccion?tab=talleres">Producción → Talleres</Link>.</Hint>}
          <Row>
            <FormGroup>
              <Label htmlFor={`o-taller-${prenda.prendaId}`}>Taller</Label>
              <Select id={`o-taller-${prenda.prendaId}`} value={nueva.tallerId} onChange={(e) => setNueva({ ...nueva, tallerId: e.target.value })} required>
                <option value="">Elegir taller…</option>
                {activos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </Select>
            </FormGroup>
            <FormGroup><Label htmlFor={`o-precio-${prenda.prendaId}`}>Precio por prenda</Label><Input id={`o-precio-${prenda.prendaId}`} type="number" min="0" value={nueva.precioUnitario} onChange={(e) => setNueva({ ...nueva, precioUnitario: e.target.value })} /></FormGroup>
            <FormGroup><Label htmlFor={`o-comp-${prenda.prendaId}`}>Tiene que volver el</Label><Input id={`o-comp-${prenda.prendaId}`} type="date" value={nueva.compromisoEl} onChange={(e) => setNueva({ ...nueva, compromisoEl: e.target.value })} /></FormGroup>
          </Row>
          <Label>Prendas por talle</Label>
          <PorTalle talles={talles} valores={nueva.cantidades} onChange={(v) => setNueva({ ...nueva, cantidades: v })} prefijo="A enviar" />
          <FormGroup><Label htmlFor={`o-notas-${prenda.prendaId}`}>Notas para el taller (opcional)</Label><Input id={`o-notas-${prenda.prendaId}`} value={nueva.notas} onChange={(e) => setNueva({ ...nueva, notas: e.target.value })} /></FormGroup>
          <ButtonGroup><Button type="button" onClick={() => setNueva(null)}>Cancelar</Button><Button type="submit" $primario>Crear orden</Button></ButtonGroup>
        </Form>
      ) : (
        <ButtonGroup style={{ justifyContent: 'flex-start', marginTop: 12 }}>
          <Button type="button" disabled={!prenda.unidades} onClick={() => setNueva({
            tallerId: '', precioUnitario: String(prenda.modeloFicha?.costoConfeccion ?? 0), compromisoEl: '', notas: '',
            cantidades: Object.fromEntries(Object.entries(prenda.pendienteTaller).filter(([, n]) => n > 0).map(([t, n]) => [t, String(n)])),
          })}><FaPlus /> Mandar a taller</Button>
        </ButtonGroup>
      )}
    </Seccion>
  );
};

export default OrdenesPrenda;
