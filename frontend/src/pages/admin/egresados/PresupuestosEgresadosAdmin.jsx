import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaWhatsapp } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { Button, Container, Empty, ErrorBox, Header, Hint, Select, Tag, TextArea, Title } from '../adminUI';
import { FormPromo, VACIO_PROMO, aPayloadPromo } from './EgresadosAdmin';
import { Seccion } from './comun';

const ESTADOS = { nuevo: 'Nuevos', contactado: 'Contactados', convertido: 'Con promo', descartado: 'Descartados', todos: 'Todos' };
const COLOR = { nuevo: '#d35400', contactado: '#2980b9', convertido: '#27ae60', descartado: '#7f8c8d' };

const linkWhatsApp = (tel, texto) => {
  let n = String(tel).replace(/\D/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (!n.startsWith('54')) n = `549${n}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

const Pedido = ({ p, onCambio }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notas, setNotas] = useState(p.notas || '');
  const [promo, setPromo] = useState(null);
  const [error, setError] = useState('');

  const actualizar = async (cambios, ok) => {
    try {
      await api.patch(`/admin/egresados/presupuestos/${p.id}`, cambios);
      if (ok) showToast(ok, 'success');
      onCambio();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const crearPromo = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/admin/egresados/promos', { ...aPayloadPromo(promo), presupuestoId: p.id });
      navigate(`/admin/dashboard/egresados/${data.id}`);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo crear la promo'));
    }
  };

  const saludo = `¡Hola ${p.nombre.split(' ')[0]}! Te escribimos de Paletta Egresados por el presupuesto que pediste desde el diseñador${p.diseno ? ` (${p.diseno.link})` : ''}.`;

  return (
    <Seccion>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: 20 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>{p.colegio}{p.curso ? ` · ${p.curso}` : ''}{p.anio ? ` · ${p.anio}` : ''}</h2>
          <Tag $color={COLOR[p.estado]}>{ESTADOS[p.estado] || p.estado}</Tag>
          <small style={{ color: '#7f8c8d' }}> {new Date(p.createdAt).toLocaleString('es-AR')}</small>
          <p style={{ margin: '10px 0' }}>
            <strong>{p.nombre}</strong> · {p.telefono}{p.email ? ` · ${p.email}` : ''}<br />
            {p.cantidad ? <>Cantidad aprox.: <strong>{p.cantidad}</strong><br /></> : null}
            {p.promo ? <>Promo: <Link to={`/admin/dashboard/egresados/${p.promo.id}`}>{p.promo.codigo} · {p.promo.colegio} {p.promo.curso}</Link><br /></> : null}
            {p.mensaje ? <em>“{p.mensaje}”</em> : null}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Button as="a" href={linkWhatsApp(p.telefono, saludo)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }} $primario onClick={() => p.estado === 'nuevo' && actualizar({ estado: 'contactado' })}>
              <FaWhatsapp /> Escribirle
            </Button>
            {!p.promo && !promo && (
              <Button type="button" onClick={() => setPromo({ ...VACIO_PROMO, colegio: p.colegio, curso: p.curso || '', anio: String(p.anio || VACIO_PROMO.anio) })}>Crear promo con este pedido</Button>
            )}
            <Select aria-label="Estado" value={p.estado} onChange={(e) => actualizar({ estado: e.target.value }, 'Estado actualizado')} style={{ width: 'auto' }}>
              {['nuevo', 'contactado', 'convertido', 'descartado'].map((k) => <option key={k} value={k}>{ESTADOS[k]}</option>)}
            </Select>
          </div>
          <TextArea aria-label="Notas internas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas internas (no las ve el cliente)" style={{ minHeight: 60 }} />
          {notas !== (p.notas || '') && <Button type="button" onClick={() => actualizar({ notas }, 'Notas guardadas')} style={{ marginTop: 6, padding: '0.4rem 0.9rem' }}>Guardar notas</Button>}
        </div>
        <div>
          {p.diseno ? (
            <>
              <a href={p.diseno.link} target="_blank" rel="noopener noreferrer"><img src={p.diseno.imagen} alt={`Diseño: ${p.diseno.titulo || ''}`} style={{ width: '100%', borderRadius: 10, border: '1px solid #ddd' }} loading="lazy" /></a>
              <Hint>{p.diseno.titulo} · <a href={p.diseno.link} target="_blank" rel="noopener noreferrer">abrir en el diseñador</a></Hint>
            </>
          ) : <Hint>Sin diseño adjunto.</Hint>}
        </div>
      </div>
      {promo && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
          <h2>Nueva promo</h2>
          <Hint style={{ marginBottom: 12 }}>El diseño del pedido queda adjunto a la promo y el pedido pasa a “Con promo”.</Hint>
          <FormPromo valor={promo} onChange={setPromo} onSubmit={crearPromo} onCancel={() => setPromo(null)} error={error} textoBoton="Crear promo" />
        </div>
      )}
    </Seccion>
  );
};

const PresupuestosEgresadosAdmin = () => {
  const [estado, setEstado] = useState('nuevo');
  const { data: lista, cargando, error, recargar } = useRecurso(`/admin/egresados/presupuestos?estado=${estado}`, { porDefecto: [] });

  return (
    <Container>
      <Header>
        <div>
          <Link to="/admin/dashboard/egresados" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}><FaArrowLeft /> Egresados</Link>
          <Title>Pedidos de presupuesto</Title>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(ESTADOS).map(([k, t]) => (
            <Button key={k} type="button" $primario={estado === k} onClick={() => setEstado(k)} style={{ padding: '0.5rem 0.9rem' }}>{t}</Button>
          ))}
        </div>
      </Header>
      <Hint style={{ marginBottom: 16 }}>Llegan desde el diseñador de egresados.paletta.com.ar con el diseño adjunto. Si el pedido trae el código de una promo, el diseño ya quedó en esa promo.</Hint>
      {error && <ErrorBox>{error}</ErrorBox>}
      {cargando ? <Empty>Cargando...</Empty> : lista.length === 0 ? <Empty>No hay pedidos en esta lista.</Empty> : (
        lista.map((p) => <Pedido key={p.id} p={p} onCambio={recargar} />)
      )}
    </Container>
  );
};

export default PresupuestosEgresadosAdmin;
