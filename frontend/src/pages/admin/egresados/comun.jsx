import styled from 'styled-components';

export const pesos = (n) => (typeof n === 'number'
  ? n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
  : '-');
export const fecha = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-');
export const hoyISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
export const nombrePlan = (plan) => (plan ? (plan === 1 ? 'Contado' : `${plan} cuotas`) : 'Sin elegir');

export const ESTADOS_PRODUCCION = {
  pendiente: 'Carga de pedidos',
  en_produccion: 'En producción',
  listo: 'Listo para entregar',
  entregado: 'Entregado',
};

export const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;

  th, td {
    text-align: left;
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid var(--color-borde);
    vertical-align: top;
  }
  th { font-size: 0.8rem; color: #7f8c8d; white-space: nowrap; }
  td.num, th.num { text-align: right; white-space: nowrap; }
`;

export const TablaScroll = styled.div`
  overflow-x: auto;
`;

export const Seccion = styled.section`
  background: var(--color-superficie);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;

  h2 { margin: 0 0 1rem; font-size: 1.15rem; color: #2c3e50; }
`;

export const Cifras = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  div { background: var(--color-superficie); border-radius: 10px; padding: 0.8rem 1rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
  span { display: block; font-size: 0.78rem; color: #7f8c8d; }
  b { font-size: 1.3rem; color: #2c3e50; }
`;

export const Puntos = ({ progreso }) => {
  const pasos = [['ingreso', 'Entró'], ['datos', 'Datos'], ['prendas', 'Prendas'], ['plan', 'Plan'], ['sena', 'Cuota 1']];
  return (
    <span style={{ display: 'inline-flex', gap: 3 }} aria-label={pasos.map(([k, t]) => `${t}: ${progreso[k] ? 'sí' : 'no'}`).join(', ')}>
      {pasos.map(([k, t]) => (
        <span
          key={k}
          title={t}
          style={{ width: 12, height: 12, borderRadius: '50%', background: progreso[k] ? '#27ae60' : '#e0dcd2', display: 'inline-block' }}
        />
      ))}
    </span>
  );
};

export const COLOR_CUOTA = { pagada: '#27ae60', pendiente: '#7f8c8d', vencida: '#c0392b' };

export const LinkCopiable = ({ url, onCopiado }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <code style={{ background: '#f1ede4', padding: '0.4rem 0.6rem', borderRadius: 6, wordBreak: 'break-all' }}>{url}</code>
    <button
      type="button"
      className="btn btn-sm btn-secundario"
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); onCopiado?.(); } catch { /* sin portapapeles */ }
      }}
    >
      Copiar link
    </button>
  </div>
);
