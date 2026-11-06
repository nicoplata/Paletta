import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import {
  Button, ButtonGroup, CheckLabel, Container, Empty, ErrorBox, Form, FormGroup, Header, Hint, IconButton, Input, Label, Row, Select, Tag, TextArea, Title,
} from '../adminUI';
import { FormPromo, aPayloadPromo } from './EgresadosAdmin';
import { Cifras, ESTADOS_PRODUCCION, LinkCopiable, Puntos, Seccion, Tabla, TablaScroll, fecha, nombrePlan, pesos } from './comun';

const PRENDA_VACIA = { nombre: '', descripcion: '', precio: '', talles: '4, 6, 8, 10, 12, 14, 16, S, M, L, XL, XXL', conBordado: false, orden: '0', activo: true };

const aFormPromo = (p) => ({
  colegio: p.colegio, curso: p.curso, anio: String(p.anio), planes: p.planes, descuentoContado: String(p.descuentoContado),
  recargoTipo: p.recargoTipo || '', recargoValor: p.recargoValor != null ? String(p.recargoValor) : '',
  primerVencimiento: p.primerVencimiento, fechaCierre: p.fechaCierre || '', notas: p.notas || '',
});

const FILTROS = {
  todos: { texto: 'Todos', f: () => true },
  pendientes: { texto: 'Con pendientes', f: (a) => a.pendientes.length > 0 },
  sinIngresar: { texto: 'No entraron', f: (a) => !a.progreso.ingreso },
  vencidas: { texto: 'Con cuotas vencidas', f: (a) => a.cuotas.some((c) => c.estado === 'vencida') },
};

const PromoEgresadosAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: promo, cargando, error, recargar } = useRecurso(`/admin/egresados/promos/${id}`);
  const [editando, setEditando] = useState(null);
  const [errorPromo, setErrorPromo] = useState('');
  const [prenda, setPrenda] = useState(null);
  const [errorPrenda, setErrorPrenda] = useState('');
  const [nombres, setNombres] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const alumnos = useMemo(() => (promo ? promo.alumnos.filter(FILTROS[filtro].f) : []), [promo, filtro]);

  if (cargando && !promo) return <Container><Empty>Cargando...</Empty></Container>;
  if (error) return <Container><ErrorBox>{error}</ErrorBox></Container>;
  if (!promo) return null;
  const r = promo.resumen;

  const guardarPromo = async (e) => {
    e.preventDefault();
    setErrorPromo('');
    try {
      await api.put(`/admin/egresados/promos/${id}`, aPayloadPromo(editando));
      setEditando(null);
      showToast('Promo actualizada', 'success');
      recargar();
    } catch (err) {
      setErrorPromo(mensajeError(err));
    }
  };

  const cambiarCampo = async (campos, ok) => {
    try {
      await api.put(`/admin/egresados/promos/${id}`, campos);
      if (ok) showToast(ok, 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const eliminarPromo = async () => {
    if (!window.confirm(`¿Eliminar la promo ${promo.colegio} ${promo.curso} ${promo.anio}? Se borran sus alumnos y prendas.`)) return;
    try {
      await api.delete(`/admin/egresados/promos/${id}`);
      navigate('/admin/dashboard/egresados');
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const guardarPrenda = async (e) => {
    e.preventDefault();
    setErrorPrenda('');
    const { id: prendaId, ...f } = prenda;
    const payload = {
      ...f,
      precio: Number(f.precio),
      orden: Number(f.orden || 0),
      talles: f.talles.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (prendaId) await api.put(`/admin/egresados/prendas/${prendaId}`, payload);
      else await api.post(`/admin/egresados/promos/${id}/prendas`, payload);
      setPrenda(null);
      recargar();
    } catch (err) {
      setErrorPrenda(mensajeError(err));
    }
  };

  const eliminarPrenda = async (p) => {
    if (!window.confirm(`¿Eliminar ${p.nombre}?`)) return;
    try {
      await api.delete(`/admin/egresados/prendas/${p.id}`);
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const agregarAlumnos = async (e) => {
    e.preventDefault();
    const lista = nombres.split('\n').map((n) => n.trim()).filter((n) => n.length >= 3);
    if (!lista.length) return;
    try {
      const { data } = await api.post(`/admin/egresados/promos/${id}/alumnos`, { nombres: lista });
      showToast(`${data.creados} alumno(s) agregados${data.omitidos ? ` · ${data.omitidos} ya estaban` : ''}`, 'success');
      setNombres('');
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  return (
    <Container>
      <Header>
        <div>
          <Link to="/admin/dashboard/egresados" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}><FaArrowLeft /> Egresados</Link>
          <Title>{promo.colegio} · {promo.curso} · {promo.anio}</Title>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select aria-label="Estado de la promo" value={promo.estadoProduccion} onChange={(e) => cambiarCampo({ estadoProduccion: e.target.value }, 'Estado actualizado')} style={{ width: 'auto' }}>
            {Object.entries(ESTADOS_PRODUCCION).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </Select>
          <Button onClick={() => cambiarCampo({ activo: !promo.activo }, promo.activo ? 'Promo desactivada' : 'Promo activada')}>{promo.activo ? 'Desactivar' : 'Activar'}</Button>
          <Button $peligro onClick={eliminarPromo}><FaTrash /> Eliminar</Button>
        </div>
      </Header>

      <Seccion>
        <h2>Link para la comisión</h2>
        <LinkCopiable url={promo.link} onCopiado={() => showToast('Link copiado', 'success')} />
        <Hint>Mandalo al grupo de WhatsApp del curso: cada familia entra, busca a su hijo/a y se identifica con el DNI.</Hint>
        {!promo.activo && <Hint style={{ color: '#c0392b' }}>La promo está desactivada: el link no funciona.</Hint>}
      </Seccion>

      <Cifras>
        <div><span>Alumnos</span><b>{r.alumnos}</b></div>
        <div><span>Entraron</span><b>{r.ingresaron}</b></div>
        <div><span>Datos completos</span><b>{r.datos}</b></div>
        <div><span>Prendas elegidas</span><b>{r.prendas}</b></div>
        <div><span>Con plan</span><b>{r.plan}</b></div>
        <div><span>Cuota 1 paga</span><b>{r.sena}</b></div>
        <div><span>Cobrado</span><b>{pesos(r.cobrado)}</b></div>
        <div><span>Total comprometido</span><b>{pesos(r.total)}</b></div>
      </Cifras>

      <Seccion>
        <h2>Configuración</h2>
        {editando ? (
          <FormPromo valor={editando} onChange={setEditando} onSubmit={guardarPromo} onCancel={() => setEditando(null)} error={errorPromo} />
        ) : (
          <>
            <p style={{ margin: 0 }}>
              Planes: <strong>{promo.planes.map(nombrePlan).join(', ')}</strong> · Descuento contado: <strong>{promo.descuentoContado}%</strong>
              {' · '}Recargo: <strong>{promo.recargoTipo ? (promo.recargoTipo === 'porcentaje' ? `${promo.recargoValor}%` : pesos(promo.recargoValor)) : 'no'}</strong>
              <br />Cuota 1 vence el <strong>{fecha(promo.primerVencimiento)}</strong> · Cierre de la carga: <strong>{fecha(promo.fechaCierre)}</strong>
            </p>
            <ButtonGroup style={{ justifyContent: 'flex-start', marginTop: 12 }}><Button onClick={() => setEditando(aFormPromo(promo))}><FaEdit /> Editar</Button></ButtonGroup>
          </>
        )}
      </Seccion>

      <Seccion>
        <h2>Prendas y precios</h2>
        {prenda ? (
          <Form onSubmit={guardarPrenda}>
            {errorPrenda && <ErrorBox role="alert">{errorPrenda}</ErrorBox>}
            <Row>
              <FormGroup><Label htmlFor="p-nombre">Prenda</Label><Input id="p-nombre" value={prenda.nombre} onChange={(e) => setPrenda({ ...prenda, nombre: e.target.value })} required placeholder="Buzo canguro" /></FormGroup>
              <FormGroup><Label htmlFor="p-precio">Precio</Label><Input id="p-precio" type="number" min="0" step="1" value={prenda.precio} onChange={(e) => setPrenda({ ...prenda, precio: e.target.value })} required /></FormGroup>
              <FormGroup><Label htmlFor="p-orden">Orden</Label><Input id="p-orden" type="number" min="0" value={prenda.orden} onChange={(e) => setPrenda({ ...prenda, orden: e.target.value })} /></FormGroup>
            </Row>
            <FormGroup><Label htmlFor="p-talles">Talles (separados por coma)</Label><Input id="p-talles" value={prenda.talles} onChange={(e) => setPrenda({ ...prenda, talles: e.target.value })} required /></FormGroup>
            <FormGroup><Label htmlFor="p-desc">Descripción (opcional)</Label><Input id="p-desc" value={prenda.descripcion} onChange={(e) => setPrenda({ ...prenda, descripcion: e.target.value })} placeholder="Colores de la promo, frisa, etc." /></FormGroup>
            <div style={{ display: 'flex', gap: 16 }}>
              <CheckLabel><input type="checkbox" checked={prenda.conBordado} onChange={(e) => setPrenda({ ...prenda, conBordado: e.target.checked })} /> Lleva nombre o apodo bordado</CheckLabel>
              <CheckLabel><input type="checkbox" checked={prenda.activo} onChange={(e) => setPrenda({ ...prenda, activo: e.target.checked })} /> Disponible</CheckLabel>
            </div>
            <ButtonGroup><Button type="button" onClick={() => setPrenda(null)}>Cancelar</Button><Button type="submit" $primario>Guardar prenda</Button></ButtonGroup>
          </Form>
        ) : (
          <>
            {promo.prendas.length === 0 ? <Empty>Todavía no hay prendas: cargá al menos una para que las familias puedan elegir.</Empty> : (
              <TablaScroll>
                <Tabla>
                  <thead><tr><th>Prenda</th><th>Talles</th><th>Bordado</th><th className="num">Precio</th><th /></tr></thead>
                  <tbody>
                    {promo.prendas.map((p) => (
                      <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                        <td><strong>{p.nombre}</strong>{p.descripcion ? <><br /><small>{p.descripcion}</small></> : null}{!p.activo && <><br /><Tag $color="#7f8c8d">No disponible</Tag></>}</td>
                        <td>{p.talles.join(', ')}</td>
                        <td>{p.conBordado ? 'Sí' : 'No'}</td>
                        <td className="num">{pesos(p.precio)}</td>
                        <td className="num">
                          <IconButton onClick={() => setPrenda({ ...p, precio: String(p.precio), orden: String(p.orden), talles: p.talles.join(', '), descripcion: p.descripcion || '' })} aria-label={`Editar ${p.nombre}`}><FaEdit /></IconButton>
                          <IconButton $peligro onClick={() => eliminarPrenda(p)} aria-label={`Eliminar ${p.nombre}`}><FaTrash /></IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              </TablaScroll>
            )}
            <ButtonGroup style={{ justifyContent: 'flex-start', marginTop: 12 }}><Button onClick={() => { setErrorPrenda(''); setPrenda(PRENDA_VACIA); }}><FaPlus /> Agregar prenda</Button></ButtonGroup>
            <Hint>Si cambiás un precio, se aplica a lo que elijan desde ahora. Para corregir a alguien que ya eligió, usá el ajuste en su ficha.</Hint>
          </>
        )}
      </Seccion>

      <Seccion>
        <h2>Alumnos ({promo.alumnos.length})</h2>
        <form onSubmit={agregarAlumnos} style={{ marginBottom: 16 }}>
          <FormGroup>
            <Label htmlFor="nombres">Agregar alumnos (uno por línea, nombre y apellido)</Label>
            <TextArea id="nombres" rows={3} value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder={'Sofía Ramírez\nTomás Benítez'} />
          </FormGroup>
          <ButtonGroup style={{ justifyContent: 'flex-start', marginTop: 8 }}><Button type="submit" disabled={!nombres.trim()}><FaPlus /> Agregar a la lista</Button></ButtonGroup>
          <Hint>Opcional: si no cargás la lista, cada familia se puede sumar sola desde el link. Con la lista, el tablero muestra quién no entró todavía.</Hint>
        </form>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {Object.entries(FILTROS).map(([k, { texto }]) => (
            <Button key={k} type="button" $primario={filtro === k} onClick={() => setFiltro(k)} style={{ padding: '0.35rem 0.8rem' }}>{texto}</Button>
          ))}
        </div>

        {alumnos.length === 0 ? <Empty>No hay alumnos en este filtro.</Empty> : (
          <TablaScroll>
            <Tabla>
              <thead><tr><th>Alumno</th><th>Avance</th><th>Pendiente</th><th>Plan</th><th className="num">Pagado</th><th className="num">Total</th></tr></thead>
              <tbody>
                {alumnos.map((a) => (
                  <tr key={a.id}>
                    <td><Link to={`/admin/dashboard/egresados/alumnos/${a.id}`}><strong>{a.nombre}</strong></Link><br /><small>{a.codigo}{a.agregadoPorFamilia ? ' · se sumó desde el link' : ''}</small></td>
                    <td><Puntos progreso={a.progreso} /></td>
                    <td>{a.pendientes.length ? <small style={{ color: '#c0392b' }}>{a.pendientes.join(' · ')}</small> : <small style={{ color: '#27ae60' }}>Al día</small>}</td>
                    <td>{nombrePlan(a.plan)}</td>
                    <td className="num">{pesos(a.totales.pagado)}</td>
                    <td className="num">{a.progreso.plan ? pesos(a.totales.total) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </TablaScroll>
        )}
      </Seccion>
    </Container>
  );
};

export default PromoEgresadosAdmin;
