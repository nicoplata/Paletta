import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaPrint } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { Button, ButtonGroup, CheckLabel, Empty, ErrorBox, Hint } from '../adminUI';
import { pesos } from '../egresados/comun';
import { cant, imprimir, nombreMaterial } from './comunProduccion';
import './fichas.css';

// Lista de compras: suma la tela y los insumos de una o varias promos y descuenta el stock
const Compras = () => {
  const [params, setParams] = useSearchParams();
  const { data: promos, cargando } = useRecurso('/admin/egresados/promos', { porDefecto: [] });
  const elegidas = useMemo(() => (params.get('promos') || '').split(',').filter(Boolean).map(Number), [params]);
  const confirmados = params.get('confirmados') === 'true';
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');

  const cambiarParams = (cambios) => {
    const p = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };
  const alternar = (id) => {
    const nuevas = elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id];
    cambiarParams({ promos: nuevas.join(',') });
  };

  useEffect(() => {
    if (!elegidas.length) { setLista(null); return undefined; }
    let vigente = true;
    setError('');
    api.get(`/admin/produccion/compras?promos=${elegidas.join(',')}&confirmados=${confirmados}`)
      .then(({ data }) => vigente && setLista(data))
      .catch((err) => vigente && setError(mensajeError(err)));
    return () => { vigente = false; };
  }, [elegidas, confirmados]);

  const porProveedor = useMemo(() => {
    const grupos = new Map();
    (lista?.filas || []).forEach((f) => {
      const k = f.material.proveedor || 'Sin proveedor';
      grupos.set(k, [...(grupos.get(k) || []), f]);
    });
    return [...grupos.entries()];
  }, [lista]);

  const activas = promos.filter((p) => p.activo !== false);

  return (
    <>
      <div className="no-print">
        <Hint>Elegí las promos que vas a producir juntas: se suma lo que necesita cada una y se descuenta el stock de cada material.</Hint>
        {cargando ? <Empty>Cargando promos...</Empty> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', margin: '12px 0' }}>
            {activas.map((p) => (
              <CheckLabel key={p.id}><input type="checkbox" checked={elegidas.includes(p.id)} onChange={() => alternar(p.id)} /> {p.colegio} {p.curso} {p.anio}</CheckLabel>
            ))}
          </div>
        )}
        <CheckLabel><input type="checkbox" checked={confirmados} onChange={(e) => cambiarParams({ confirmados: e.target.checked ? 'true' : '' })} /> Contar solo alumnos con la cuota 1 paga</CheckLabel>
        {lista && <ButtonGroup style={{ justifyContent: 'flex-start', margin: '12px 0' }}><Button $primario onClick={imprimir}><FaPrint /> Imprimir lista de compras</Button></ButtonGroup>}
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {!elegidas.length && <Empty className="no-print">Elegí al menos una promo.</Empty>}
      {lista && (
        <section className="ficha">
          <div className="ficha-cabecera">
            <div>
              <div className="ficha-tipo">Lista de compras</div>
              <h2>{lista.promos.map((p) => `${p.colegio} ${p.curso} ${p.anio}`).join(' + ')}</h2>
              <small>{lista.promos.reduce((a, p) => a + p.unidades, 0)} prendas · {confirmados ? 'solo alumnos con la cuota 1 paga' : 'todos los alumnos que eligieron prendas'}</small>
            </div>
            <small>{new Date().toLocaleDateString('es-AR')}</small>
          </div>
          {lista.promos.some((p) => p.avisos.length) && (
            <div className="ficha-aviso">
              <strong>Revisar antes de comprar:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{lista.promos.flatMap((p) => p.avisos.map((a) => <li key={`${p.id}-${a}`}>{p.colegio} {p.curso}: {a}</li>))}</ul>
            </div>
          )}
          {porProveedor.length === 0 ? <p>No hay nada para comprar todavía (¿las prendas tienen ficha técnica y alumnos que las eligieron?).</p> : porProveedor.map(([proveedor, filas]) => (
            <div key={proveedor}>
              <h3>{proveedor}</h3>
              <table>
                <thead><tr><th style={{ width: 28 }} /><th>Material</th><th className="num">Necesario</th><th className="num">Stock</th><th className="num">A comprar</th><th className="num">Precio</th><th className="num">Subtotal</th></tr></thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.material.id}>
                      <td><span className="ficha-check" /></td>
                      <td><strong>{nombreMaterial(f.material)}</strong><br /><small>{f.usos.map((u) => `${u.prenda} (${u.rol})`).join(' · ')}</small></td>
                      <td className="num">{cant(f.necesario)} {f.material.unidad}</td>
                      <td className="num">{cant(f.stock)}</td>
                      <td className="num"><strong>{cant(f.comprar)} {f.material.unidad}</strong></td>
                      <td className="num">{pesos(f.material.precio)}</td>
                      <td className="num">{pesos(f.costo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {lista.sinMaterial.length > 0 && (
            <>
              <h3>Sin material elegido</h3>
              <p>{lista.sinMaterial.map((s) => `${s.prenda}: ${s.rol} (${cant(s.necesario)})`).join(' · ')}</p>
            </>
          )}
          <table style={{ marginTop: 16 }}><tbody><tr className="total"><td>Total estimado de la compra</td><td className="num">{pesos(lista.total)}</td></tr></tbody></table>
        </section>
      )}
    </>
  );
};

export default Compras;
