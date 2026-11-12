import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import api from '../../lib/api';
import './panel.css';

const CADA = 60 * 1000;
const TITULO = document.title.replace(/^\(\d+\)\s*/, '');

const hace = (iso) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
};

// Avisos del panel: nuevos presupuestos, comprobantes, pedidos, pagos, mensajes, órdenes atrasadas…
// Se actualiza sola cada minuto, muestra el contador en la pestaña y, si se permite, avisa con una notificación del sistema.
const Campanita = () => {
  const [datos, setDatos] = useState({ noLeidas: 0, items: [], pendientes: [] });
  const [abierta, setAbierta] = useState(false);
  const [permiso, setPermiso] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const vistos = useRef(null); // ids ya conocidos (para avisar solo lo nuevo)
  const caja = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/notificaciones');
      setDatos(data);
      const nuevos = data.items.filter((n) => !n.leida && vistos.current && !vistos.current.has(n.id));
      vistos.current = new Set(data.items.map((n) => n.id));
      if (nuevos.length && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        const n = nuevos[0];
        const aviso = new Notification(nuevos.length > 1 ? `${nuevos.length} avisos nuevos en Paletta` : n.titulo, { body: nuevos.length > 1 ? n.titulo : (n.texto || ''), tag: 'paletta-panel' });
        aviso.onclick = () => { window.focus(); if (n.link) window.location.assign(n.link); };
      }
    } catch { /* sin conexión: se reintenta en el próximo ciclo */ }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, CADA);
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver); document.title = TITULO; };
  }, [cargar]);

  // Contador en la pestaña del navegador
  useEffect(() => {
    document.title = datos.noLeidas ? `(${datos.noLeidas}) ${TITULO}` : TITULO;
  }, [datos.noLeidas]);

  // Cierra al tocar afuera o con Escape
  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierta(false); };
    const esc = (e) => { if (e.key === 'Escape') setAbierta(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierta]);

  const marcarLeidas = async () => {
    try {
      await api.post('/admin/notificaciones/leidas');
      setDatos((d) => ({ ...d, noLeidas: 0, items: d.items.map((n) => ({ ...n, leida: true })) }));
    } catch { /* se reintenta la próxima vez */ }
  };

  // Al abrir, el contador se pone en cero (las nuevas siguen resaltadas hasta la próxima actualización)
  useEffect(() => {
    if (!abierta || !datos.noLeidas) return;
    api.post('/admin/notificaciones/leidas').then(() => setDatos((d) => ({ ...d, noLeidas: 0 }))).catch(() => {});
  }, [abierta, datos.noLeidas]);

  const activarAvisos = async () => {
    if (typeof Notification === 'undefined') return;
    setPermiso(await Notification.requestPermission());
  };

  const pendientesTotal = datos.pendientes.reduce((a, p) => a + p.cantidad, 0);

  return (
    <div className="campana" ref={caja}>
      <button type="button" className="campana-boton" onClick={() => setAbierta(!abierta)} aria-expanded={abierta} aria-haspopup="true"
        aria-label={datos.noLeidas ? `Avisos: ${datos.noLeidas} sin leer` : 'Avisos'}>
        <FaBell aria-hidden="true" />
        {datos.noLeidas > 0 && <span className="campana-num" aria-hidden="true">{datos.noLeidas > 99 ? '99+' : datos.noLeidas}</span>}
      </button>
      {abierta && (
        <div className="campana-panel" role="dialog" aria-label="Avisos">
          <div className="campana-cab">
            <h2>Avisos</h2>
            {datos.noLeidas > 0 && <button type="button" onClick={marcarLeidas}>Marcar todo como leído</button>}
          </div>
          {pendientesTotal > 0 && (
            <div className="campana-pend">
              {datos.pendientes.map((p) => (
                <Link key={p.clave} to={p.link} onClick={() => setAbierta(false)}><span>{p.texto.charAt(0).toUpperCase() + p.texto.slice(1)}</span><b>{p.cantidad}</b></Link>
              ))}
            </div>
          )}
          {datos.items.length === 0 ? <p className="campana-vacio">No hay avisos todavía.</p> : (
            <ul className="campana-lista">
              {datos.items.map((n) => (
                <li key={n.id} className={n.leida ? '' : 'nueva'}>
                  <Link to={n.link || '#'} onClick={() => setAbierta(false)}>
                    <strong>{n.titulo}</strong>
                    {n.texto && <span>{n.texto}</span>}
                    <small>{hace(n.fecha)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {permiso === 'default' && (
            <div className="campana-pie"><button type="button" onClick={activarAvisos}>Activar avisos en este dispositivo</button></div>
          )}
        </div>
      )}
    </div>
  );
};

export default Campanita;
