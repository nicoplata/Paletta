import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useEsAdmin } from '../../../context/AuthContext';
import { Button, CheckLabel, Select, Tag } from '../adminUI';
import { COLOR_CUOTA, Tabla, TablaScroll, fecha, pesos } from './comun';

// Tabla de cuotas de un alumno con registro y anulación de pagos.
const CuotasAlumno = ({ alumno, onCambio, resaltar }) => {
  const { showToast } = useToast();
  const esAdmin = useEsAdmin();
  const [pagando, setPagando] = useState(null); // { id, medio, cobrarRecargo }
  const [ocupado, setOcupado] = useState(false);

  if (!alumno.cuotas.length) return <p style={{ color: '#7f8c8d', margin: 0 }}>Todavía no tiene cuotas (falta elegir prendas o plan).</p>;

  const registrar = async () => {
    setOcupado(true);
    try {
      const { data } = await api.post(`/admin/egresados/cuotas/${pagando.id}/pago`, { medio: pagando.medio, cobrarRecargo: pagando.cobrarRecargo });
      showToast('Pago registrado', 'success');
      setPagando(null);
      onCambio(data);
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    } finally {
      setOcupado(false);
    }
  };

  const anular = async (c) => {
    if (!window.confirm(`¿Anular el pago de la cuota ${c.numero} (${c.codigo})?`)) return;
    try {
      const { data } = await api.delete(`/admin/egresados/cuotas/${c.id}/pago`);
      showToast('Pago anulado', 'success');
      onCambio(data);
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  return (
    <TablaScroll>
      <Tabla>
        <thead><tr><th>Cuota</th><th>Código</th><th>Vence</th><th>Estado</th><th className="num">Importe</th><th className="num">Recargo</th><th /></tr></thead>
        <tbody>
          {alumno.cuotas.map((c) => (
            <tr key={c.id} style={resaltar === c.numero ? { background: '#fff8e1' } : undefined}>
              <td>{c.numero}</td>
              <td><code>{c.codigo}</code></td>
              <td>{fecha(c.vencimiento)}</td>
              <td>
                <Tag $color={COLOR_CUOTA[c.estado]}>{c.estado === 'informada' ? 'comprobante en revisión' : c.estado}</Tag>
                {c.estado === 'informada' && <Link to="/admin/dashboard/egresados/comprobantes">Revisar</Link>}
                {c.estado === 'pagada' && <small>{fecha(c.pagadaEl)} · {c.medio}</small>}
              </td>
              <td className="num">{pesos(c.importe)}</td>
              <td className="num">{c.recargo ? pesos(c.recargo) : '-'}</td>
              <td className="num">
                {c.estado === 'pagada' ? (
                  esAdmin && <Button type="button" onClick={() => anular(c)} style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}>Anular</Button>
                ) : pagando?.id === c.id ? (
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Select aria-label="Medio de pago" value={pagando.medio} onChange={(e) => setPagando({ ...pagando, medio: e.target.value })} style={{ width: 'auto', padding: '0.35rem' }}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                    </Select>
                    {c.recargo > 0 && (
                      <CheckLabel style={{ margin: 0 }}><input type="checkbox" checked={pagando.cobrarRecargo} onChange={(e) => setPagando({ ...pagando, cobrarRecargo: e.target.checked })} /> Cobrar recargo</CheckLabel>
                    )}
                    <Button type="button" $primario disabled={ocupado} onClick={registrar} style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}>
                      Confirmar {pesos(c.importe + (pagando.cobrarRecargo ? c.recargo : 0))}
                    </Button>
                    <Button type="button" onClick={() => setPagando(null)} style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}>✕</Button>
                  </span>
                ) : (
                  <Button type="button" $primario onClick={() => setPagando({ id: c.id, medio: 'efectivo', cobrarRecargo: true })} style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }}>Registrar pago</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Tabla>
    </TablaScroll>
  );
};

export default CuotasAlumno;
