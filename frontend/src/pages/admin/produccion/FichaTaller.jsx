import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaWhatsapp } from 'react-icons/fa';
import useRecurso from '../../../hooks/useRecurso';
import { Button, Container, Empty, ErrorBox, Header, Title } from '../adminUI';
import { fecha, pesos } from '../egresados/comun';
import { ESTADO_ORDEN, cant, imprimir, linkWhatsApp, nombreMaterial } from './comunProduccion';
import './fichas.css';

// Ficha de taller: lo que se entrega al taller con la orden y la planilla para controlar la recepción
const FichaTaller = () => {
  const { id } = useParams();
  const { data, cargando, error } = useRecurso(`/admin/produccion/ordenes/${id}/ficha`);
  if (error) return <Container><ErrorBox>{error}</ErrorBox></Container>;
  if (cargando || !data) return <Container><Empty>Cargando...</Empty></Container>;
  const { orden, taller, promo, prenda, disenos } = data;
  const insumos = prenda?.lineas.filter((l) => l.tipo === 'insumo') || [];
  const telas = prenda?.lineas.filter((l) => l.tipo === 'tela') || [];
  const mensaje = `¡Hola ${taller.contacto || taller.nombre}! Te paso la orden ${orden.numero} de Paletta: ${orden.enviadas} ${prenda?.nombre || 'prendas'} (${Object.entries(orden.cantidades).map(([t, n]) => `${t}: ${n}`).join(', ')})${orden.compromisoEl ? `. Las necesitamos para el ${fecha(orden.compromisoEl)}` : ''}.`;

  return (
    <Container>
      <Header className="no-print">
        <div>
          <Link to={`/admin/dashboard/egresados/${promo.id}/produccion?ficha=talleres`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}><FaArrowLeft /> Órdenes de {promo.colegio} {promo.curso}</Link>
          <Title>Ficha de taller {orden.numero}</Title>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {taller.telefono && <Button as="a" href={linkWhatsApp(taller.telefono, mensaje)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><FaWhatsapp /> Avisar al taller</Button>}
          <Button $primario onClick={imprimir}><FaPrint /> Imprimir</Button>
        </div>
      </Header>

      <section className="ficha">
        <div className="ficha-cabecera">
          <div>
            <div className="ficha-tipo">Ficha de taller · {orden.numero}</div>
            <h2>{prenda?.nombre}{prenda?.modelo ? ` · ${prenda.modelo.nombre}` : ''}</h2>
            <small>{promo.colegio} · {promo.curso} · {promo.anio}{promo.codigo ? ` · ${promo.codigo}` : ''}</small>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>{taller.nombre}</strong><br />
            <small>{[taller.contacto, taller.telefono].filter(Boolean).join(' · ')}</small><br />
            <small>Estado: {ESTADO_ORDEN[orden.estado].nombre}</small>
          </div>
        </div>

        <div className="ficha-grid">
          <div>
            <h3>Fechas</h3>
            <table>
              <tbody>
                <tr><th>Enviada</th><td>{orden.enviadaEl ? fecha(orden.enviadaEl) : '____/____/______'}</td></tr>
                <tr><th>Tiene que volver</th><td><strong>{orden.compromisoEl ? fecha(orden.compromisoEl) : '____/____/______'}</strong></td></tr>
              </tbody>
            </table>
            <h3>Precio</h3>
            <table>
              <tbody>
                <tr><th>Por prenda</th><td className="num">{pesos(orden.precioUnitario)}</td></tr>
                <tr className="total"><td>Total ({orden.enviadas} prendas)</td><td className="num">{pesos(orden.total)}</td></tr>
              </tbody>
            </table>
            {telas.length > 0 && (
              <>
                <h3>Telas</h3>
                <p style={{ margin: 0 }}>{telas.map((l) => `${l.rol}: ${nombreMaterial(l.material)}`).join(' · ')}</p>
              </>
            )}
          </div>
          <div>
            <h3>Diseño</h3>
            {disenos.length ? <img className="ficha-diseno" src={disenos[0].imagen} alt={`Diseño ${disenos[0].titulo || disenos[0].codigo}`} /> : <p>Sin diseño adjunto.</p>}
          </div>
        </div>

        <h3>Prendas que se entregan cortadas</h3>
        <table>
          <thead><tr><th>Talle</th><th className="num">Enviadas</th><th className="num">Recibidas</th><th className="num">Con fallas</th><th>Observaciones</th></tr></thead>
          <tbody>
            {prenda?.curva.map((c) => (
              <tr key={c.talle}>
                <td><strong>{c.talle}</strong></td>
                <td className="num">{c.cantidad}</td>
                <td className="num">{orden.recibidas[c.talle] ?? ''}</td>
                <td className="num">{orden.falladas[c.talle] ?? ''}</td>
                <td />
              </tr>
            ))}
            <tr className="total"><td>Total</td><td className="num">{orden.enviadas}</td><td className="num">{orden.estado === 'recibida' ? orden.recibidasTotal : ''}</td><td className="num">{orden.estado === 'recibida' ? orden.falladasTotal : ''}</td><td /></tr>
          </tbody>
        </table>

        {insumos.length > 0 && (
          <>
            <h3>Avíos e insumos que se entregan</h3>
            <table>
              <thead><tr><th style={{ width: 28 }} /><th>Insumo</th><th>Material</th><th className="num">Por prenda</th><th className="num">Cantidad</th></tr></thead>
              <tbody>{insumos.map((l) => <tr key={l.rol}><td><span className="ficha-check" /></td><td>{l.rol}</td><td>{nombreMaterial(l.material)}</td><td className="num">{cant(l.porPrenda)}</td><td className="num"><strong>{cant(l.necesario)} {l.material?.unidad || ''}</strong></td></tr>)}</tbody>
            </table>
          </>
        )}

        {(prenda?.modelo?.pasos || prenda?.fichaNotas || orden.notas) && (
          <>
            <h3>Indicaciones de confección</h3>
            {prenda?.modelo?.pasos && <p className="ficha-pasos" style={{ margin: '0 0 6px' }}>{prenda.modelo.pasos}</p>}
            {prenda?.fichaNotas && <p className="ficha-pasos" style={{ margin: '0 0 6px' }}><strong>Esta promo:</strong> {prenda.fichaNotas}</p>}
            {orden.notas && <p className="ficha-pasos" style={{ margin: 0 }}><strong>Esta orden:</strong> {orden.notas}</p>}
          </>
        )}

        {prenda?.conBordado && prenda.bordados && (
          <>
            <h3>Bordados</h3>
            <table>
              <thead><tr><th>Alumno</th><th>Talle</th><th>Bordado</th><th className="num">Cant.</th></tr></thead>
              <tbody>{prenda.bordados.map((b, i) => <tr key={i}><td>{b.alumno}</td><td>{b.talle}</td><td><strong>{b.bordado || '—'}</strong></td><td className="num">{b.cantidad}</td></tr>)}</tbody>
            </table>
          </>
        )}

        <div className="ficha-firmas"><div>Entregó (Paletta) / fecha</div><div>Recibió (taller) / fecha</div></div>
        <div className="ficha-firmas"><div>Devolvió (taller) / fecha</div><div>Controló (Paletta) / fecha</div></div>
      </section>
    </Container>
  );
};

export default FichaTaller;
