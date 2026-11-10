import { useState } from 'react';
import { FaInstagram, FaSyncAlt } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { Button, ButtonGroup, ErrorBox, Hint, Input, Label } from '../adminUI';
import { Seccion } from './comun';

const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '-');

// Conexión del feed de Instagram de @paletta.egresados (se muestra en el inicio del sitio de egresados)
const InstagramAdmin = () => {
  const { showToast } = useToast();
  const { data: estado, setData, cargando } = useRecurso('/admin/egresados/instagram');
  const [token, setToken] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');
  const [guia, setGuia] = useState(false);

  const accion = async (fn, ok) => {
    setError('');
    setTrabajando(true);
    try {
      const { data } = await fn();
      if (data) setData(data);
      if (ok) showToast(ok, 'success');
      return true;
    } catch (err) {
      setError(mensajeError(err));
      return false;
    } finally {
      setTrabajando(false);
    }
  };

  const conectar = async (e) => {
    e.preventDefault();
    if (await accion(() => api.put('/admin/egresados/instagram', { token: token.trim() }), 'Instagram conectado: las publicaciones ya están en el sitio')) setToken('');
  };
  const desconectar = async () => {
    if (!window.confirm('¿Desconectar Instagram? La sección deja de mostrarse en el sitio.')) return;
    await accion(async () => { await api.delete('/admin/egresados/instagram'); return { data: { conectado: false } }; }, 'Instagram desconectado');
  };

  if (cargando || !estado) return null;
  const venceEn = estado.expira ? Math.round((new Date(estado.expira) - Date.now()) / 86400000) : null;

  return (
    <Seccion>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FaInstagram /> Instagram</h2>
      {error && <ErrorBox role="alert">{error}</ErrorBox>}
      {estado.conectado ? (
        <>
          <p style={{ margin: '0 0 6px' }}>
            Conectado como <strong>@{estado.usuario || 'paletta.egresados'}</strong> · {estado.publicaciones} publicaciones en el sitio · última actualización {fechaHora(estado.sincronizadoEl)}
          </p>
          <Hint>Se actualiza solo cada 30 minutos. {venceEn !== null && `El acceso se renueva solo (vence en ${venceEn} días si no se renovara).`}</Hint>
          {estado.error && <ErrorBox role="alert">Último intento: {estado.error}</ErrorBox>}
          <ButtonGroup style={{ justifyContent: 'flex-start', marginTop: 10 }}>
            <Button type="button" disabled={trabajando} onClick={() => accion(() => api.post('/admin/egresados/instagram/sincronizar'), 'Publicaciones actualizadas')}><FaSyncAlt /> Actualizar ahora</Button>
            {!estado.desdeVariable && <Button type="button" disabled={trabajando} onClick={desconectar}>Desconectar</Button>}
          </ButtonGroup>
        </>
      ) : (
        <form onSubmit={conectar}>
          <Hint style={{ marginBottom: 10 }}>Conectá la cuenta para mostrar las últimas publicaciones de @paletta.egresados en el inicio del sitio. Las imágenes se guardan en el servidor: el sitio no carga nada de Instagram.</Hint>
          <Label htmlFor="ig-token">Token de acceso de Instagram</Label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Input id="ig-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="IGAA…" style={{ flex: 1, minWidth: 240 }} />
            <Button type="submit" $primario disabled={trabajando || token.trim().length < 40}>{trabajando ? 'Conectando…' : 'Conectar'}</Button>
          </div>
          <Button type="button" onClick={() => setGuia(!guia)} style={{ marginTop: 10, padding: '0.4rem 0.8rem' }} aria-expanded={guia}>{guia ? 'Ocultar' : 'Cómo consigo el token'}</Button>
          {guia && (
            <ol style={{ margin: '12px 0 0', paddingLeft: 20, lineHeight: 1.6 }}>
              <li>En la app de Instagram, con @paletta.egresados: <em>Configuración → Tipo de cuenta y herramientas → Cambiar a cuenta profesional</em> (Empresa o Creador).</li>
              <li>Entrá a <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">developers.facebook.com/apps</a> con tu Facebook y tocá <em>Crear app</em> → caso de uso <em>Otro</em> → tipo <em>Empresa</em>.</li>
              <li>En la app, agregá el producto <em>Instagram</em> y elegí <em>Configuración de la API con inicio de sesión de Instagram</em>.</li>
              <li>En <em>Generar tokens de acceso</em> tocá <em>Agregar cuenta</em>, iniciá sesión con @paletta.egresados y aceptá los permisos. Si te lo pide, sumá la cuenta en <em>Roles de la app → Evaluadores de Instagram</em> y aceptá la invitación desde Instagram (Configuración → Apps y sitios web).</li>
              <li>Tocá <em>Generar token</em>, copialo completo (empieza con IGAA) y pegalo acá. Dura 60 días y el sistema lo renueva solo.</li>
            </ol>
          )}
        </form>
      )}
    </Seccion>
  );
};

export default InstagramAdmin;
