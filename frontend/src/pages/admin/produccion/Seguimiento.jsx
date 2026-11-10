import { Link } from 'react-router-dom';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { Empty, ErrorBox, Hint, Tag } from '../adminUI';
import { ESTADOS_PRODUCCION, Seccion, fecha } from '../egresados/comun';
import { ETAPAS } from './comunProduccion';
import './fichas.css';

// Tablero interno: en qué etapa está cada prenda de cada promo que todavía no se entregó
const Seguimiento = () => {
  const { showToast } = useToast();
  const { data, cargando, error, recargar } = useRecurso('/admin/produccion/seguimiento');

  const mover = async (prenda, etapa) => {
    try {
      await api.put(`/admin/produccion/prendas/${prenda.id}/etapa`, { etapa });
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (cargando || !data) return <Empty>Cargando...</Empty>;
  if (!data.promos.length) return <Empty>No hay promos en curso.</Empty>;

  return (
    <>
      <Hint>Tocá una etapa para mover la prenda. Al enviar o recibir una orden de taller, la prenda avanza sola.</Hint>
      {data.promos.map((p) => (
        <Seccion key={p.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0 }}><Link to={`/admin/dashboard/egresados/${p.id}/produccion`}>{p.colegio} · {p.curso} · {p.anio}</Link></h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Tag $color="#2c3e50">{ESTADOS_PRODUCCION[p.estadoProduccion]}</Tag>
              <Tag $color={p.disenoAprobado ? '#27ae60' : '#d35400'}>{p.disenoAprobado ? 'Diseño aprobado' : 'Diseño sin aprobar'}</Tag>
              <Tag $color={p.contrato ? '#27ae60' : '#d35400'}>{p.contrato ? 'Contrato firmado' : 'Sin contrato'}</Tag>
              {p.fechaEntrega && <small>Entrega {fecha(p.fechaEntrega)}</small>}
            </div>
          </div>
          {p.prendas.length === 0 ? <Hint>La promo no tiene prendas activas.</Hint> : p.prendas.map((x) => {
            const actual = ETAPAS.findIndex((e) => e.clave === x.etapa);
            return (
              <div key={x.id} className="seg-fila">
                <div className="seg-prenda">
                  <strong>{x.nombre}</strong>
                  <small>{x.unidades} {x.unidades === 1 ? 'prenda' : 'prendas'}{x.enTaller ? ` · ${x.enTaller} en taller` : ''}</small>
                  {x.atrasadas.map((a) => <small key={a.numero} className="seg-atraso">⚠ {a.numero} ({a.taller}) debía volver el {fecha(a.compromisoEl)}</small>)}
                </div>
                <ol className="seg-etapas" aria-label={`Etapa de ${x.nombre}`}>
                  {ETAPAS.map((e, i) => (
                    <li key={e.clave}>
                      <button type="button" className={i < actual ? 'hecha' : i === actual ? 'actual' : ''} aria-current={i === actual ? 'step' : undefined}
                        disabled={i === actual} onClick={() => mover(x, e.clave)} title={x.seguimiento[e.clave] ? `Desde el ${fecha(x.seguimiento[e.clave])}` : `Mover a “${e.nombre}”`}>
                        {e.nombre}{x.seguimiento[e.clave] && <span>{fecha(x.seguimiento[e.clave]).slice(0, 5)}</span>}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </Seccion>
      ))}
    </>
  );
};

export default Seguimiento;
