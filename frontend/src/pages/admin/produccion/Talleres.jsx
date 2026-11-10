import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaPlus, FaPrint, FaTrash, FaWhatsapp } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { Button, ButtonGroup, CheckLabel, Empty, ErrorBox, Form, FormGroup, Hint, IconButton, Input, Label, Row, Tag } from '../adminUI';
import { Tabla, TablaScroll, fecha, pesos } from '../egresados/comun';
import { ESTADO_ORDEN, hoyISO, linkWhatsApp } from './comunProduccion';

const VACIO = { nombre: '', contacto: '', telefono: '', direccion: '', notas: '', activo: true };

// Talleres externos de confección y las órdenes que tienen abiertas
const Talleres = () => {
  const { showToast } = useToast();
  const { data: talleres, cargando, error, recargar } = useRecurso('/admin/produccion/talleres', { porDefecto: [] });
  const { data: ordenes } = useRecurso('/admin/produccion/ordenes', { porDefecto: [] });
  const [form, setForm] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const hoy = hoyISO();

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm('');
    const { id, nombre, contacto, telefono, direccion, notas, activo } = form;
    try {
      if (id) await api.put(`/admin/produccion/talleres/${id}`, { nombre, contacto, telefono, direccion, notas, activo });
      else await api.post('/admin/produccion/talleres', { nombre, contacto, telefono, direccion, notas, activo });
      showToast('Taller guardado', 'success');
      setForm(null);
      recargar();
    } catch (err) {
      setErrorForm(mensajeError(err));
    }
  };

  const eliminar = async (t) => {
    if (!window.confirm(`¿Eliminar el taller ${t.nombre}?`)) return;
    try {
      await api.delete(`/admin/produccion/talleres/${t.id}`);
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 7000);
    }
  };

  if (form) {
    return (
      <Form onSubmit={guardar}>
        <h2>{form.id ? 'Editar taller' : 'Nuevo taller'}</h2>
        {errorForm && <ErrorBox role="alert">{errorForm}</ErrorBox>}
        <Row>
          <FormGroup><Label htmlFor="t-nombre">Taller</Label><Input id="t-nombre" value={form.nombre} onChange={cambiar('nombre')} required /></FormGroup>
          <FormGroup><Label htmlFor="t-contacto">Contacto (opcional)</Label><Input id="t-contacto" value={form.contacto} onChange={cambiar('contacto')} /></FormGroup>
          <FormGroup><Label htmlFor="t-tel">WhatsApp (opcional)</Label><Input id="t-tel" value={form.telefono} onChange={cambiar('telefono')} placeholder="11 5555-1234" /></FormGroup>
        </Row>
        <FormGroup><Label htmlFor="t-dir">Dirección (opcional)</Label><Input id="t-dir" value={form.direccion} onChange={cambiar('direccion')} /></FormGroup>
        <FormGroup><Label htmlFor="t-notas">Notas (opcional)</Label><Input id="t-notas" value={form.notas} onChange={cambiar('notas')} placeholder="Qué hace bien, máquinas, días de retiro…" /></FormGroup>
        <CheckLabel><input type="checkbox" checked={form.activo} onChange={cambiar('activo')} /> Activo</CheckLabel>
        <ButtonGroup><Button type="button" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit" $primario>Guardar</Button></ButtonGroup>
      </Form>
    );
  }

  const abiertas = ordenes.filter((o) => o.estado !== 'recibida');

  return (
    <>
      <Hint>El corte se hace en Paletta; las órdenes de taller se crean desde la producción de cada promo.</Hint>
      {error && <ErrorBox>{error}</ErrorBox>}
      <ButtonGroup style={{ justifyContent: 'flex-start', margin: '12px 0' }}><Button $primario onClick={() => { setErrorForm(''); setForm(VACIO); }}><FaPlus /> Nuevo taller</Button></ButtonGroup>
      {cargando ? <Empty>Cargando...</Empty> : talleres.length === 0 ? <Empty>Todavía no cargaste talleres.</Empty> : (
        <TablaScroll>
          <Tabla>
            <thead><tr><th>Taller</th><th>Contacto</th><th className="num">Prendas en el taller</th><th /></tr></thead>
            <tbody>
              {talleres.map((t) => {
                const enTaller = abiertas.filter((o) => o.tallerId === t.id && o.estado === 'enviada').reduce((a, o) => a + o.enviadas, 0);
                return (
                  <tr key={t.id} style={t.activo ? undefined : { opacity: 0.5 }}>
                    <td><strong>{t.nombre}</strong>{t.direccion && <><br /><small>{t.direccion}</small></>}{t.notas && <><br /><small>{t.notas}</small></>}</td>
                    <td>{t.contacto || '-'}{t.telefono && <><br /><a href={linkWhatsApp(t.telefono)} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> {t.telefono}</a></>}</td>
                    <td className="num">{enTaller}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <IconButton onClick={() => { setErrorForm(''); setForm({ ...VACIO, ...t, contacto: t.contacto || '', telefono: t.telefono || '', direccion: t.direccion || '', notas: t.notas || '' }); }} aria-label={`Editar ${t.nombre}`}><FaEdit /></IconButton>
                      <IconButton $peligro onClick={() => eliminar(t)} aria-label={`Eliminar ${t.nombre}`}><FaTrash /></IconButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </TablaScroll>
      )}

      <h2 style={{ marginTop: 28 }}>Órdenes abiertas</h2>
      {abiertas.length === 0 ? <Empty>No hay órdenes en preparación ni en taller.</Empty> : (
        <TablaScroll>
          <Tabla>
            <thead><tr><th>Orden</th><th>Promo y prenda</th><th>Taller</th><th>Estado</th><th>Compromiso</th><th className="num">Prendas</th><th className="num">Total</th><th /></tr></thead>
            <tbody>
              {abiertas.map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.numero}</strong></td>
                  <td><Link to={`/admin/dashboard/egresados/${o.promo.id}/produccion?ficha=talleres`}>{o.promo.colegio} {o.promo.curso} {o.promo.anio}</Link><br /><small>{o.prenda.nombre}</small></td>
                  <td>{o.taller?.nombre}</td>
                  <td><Tag $color={ESTADO_ORDEN[o.estado].color}>{ESTADO_ORDEN[o.estado].nombre}</Tag></td>
                  <td style={o.compromisoEl && o.compromisoEl < hoy ? { color: '#c0392b', fontWeight: 700 } : undefined}>{o.compromisoEl ? fecha(o.compromisoEl) : '-'}{o.compromisoEl && o.compromisoEl < hoy ? ' · atrasada' : ''}</td>
                  <td className="num">{o.enviadas}</td>
                  <td className="num">{pesos(o.total)}</td>
                  <td><IconButton as={Link} to={`/admin/dashboard/produccion/ordenes/${o.id}`} aria-label={`Ficha de taller ${o.numero}`} title="Ficha de taller"><FaPrint /></IconButton></td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </TablaScroll>
      )}
    </>
  );
};

export default Talleres;
