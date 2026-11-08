import { useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaWhatsapp } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { Button, Container, Empty, ErrorBox, Header, Hint, Tag, TextArea, Title } from '../adminUI';
import { FormPromo, VACIO_PROMO, aPayloadPromo } from './EgresadosAdmin';

// La clave interna "convertido" se mantiene en la base; en pantalla es "Contrato firmado".
const ESTADOS = { nuevo: 'Nuevos', contactado: 'Contactados', convertido: 'Contrato firmado', descartado: 'Descartados', todos: 'Todos' };
const ETAPAS = [
  { k: 'nuevo', t: 'Nuevo' },
  { k: 'contactado', t: 'Contactado' },
  { k: 'convertido', t: 'Contrato firmado' },
];
const NOMBRE = { nuevo: 'Nuevo', contactado: 'Contactado', convertido: 'Contrato firmado', descartado: 'Descartado' };
const COLOR = { nuevo: '#d35400', contactado: '#2980b9', convertido: '#27ae60', descartado: '#7f8c8d' };

const linkWhatsApp = (tel, texto) => {
  let n = String(tel).replace(/\D/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (!n.startsWith('54')) n = `549${n}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

const Tarjeta = styled.article`
  background: white;
  border: 1px solid #e3e3e3;
  border-left: 6px solid ${({ $color }) => $color};
  border-radius: 12px;
  padding: 20px 22px;
  margin-bottom: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`;
const Cuerpo = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 24px;
  @media (max-width: 860px) { grid-template-columns: 1fr; }
`;
const Rotulo = styled.h3`
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7f8c8d;
`;
const Bloque = styled.div`
  margin-top: 16px;
`;
const Etapas = styled.ol`
  display: flex;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
`;
const Etapa = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  border-radius: 999px;
  border: 2px solid ${({ $estado }) => ($estado === 'actual' ? '#2c3e50' : $estado === 'hecha' ? '#27ae60' : '#ddd')};
  background: ${({ $estado }) => ($estado === 'actual' ? '#2c3e50' : 'white')};
  color: ${({ $estado }) => ($estado === 'actual' ? 'white' : $estado === 'hecha' ? '#1e8449' : '#7f8c8d')};
  font-weight: 700;
  font-size: 0.85rem;
  cursor: ${({ $estado }) => ($estado === 'actual' ? 'default' : 'pointer')};
  &:hover:not(:disabled) { border-color: #2c3e50; }
  &:disabled { opacity: 1; }
`;
const Numero = styled.span`
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.8rem;
  background: ${({ $estado }) => ($estado === 'actual' ? 'white' : $estado === 'hecha' ? '#27ae60' : '#eee')};
  color: ${({ $estado }) => ($estado === 'actual' ? '#2c3e50' : $estado === 'hecha' ? 'white' : '#7f8c8d')};
`;
const Siguiente = styled.div`
  margin-top: 12px;
  padding: 14px;
  border-radius: 10px;
  background: #f7f9fa;
  display: grid;
  gap: 10px;
`;
const Fila = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;
const Enlace = styled.button`
  background: none;
  border: 0;
  padding: 4px 0;
  color: #7f8c8d;
  font-size: 0.9rem;
  text-decoration: underline;
  cursor: pointer;
  &:hover { color: #2c3e50; }
`;
const Dato = styled.p`
  margin: 2px 0;
  overflow-wrap: anywhere;
`;

const hace = (iso) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
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
  const mover = (estado) => actualizar({ estado }, `Pedido movido a “${NOMBRE[estado]}”`);

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
  const abrirPromo = () => setPromo({ ...VACIO_PROMO, colegio: p.colegio, curso: p.curso || '', anio: String(p.anio || VACIO_PROMO.anio) });

  const saludo = `¡Hola ${p.nombre.split(' ')[0]}! Te escribimos de Paletta Egresados por el presupuesto que pediste desde el diseñador${p.diseno ? ` (${p.diseno.link})` : ''}.`;
  const descartado = p.estado === 'descartado';
  const iActual = ETAPAS.findIndex((e) => e.k === p.estado);
  const botonWa = (primario) => (
    <Button as="a" href={linkWhatsApp(p.telefono, saludo)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} $primario={primario}
      onClick={() => p.estado === 'nuevo' && actualizar({ estado: 'contactado' }, 'Marcado como contactado')}>
      <FaWhatsapp /> Escribirle por WhatsApp
    </Button>
  );

  return (
    <Tarjeta $color={COLOR[p.estado]}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>{p.colegio}</h2>
          <Dato style={{ color: '#555' }}>
            {[p.curso, p.anio ? `Promo ${p.anio}` : null, p.cantidad ? `${p.cantidad} egresados aprox.` : null].filter(Boolean).join(' · ') || 'Sin curso ni cantidad'}
          </Dato>
        </div>
        <small style={{ color: '#7f8c8d' }} title={new Date(p.createdAt).toLocaleString('es-AR')}>Recibido {hace(p.createdAt)}</small>
      </header>

      <Cuerpo>
        <div>
          <Bloque>
            <Rotulo>Etapa del pedido</Rotulo>
            {descartado ? (
              <Fila>
                <Tag $color={COLOR.descartado}>Descartado</Tag>
                <Enlace type="button" onClick={() => mover('nuevo')}>Reabrir pedido</Enlace>
              </Fila>
            ) : (
              <Etapas aria-label="Etapas del pedido">
                {ETAPAS.map((e, i) => {
                  const estado = i < iActual ? 'hecha' : i === iActual ? 'actual' : 'pendiente';
                  return (
                    <li key={e.k}>
                      <Etapa type="button" $estado={estado} disabled={estado === 'actual'} aria-current={estado === 'actual' ? 'step' : undefined}
                        title={estado === 'actual' ? 'Etapa actual' : `Mover a “${e.t}”`} onClick={() => mover(e.k)}>
                        <Numero $estado={estado}>{estado === 'hecha' ? '✓' : i + 1}</Numero>{e.t}
                      </Etapa>
                    </li>
                  );
                })}
              </Etapas>
            )}

            {!descartado && (
              <Siguiente>
                {p.estado === 'nuevo' && (
                  <>
                    <strong>Siguiente paso: contactarlo</strong>
                    <Fila>{botonWa(true)}<Button type="button" onClick={() => mover('contactado')}>Ya lo contacté</Button></Fila>
                  </>
                )}
                {p.estado === 'contactado' && (
                  <>
                    <strong>Siguiente paso: {p.promo ? 'cuando firmen, marcar el contrato' : 'cuando firmen, crear la promo'}</strong>
                    <Fila>
                      {p.promo
                        ? <Button type="button" $primario onClick={() => mover('convertido')}>Firmaron: marcar contrato firmado</Button>
                        : !promo && <Button type="button" $primario onClick={abrirPromo}>Firmaron: crear la promo</Button>}
                      {botonWa(false)}
                    </Fila>
                    {!p.promo && <Enlace type="button" style={{ justifySelf: 'start' }} onClick={() => mover('convertido')}>Marcar contrato firmado sin crear promo</Enlace>}
                  </>
                )}
                {p.estado === 'convertido' && (
                  <>
                    <strong>Contrato firmado{p.promo ? '' : ' (sin promo creada)'}</strong>
                    <Fila>
                      {p.promo
                        ? <Button as={Link} to={`/admin/dashboard/egresados/${p.promo.id}`} $primario style={{ textDecoration: 'none' }}>Ir a la promo {p.promo.codigo}</Button>
                        : !promo && <Button type="button" $primario onClick={abrirPromo}>Crear la promo</Button>}
                      {botonWa(false)}
                    </Fila>
                  </>
                )}
              </Siguiente>
            )}
            {!descartado && p.estado !== 'convertido' && (
              <Enlace type="button" onClick={() => mover('descartado')}>Descartar pedido</Enlace>
            )}
          </Bloque>

          <Bloque>
            <Rotulo>Contacto</Rotulo>
            <Dato><strong>{p.nombre}</strong></Dato>
            <Dato>WhatsApp: <a href={linkWhatsApp(p.telefono, saludo)} target="_blank" rel="noopener noreferrer">{p.telefono}</a></Dato>
            {p.email && <Dato>Email: <a href={`mailto:${p.email}`}>{p.email}</a></Dato>}
          </Bloque>

          {(p.mensaje || p.promo) && (
            <Bloque>
              <Rotulo>Detalle</Rotulo>
              {p.promo && <Dato>Promo: <Link to={`/admin/dashboard/egresados/${p.promo.id}`}>{p.promo.codigo} · {p.promo.colegio} {p.promo.curso}</Link></Dato>}
              {p.mensaje && <Dato style={{ fontStyle: 'italic' }}>“{p.mensaje}”</Dato>}
            </Bloque>
          )}

          <Bloque>
            <Rotulo>Notas internas</Rotulo>
            <TextArea aria-label="Notas internas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="No las ve el cliente" style={{ minHeight: 60 }} />
            {notas !== (p.notas || '') && <Button type="button" onClick={() => actualizar({ notas }, 'Notas guardadas')} style={{ marginTop: 6, padding: '0.4rem 0.9rem' }}>Guardar notas</Button>}
          </Bloque>
        </div>

        <Bloque>
          <Rotulo>Diseño</Rotulo>
          {p.diseno ? (
            <>
              <a href={p.diseno.link} target="_blank" rel="noopener noreferrer"><img src={p.diseno.imagen} alt={`Diseño: ${p.diseno.titulo || ''}`} style={{ width: '100%', borderRadius: 10, border: '1px solid #ddd' }} loading="lazy" /></a>
              <Hint>{p.diseno.titulo} · <a href={p.diseno.link} target="_blank" rel="noopener noreferrer">abrir en el diseñador</a></Hint>
            </>
          ) : <Hint>Sin diseño adjunto.</Hint>}
        </Bloque>
      </Cuerpo>

      {promo && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
          <h2>Nueva promo</h2>
          <Hint style={{ marginBottom: 12 }}>El diseño del pedido queda adjunto a la promo y el pedido pasa a “Contrato firmado”.</Hint>
          <FormPromo valor={promo} onChange={setPromo} onSubmit={crearPromo} onCancel={() => setPromo(null)} error={error} textoBoton="Crear promo" />
        </div>
      )}
    </Tarjeta>
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
