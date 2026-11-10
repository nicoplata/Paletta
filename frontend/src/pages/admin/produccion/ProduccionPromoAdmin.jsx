import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaShoppingCart } from 'react-icons/fa';
import useRecurso from '../../../hooks/useRecurso';
import { Button, CheckLabel, Container, Empty, ErrorBox, Header, Hint, Tag, Title } from '../adminUI';
import { Cifras, Seccion, Tabla, TablaScroll, fecha, pesos } from '../egresados/comun';
import { ETAPAS, cant, imprimir, nombreMaterial } from './comunProduccion';
import OrdenesPrenda from './OrdenesPrenda';
import './fichas.css';

const FICHAS = { resumen: 'Calculadora', producto: 'Fichas de producto', corte: 'Fichas de corte', talleres: 'Órdenes de taller' };

const Cabecera = ({ tipo, promo, prenda, extra }) => (
  <div className="ficha-cabecera">
    <div>
      <div className="ficha-tipo">{tipo}</div>
      <h2>{prenda.nombre}</h2>
      <small>{promo.colegio} · {promo.curso} · {promo.anio}{promo.codigo ? ` · ${promo.codigo}` : ''}</small>
    </div>
    <div style={{ textAlign: 'right' }}>
      <strong>{prenda.unidades} prendas</strong><br />
      <small>{extra || (promo.fechaEntrega ? `Entrega: ${fecha(promo.fechaEntrega)}` : `Impresa el ${new Date().toLocaleDateString('es-AR')}`)}</small>
    </div>
  </div>
);

const Curva = ({ curva }) => (
  <table>
    <thead><tr>{curva.map((c) => <th key={c.talle} className="num">{c.talle}</th>)}<th className="num">Total</th></tr></thead>
    <tbody><tr>{curva.map((c) => <td key={c.talle} className="num">{c.cantidad}</td>)}<td className="num"><strong>{curva.reduce((a, c) => a + c.cantidad, 0)}</strong></td></tr></tbody>
  </table>
);

const Avisos = ({ avisos }) => (avisos.length ? (
  <div className="ficha-aviso"><strong>Falta completar:</strong> {avisos.join(' ')}</div>
) : null);

// Ficha de producto: qué se fabrica (diseño, materiales por pieza, bordados, indicaciones)
const FichaProducto = ({ datos, p }) => (
  <section className="ficha">
    <Cabecera tipo="Ficha de producto" promo={datos.promo} prenda={p} />
    <Avisos avisos={p.avisos} />
    <div className="ficha-grid">
      <div>
        <h3>Modelo</h3>
        <p style={{ margin: 0 }}><strong>{p.modelo?.nombre || 'Sin ficha técnica'}</strong>{p.descripcion ? ` · ${p.descripcion}` : ''}</p>
        <h3>Materiales</h3>
        <table>
          <thead><tr><th>Pieza / insumo</th><th>Material</th></tr></thead>
          <tbody>{p.lineas.map((l) => <tr key={l.rol}><td>{l.rol}</td><td>{nombreMaterial(l.material)}</td></tr>)}</tbody>
        </table>
        <h3>Curva de talles</h3>
        <Curva curva={p.curva} />
        {p.fichaNotas && <><h3>Indicaciones</h3><p className="ficha-pasos" style={{ margin: 0 }}>{p.fichaNotas}</p></>}
      </div>
      <div>
        <h3>Diseño</h3>
        {datos.disenos.length ? datos.disenos.map((d) => (
          <figure key={d.codigo} style={{ margin: '0 0 10px' }}>
            <img className="ficha-diseno" src={d.imagen} alt={`Diseño ${d.titulo || d.codigo}`} />
            <figcaption><small>{d.titulo || 'Diseño'} · {d.codigo}</small></figcaption>
          </figure>
        )) : <p>Sin diseño adjunto a la promo.</p>}
      </div>
    </div>
    {p.conBordado && (
      <>
        <h3>Bordados ({p.bordados.filter((b) => b.bordado).length} de {p.bordados.length})</h3>
        <table>
          <thead><tr><th>Alumno</th><th>Talle</th><th>Bordado</th><th className="num">Cant.</th><th style={{ width: 28 }} /></tr></thead>
          <tbody>{p.bordados.map((b, i) => <tr key={i}><td>{b.alumno}</td><td>{b.talle}</td><td><strong>{b.bordado || '—'}</strong></td><td className="num">{b.cantidad}</td><td><span className="ficha-check" /></td></tr>)}</tbody>
        </table>
      </>
    )}
  </section>
);

// Ficha de corte: cuánta tela por talle y cuántas prendas cortar de cada talle
const FichaCorte = ({ datos, p }) => {
  const telas = p.lineas.filter((l) => l.tipo === 'tela');
  return (
    <section className="ficha">
      <Cabecera tipo="Ficha de corte" promo={datos.promo} prenda={p} extra={p.modelo ? `Desperdicio previsto: ${cant(p.modelo.desperdicio)}%` : null} />
      <Avisos avisos={p.avisos} />
      <h3>Prendas a cortar por talle</h3>
      <Curva curva={p.curva} />
      <h3>Tela por pieza</h3>
      <table>
        <thead>
          <tr><th>Pieza</th><th>Tela</th>{p.curva.map((c) => <th key={c.talle} className="num">{c.talle}</th>)}<th className="num">Total con desperdicio</th></tr>
        </thead>
        <tbody>
          {telas.map((l) => (
            <tr key={l.rol}>
              <td>{l.rol}</td>
              <td>{nombreMaterial(l.material)}{l.material?.ancho ? <><br /><small>Ancho {cant(l.material.ancho)} m</small></> : null}</td>
              {p.curva.map((c) => <td key={c.talle} className="num">{l.porTalle[c.talle] ? `${cant(l.porTalle[c.talle] * c.cantidad)}` : '—'}<br /><small>{l.porTalle[c.talle] ? `${cant(l.porTalle[c.talle])} c/u` : ''}</small></td>)}
              <td className="num"><strong>{cant(l.necesario)} {l.material?.unidad || ''}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Control de corte</h3>
      <table>
        <thead><tr><th>Talle</th><th className="num">A cortar</th><th className="num">Cortadas</th><th>Observaciones</th></tr></thead>
        <tbody>{p.curva.filter((c) => c.cantidad).map((c) => <tr key={c.talle}><td>{c.talle}</td><td className="num">{c.cantidad}</td><td /><td /></tr>)}</tbody>
      </table>
      <div className="ficha-firmas"><div>Cortó / fecha</div><div>Controló / fecha</div></div>
    </section>
  );
};

const ProduccionPromoAdmin = () => {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const vista = FICHAS[params.get('ficha')] ? params.get('ficha') : 'resumen';
  const confirmados = params.get('confirmados') === 'true';
  const { data, cargando, error, recargar } = useRecurso(`/admin/produccion/promos/${id}?confirmados=${confirmados}`);
  const { data: talleres } = useRecurso('/admin/produccion/talleres', { porDefecto: [] });
  const cambiar = (cambios) => {
    const p = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };

  if (error) return <Container><ErrorBox>{error}</ErrorBox></Container>;
  if (cargando || !data) return <Container><Empty>Cargando...</Empty></Container>;
  const { promo, prendas, totales } = data;
  const conUnidades = prendas.filter((p) => p.unidades > 0);

  return (
    <Container>
      <Header className="no-print">
        <div>
          <Link to={`/admin/dashboard/egresados/${promo.id}`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}><FaArrowLeft /> {promo.colegio} {promo.curso} {promo.anio}</Link>
          <Title>Producción de la promo</Title>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(FICHAS).map(([k, t]) => (
            <Button key={k} type="button" $primario={vista === k} onClick={() => cambiar({ ficha: k === 'resumen' ? '' : k })} style={{ padding: '0.5rem 0.9rem' }}>{t}</Button>
          ))}
        </div>
      </Header>

      <div className="no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <CheckLabel><input type="checkbox" checked={confirmados} onChange={(e) => cambiar({ confirmados: e.target.checked ? 'true' : '' })} /> Contar solo alumnos con la cuota 1 paga</CheckLabel>
        {(vista === 'producto' || vista === 'corte') && <Button $primario onClick={imprimir}><FaPrint /> Imprimir</Button>}
        <Button as={Link} to={`/admin/dashboard/produccion?tab=compras&promos=${promo.id}${confirmados ? '&confirmados=true' : ''}`} style={{ textDecoration: 'none' }}><FaShoppingCart /> Lista de compras</Button>
      </div>

      {vista === 'resumen' && (
        <>
          <Cifras>
            <div><span>Prendas a producir</span><b>{totales.unidades}</b></div>
            <div><span>Alumnos contados</span><b>{data.alumnos}</b></div>
            <div><span>Costo estimado{totales.unidadesConFicha < totales.unidades ? ` (${totales.unidadesConFicha} con ficha)` : ''}</span><b>{pesos(totales.costo)}</b></div>
            <div><span>Costo promedio por prenda</span><b>{totales.unidadesConFicha ? pesos(totales.costo / totales.unidadesConFicha) : '-'}</b></div>
          </Cifras>
          {prendas.length === 0 && <Empty>La promo no tiene prendas activas.</Empty>}
          {prendas.map((p) => (
            <Seccion key={p.prendaId}>
              <h2 style={{ marginBottom: 4 }}>{p.nombre} <small style={{ fontWeight: 400, color: '#7f8c8d' }}>· {p.modelo?.nombre || 'sin ficha técnica'}</small> <Tag $color="#2c3e50">{ETAPAS.find((e) => e.clave === p.etapa)?.nombre}</Tag></h2>
              <Avisos avisos={p.avisos} />
              {p.avisos.length > 0 && <Hint>Se completa en la ficha técnica (<Link to="/admin/dashboard/produccion">Producción</Link>) o editando la prenda en la promo.</Hint>}
              <TablaScroll>
                <Tabla>
                  <thead><tr>{p.curva.map((c) => <th key={c.talle} className="num">{c.talle}</th>)}<th className="num">Total</th></tr></thead>
                  <tbody><tr>{p.curva.map((c) => <td key={c.talle} className="num">{c.cantidad}</td>)}<td className="num"><strong>{p.unidades}</strong></td></tr></tbody>
                </Tabla>
              </TablaScroll>
              {p.lineas.length > 0 && (
                <TablaScroll style={{ marginTop: 12 }}>
                  <Tabla>
                    <thead><tr><th>Pieza / insumo</th><th>Material</th><th className="num">Necesario</th><th className="num">Costo</th></tr></thead>
                    <tbody>
                      {p.lineas.map((l) => (
                        <tr key={l.rol}>
                          <td>{l.rol}</td>
                          <td>{nombreMaterial(l.material)}</td>
                          <td className="num">{cant(l.necesario)} {l.material?.unidad || ''}</td>
                          <td className="num">{pesos(l.costo)}</td>
                        </tr>
                      ))}
                      <tr><td colSpan={3}>Confección ({p.unidades} × taller)</td><td className="num">{pesos(p.costoConfeccion)}</td></tr>
                      <tr><td colSpan={3}><strong>Total · {pesos(p.costoUnitario)} por prenda</strong></td><td className="num"><strong>{pesos(p.costoTotal)}</strong></td></tr>
                    </tbody>
                  </Tabla>
                </TablaScroll>
              )}
            </Seccion>
          ))}
        </>
      )}

      {vista === 'talleres' && (prendas.length === 0
        ? <Empty>La promo no tiene prendas activas.</Empty>
        : prendas.map((p) => <OrdenesPrenda key={p.prendaId} prenda={p} talleres={talleres} onCambio={recargar} />))}

      {(vista === 'producto' || vista === 'corte') && (conUnidades.length === 0
        ? <Empty>Todavía ningún alumno eligió prendas{confirmados ? ' con la cuota 1 paga' : ''}: no hay nada para producir.</Empty>
        : conUnidades.map((p) => (vista === 'producto'
          ? <FichaProducto key={p.prendaId} datos={data} p={p} />
          : <FichaCorte key={p.prendaId} datos={data} p={p} />)))}
    </Container>
  );
};

export default ProduccionPromoAdmin;
