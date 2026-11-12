import { useEffect, useRef, useState } from 'react';
import { FaLock } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { guardarPermiso, registrarPedidoPassword } from '../../lib/confirmacion';
import './panel.css';

// Ventana que pide la contraseña antes de una acción sensible (la abre el cliente de la API ante un 428)
const ConfirmacionModal = () => {
  const [pedido, setPedido] = useState(null); // { mensaje, resolver }
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const input = useRef(null);
  const dialog = useRef(null);

  useEffect(() => {
    registrarPedidoPassword((mensaje) => new Promise((resolver) => setPedido({ mensaje, resolver })));
    return () => registrarPedidoPassword(null);
  }, []);

  useEffect(() => {
    if (!pedido) return;
    setPassword('');
    setError('');
    if (!dialog.current.open) dialog.current.showModal();
    setTimeout(() => input.current?.focus(), 30);
  }, [pedido]);

  const cerrar = (ok) => {
    pedido?.resolver(ok);
    setPedido(null);
    if (dialog.current?.open) dialog.current.close();
  };

  const confirmar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const { data } = await api.post('/auth/confirmar', { password });
      guardarPermiso(data.token, data.minutos);
      cerrar(true);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo confirmar'));
      input.current?.select();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <dialog ref={dialog} className="panel-dialogo" aria-labelledby="conf-titulo" onCancel={(e) => { e.preventDefault(); cerrar(false); }}>
      <form onSubmit={confirmar}>
        <h2 id="conf-titulo"><FaLock aria-hidden="true" /> Confirmá que sos vos</h2>
        <p>{pedido?.mensaje || 'Por seguridad, confirmá con tu contraseña para seguir.'}</p>
        <p className="panel-tenue">Después no te la vuelve a pedir por 10 minutos. La acción queda registrada.</p>
        <label htmlFor="conf-password">Tu contraseña</label>
        <input id="conf-password" ref={input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="panel-error" role="alert">{error}</p>}
        <div className="panel-acciones">
          <button type="button" className="panel-btn" onClick={() => cerrar(false)}>Cancelar</button>
          <button type="submit" className="panel-btn primario" disabled={enviando || !password}>{enviando ? 'Confirmando…' : 'Confirmar'}</button>
        </div>
      </form>
    </dialog>
  );
};

export default ConfirmacionModal;
