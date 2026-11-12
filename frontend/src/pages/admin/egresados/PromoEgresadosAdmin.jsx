import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCut, FaEdit, FaFileSignature, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { useEsAdmin } from '../../../context/AuthContext';
import {
  Button, ButtonGroup, CheckLabel, Container, Empty, ErrorBox, Form, FormGroup, Header, Hint, IconButton, Input, Label, Row, Select, Tag, TextArea, Title,
} from '../adminUI';
import { FormPromo, aPayloadPromo } from './EgresadosAdmin';
import { Cifras, ESTADOS_PRODUCCION, LinkCopiable, Puntos, Seccion, Tabla, TablaScroll, fecha, nombrePlan, pesos } from './comun';

// Ficha técnica y materiales de una prenda (para la calculadora y las fichas de producción)
const ProduccionPrenda = ({ prenda, setPrenda, modelos, materiales }) => {
  const modelo = modelos.find((m) => m.id === Number(prenda.modeloId));
  const opciones = (tipo) => materiales.filter((m) => m.tipo === tipo && (m.activo || Object.values(prenda.materiales).map(Number).includes(m.id)));
  const elegir = (rol, valor) => setPrenda({ ...prenda, materiales: { ...prenda.materiales, [rol]: valor } });
  const fila = (rol, tipo) => (
    <FormGroup key={rol}>
      <Label htmlFor={`mat-${rol}`}>{rol}</Label>
      <Select id={`mat-${rol}`} value={prenda.materiales[rol] || ''} onChange={(e) => elegir(rol, e.target.value)}>
        <option value="">Elegir {tipo === 'tela' ? 'tela' : 'insumo'}…</option>
        {opciones(tipo).map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.color ? ` · ${m.color}` : ''}{m.proveedor ? ` (${m.proveedor})` : ''}</option>)}
      </Select>
    </FormGroup>
  );
  return (
    <fieldset style={{ border: '1px solid #e3e3e3', borderRadius: 10, padding: '12px 14px', margin: '8px 0' }}>
      <legend style={{ fontWeight: 700, padding: '0 6px' }}>Producción</legend>
      <FormGroup>
        <Label htmlFor="p-modelo">Ficha técnica</Label>
        <Select id="p-modelo" value={prenda.modeloId || ''} onChange={(e) => setPrenda({ ...prenda, modeloId: e.target.value })}>
          <option value="">Sin ficha técnica</option>
          {modelos.filter((m) => m.activo || m.id === Number(prenda.modeloId)).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </Select>
      </FormGroup>
      {modelos.length === 0 && <Hint>Todavía no hay fichas técnicas: cargalas en <Link to="/admin/dashboard/produccion">Producción</Link>.</Hint>}
      {modelo && (
        <>
          {modelo.piezas.length > 0 && <Row style={{ flexWrap: 'wrap' }}>{modelo.piezas.map((p) => fila(p.rol, 'tela'))}</Row>}
          {modelo.insumos.length > 0 && <Row style={{ flexWrap: 'wrap' }}>{modelo.insumos.map((p) => fila(p.rol, 'insumo'))}</Row>}
          {materiales.length === 0 && <Hint>Cargá las telas e insumos en <Link to="/admin/dashboard/produccion?tab=materiales">Producción → Materiales</Link>.</Hint>}
        </>
      )}
      <FormGroup><Label htmlFor="p-ficha">Indicaciones para la ficha de producto (opcional)</Label><TextArea id="p-ficha" rows={2} value={prenda.fichaNotas} onChange={(e) => setPrenda({ ...prenda, fichaNotas: e.target.value })} placeholder="Bordado en la espalda, tipografía, ubicación del escudo…" /></FormGroup>
    </fieldset>
  );
};

const PRENDA_VACIA = { nombre: '', descripcion: '', precio: '', talles: '4, 6, 8, 10, 12, 14, 16, S, M, L, XL, XXL', conBordado: false, orden: '0', activo: true, modeloId: '', materiales: {}, fichaNotas: '' };

const aFormPromo = (p) => ({
  codigo: p.codigo,
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
  const esAdmin = useEsAdmin();
  const { data: promo, cargando, error, recargar } = useRecurso(`/admin/egresados/promos/${id}`);
  const { data: modelos } = useRecurso('/admin/produccion/modelos', { porDefecto: [] });
  const { data: materiales } = useRecurso('/admin/produccion/materiales', { porDefecto: [] });
  const [editando, setEditando] = useState(null);
  const [errorPromo, setErrorPromo] = useState('');
  const [prenda, setPrenda] = useState(null);
  const [errorPrenda, setErrorPrenda] = useState('');
  const [nombres, setNombres] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [linkDiseno, setLinkDiseno] = useState('');

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

  const descargar = async (tipo) => {
    try {
      const { data, headers } = await api.get(`/admin/egresados/promos/${id}/exportar/${tipo}`, { responseType: 'blob' });
      const nombre = /filename="([^"]+)"/.exec(headers['content-disposition'] || '')?.[1] || `egresados-${tipo}.csv`;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(mensajeError(err, 'No se pudo descargar la planilla'), 'error');
    }
  };

  const copiarMensaje = async (texto, ok) => {
    try {
      await navigator.clipboard.writeText(texto);
      showToast(ok, 'success');
    } catch { /* sin portapapeles */ }
  };

  const adjuntarDiseno = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/egresados/promos/${id}/disenos`, { codigo: linkDiseno });
      setLinkDiseno('');
      showToast('Diseño adjuntado a la promo', 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const quitarDiseno = async (d) => {
    if (!window.confirm('¿Quitar este diseño de la promo? El diseño no se borra.')) return;
    try {
      await api.delete(`/admin/egresados/promos/${id}/disenos/${d.codigo}`);
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const regenerarClave = async () => {
    if (!window.confirm('¿Generar una clave nueva? La comisión va a tener que entrar con la nueva.')) return;
    try {
      await api.post(`/admin/egresados/promos/${id}/comision/clave`);
      showToast('Clave nueva generada', 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const regenerarComision = async () => {
    if (!window.confirm('¿Generar un link nuevo? El link actual de la comisión deja de funcionar.')) return;
    try {
      await api.post(`/admin/egresados/promos/${id}/comision/regenerar`);
      showToast('Link nuevo generado', 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const eliminarPromo = async () => {
    const escrito = window.prompt(`Vas a eliminar la promo ${promo.colegio} ${promo.curso} ${promo.anio} con sus alumnos y prendas. No se puede deshacer.\n\nPara confirmar, escribí el código de la promo (${promo.codigo}):`);
    if (escrito === null) return;
    const norm = (x) => String(x).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (norm(escrito) !== norm(promo.codigo)) {
      showToast('El código no coincide: la promo no se eliminó.', 'error', 6000);
      return;
    }
    try {
      await api.delete(`/admin/egresados/promos/${id}?confirmarCodigo=${encodeURIComponent(escrito.trim())}`);
      navigate('/admin/dashboard/egresados');
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const guardarPrenda = async (e) => {
    e.preventDefault();
    setErrorPrenda('');
    const { id: prendaId, ...f } = prenda;
    const modelo = modelos.find((m) => m.id === Number(f.modeloId));
    const roles = modelo ? [...modelo.piezas, ...modelo.insumos].map((x) => x.rol) : [];
    const payload = {
      nombre: f.nombre, descripcion: f.descripcion, conBordado: f.conBordado, activo: f.activo,
      precio: Number(f.precio),
      orden: Number(f.orden || 0),
      talles: f.talles.split(',').map((t) => t.trim()).filter(Boolean),
      modeloId: modelo ? modelo.id : null,
      materiales: Object.fromEntries(roles.map((r) => [r, f.materiales[r] ? Number(f.materiales[r]) : null])),
      fichaNotas: f.fichaNotas,
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
          {esAdmin && <Button $peligro onClick={eliminarPromo}><FaTrash /> Eliminar</Button>}
        </div>
      </Header>

      <Seccion>
        <h2>Acceso al portal</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <Hint>Código de la promo (familias y comisión)</Hint>
            <p style={{ margin: '4px 0', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.06em' }}>{promo.codigo}</p>
            <Button type="button" onClick={async () => { try { await navigator.clipboard.writeText(promo.codigo); showToast('Código copiado', 'success'); } catch { /* sin portapapeles */ } }} style={{ padding: '0.35rem 0.8rem' }}>Copiar</Button>
          </div>
          <div>
            <Hint>Clave de la comisión</Hint>
            <p style={{ margin: '4px 0', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.2em' }}>{promo.comisionClave}</p>
            {esAdmin && <Button type="button" onClick={regenerarClave} style={{ padding: '0.35rem 0.8rem' }}>Generar clave nueva</Button>}
          </div>
        </div>
        <Hint style={{ marginTop: 12 }}>
          Todos entran por <strong>{promo.linkPortal}</strong> (botón “Mi promo” del sitio de egresados) con el código. Las familias eligen “Mi pedido” y se identifican con el DNI del alumno; “Mi curso” muestra el avance del curso (la comisión usa la clave solo para editar la comisión y aprobar el diseño).
        </Hint>
        <ButtonGroup style={{ justifyContent: 'flex-start', marginTop: 12 }}>
          <Button type="button" onClick={() => copiarMensaje(`¡Hola familias! Para cargar los datos, talles y ver la cuponera de egresados entren a ${promo.linkPortal} con el código ${promo.codigo} y elijan “Mi pedido” (se entra con el DNI del alumno).`, 'Mensaje para las familias copiado')}>Copiar mensaje para las familias</Button>
          <Button type="button" onClick={() => copiarMensaje(`Comisión de ${promo.colegio} ${promo.curso}: entren a ${promo.linkPortal} con el código ${promo.codigo} y elijan “Mi curso” para ver el avance. Para cargar la comisión y aprobar el diseño, usen la clave ${promo.comisionClave} (no la compartan en el grupo).`, 'Mensaje para la comisión copiado')}>Copiar mensaje para la comisión</Button>
        </ButtonGroup>
        {!promo.activo && <Hint style={{ color: '#c0392b' }}>La promo está desactivada: no se puede entrar.</Hint>}
      </Seccion>

      <Seccion>
        <h2>Tablero de la comisión · {promo.tablero.porcentaje}%</h2>
        <p style={{ marginTop: 0 }}>{promo.tablero.mensaje}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {promo.tablero.etapas.map((e) => (
            <Tag key={e.clave} $color={{ completa: '#27ae60', actual: '#d35400', pendiente: '#95a5a6', bloqueada: '#bdc3c7' }[e.estado]}>
              {e.estado === 'completa' ? '✓ ' : e.estado === 'bloqueada' ? '🔒 ' : ''}{e.titulo}
            </Tag>
          ))}
        </div>
        <Hint>La comisión ve el avance y los pendientes por alumno, sin DNI, contactos ni montos.</Hint>
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', color: '#7f8c8d' }}>Links directos (opcional)</summary>
          <p style={{ margin: '8px 0 4px' }}>Familias:</p>
          <LinkCopiable url={promo.link} onCopiado={() => showToast('Link copiado', 'success')} />
          <p style={{ margin: '8px 0 4px' }}>Comisión (sin clave; si se filtra, generá uno nuevo):</p>
          <LinkCopiable url={promo.linkComision} onCopiado={() => showToast('Link de la comisión copiado', 'success')} />
        </details>
        <p style={{ margin: '12px 0 0' }}>
          Comisión: {promo.comisionIntegrantes.length ? promo.comisionIntegrantes.map((i) => `${i.nombre}${i.telefono ? ` (${i.telefono})` : ''}`).join(' · ') : <em>todavía no cargaron sus nombres</em>}
          <br />Diseño final: {promo.disenoAprobadoEl ? <strong>aprobado por {promo.disenoAprobadoPor} el {new Date(promo.disenoAprobadoEl).toLocaleDateString('es-AR')}</strong> : 'sin aprobar'}
        </p>
        <ButtonGroup style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap' }}>
          {promo.disenoAprobadoEl
            ? <Button onClick={() => window.confirm('¿Quitar la aprobación del diseño?') && cambiarCampo({ disenoAprobado: false }, 'Aprobación quitada')}>Quitar aprobación del diseño</Button>
            : <Button onClick={() => window.confirm('¿Marcar el diseño como aprobado (sin esperar a la comisión)?') && cambiarCampo({ disenoAprobado: true }, 'Diseño marcado como aprobado')}>Marcar diseño aprobado</Button>}
          {esAdmin && <Button onClick={regenerarComision}>Generar link directo nuevo</Button>}
        </ButtonGroup>
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
        <h2>Diseños de la promo</h2>
        {promo.disenos.length === 0 ? <Hint>Todavía no hay diseños adjuntos. Llegan solos cuando la comisión pide presupuesto desde el diseñador con el código de la promo.</Hint> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {promo.disenos.map((d) => (
              <figure key={d.codigo} style={{ margin: 0 }}>
                <a href={d.link} target="_blank" rel="noopener noreferrer"><img src={d.imagen} alt={d.titulo || 'Diseño'} loading="lazy" style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd' }} /></a>
                <figcaption style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                  {d.titulo} · {new Date(d.creadoEl).toLocaleDateString('es-AR')} · <button type="button" onClick={() => quitarDiseno(d)} style={{ background: 'none', border: 0, color: '#c0392b', cursor: 'pointer', padding: 0 }}>quitar</button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <form onSubmit={adjuntarDiseno} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Input aria-label="Link del diseño" value={linkDiseno} onChange={(e) => setLinkDiseno(e.target.value)} placeholder="Pegá el link de un diseño (…/d/xxxxxxxx) para adjuntarlo" style={{ flex: 1, minWidth: 240 }} />
          <Button type="submit" disabled={linkDiseno.trim().length < 8}>Adjuntar</Button>
        </form>
      </Seccion>

      <Seccion>
        <h2>Producción</h2>
        <Hint style={{ marginBottom: 10 }}>Calculadora de tela e insumos, costo por prenda, fichas de producto y de corte para imprimir y lista de compras. Cada prenda necesita su ficha técnica y sus materiales (se eligen al editarla).</Hint>
        <Button as={Link} to={`/admin/dashboard/egresados/${promo.id}/produccion`} $primario style={{ textDecoration: 'none' }}><FaCut /> Abrir producción</Button>
      </Seccion>

      <Seccion>
        <h2>Contrato</h2>
        <Hint style={{ marginBottom: 10 }}>
          {promo.contratoSubidoEl
            ? `Firmado y cargado el ${new Date(promo.contratoSubidoEl).toLocaleDateString('es-AR')}: lo ven las familias en Mi promo y la comisión en Mi curso.`
            : 'Se arma con las prendas, precios, planes y fechas de la promo. Imprimilo, que lo firme la comisión y subí el escaneo.'}
        </Hint>
        <Button as={Link} to={`/admin/dashboard/egresados/${promo.id}/contrato`} $primario={!promo.contratoSubidoEl} style={{ textDecoration: 'none' }}>
          <FaFileSignature /> {promo.contratoSubidoEl ? 'Ver contrato' : 'Generar y subir contrato'}
        </Button>
      </Seccion>

      <Seccion>
        <h2>Planillas (Excel)</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button type="button" onClick={() => descargar('talles')} title="Cantidad por prenda y talle, para cortar">Talles por prenda</Button>
          <Button type="button" onClick={() => descargar('prendas')} title="Una fila por prenda con alumno, talle y bordado">Prendas y bordados por alumno</Button>
          <Button type="button" onClick={() => descargar('cobranza')} title="Plan, pagado, saldo, cuotas vencidas y contacto de cada familia">Cobranza</Button>
        </div>
        <Hint style={{ marginTop: 8 }}>Al pasar la promo a “En producción”, “Listo para entregar” o “Entregado”, las familias con email reciben un aviso.</Hint>
      </Seccion>

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
            <ProduccionPrenda prenda={prenda} setPrenda={setPrenda} modelos={modelos} materiales={materiales} />
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
                          <IconButton onClick={() => setPrenda({ ...p, precio: String(p.precio), orden: String(p.orden), talles: p.talles.join(', '), descripcion: p.descripcion || '', modeloId: p.modeloId || '', materiales: p.materiales || {}, fichaNotas: p.fichaNotas || '' })} aria-label={`Editar ${p.nombre}`}><FaEdit /></IconButton>
                          {esAdmin && <IconButton $peligro onClick={() => eliminarPrenda(p)} aria-label={`Eliminar ${p.nombre}`}><FaTrash /></IconButton>}
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
