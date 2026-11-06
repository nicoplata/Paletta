import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaTimes } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { Button, Container, Empty, ErrorBox, Header, Hint, Input, Label, TextArea, Title } from '../adminUI';
import { Seccion, fecha, pesos } from './comun';

const ESTADOS = { pendiente: 'Por revisar', aprobado: 'Aprobados', rechazado: 'Rechazados' };

// Vista previa del archivo (se pide con el token del panel: no hay URL pública)
const Vista = ({ comprobante }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let creada;
    api.get(`/admin/egresados/comprobantes/${comprobante.id}/archivo`, { responseType: 'blob' })
      .then(({ data }) => { creada = URL.createObjectURL(data); setUrl(creada); })
      .catch(() => setError('No se pudo cargar el archivo'));
    return () => { if (creada) URL.revokeObjectURL(creada); };
  }, [comprobante.id]);
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!url) return <Hint>Cargando archivo…</Hint>;
  return (
    <div>
      {comprobante.tipo === 'application/pdf'
        ? <object data={url} type="application/pdf" aria-label="Comprobante en PDF" style={{ width: '100%', height: 420, border: '1px solid #ddd', borderRadius: 8 }}><a href={url} target="_blank" rel="noopener noreferrer">Abrir PDF</a></object>
        : <img src={url} alt={`Comprobante de ${comprobante.alumno.nombre}`} style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, border: '1px solid #ddd' }} />}
      <p style={{ margin: '6px 0 0' }}><a href={url} target="_blank" rel="noopener noreferrer">Abrir en otra pestaña</a></p>
    </div>
  );
};

const Revision = ({ comprobante, onListo }) => {
  const { showToast } = useToast();
  const [fechaPago, setFechaPago] = useState(comprobante.subidoElDia);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const { cuota } = comprobante;

  const enviar = async (accion, datos, ok) => {
    setOcupado(true);
    try {
      await api.post(`/admin/egresados/comprobantes/${comprobante.id}/${accion}`, datos);
      showToast(ok, 'success');
      onListo();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
      setOcupado(false);
    }
  };

  return (
    <Seccion>
      <h2>
        <Link to={`/admin/dashboard/egresados/alumnos/${comprobante.alumno.id}`}>{comprobante.alumno.nombre}</Link>
        <small style={{ fontWeight: 400, color: '#7f8c8d' }}> · {comprobante.promo.colegio} {comprobante.promo.curso} {comprobante.promo.anio}</small>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)', gap: 20 }}>
        <div>
          <p style={{ marginTop: 0 }}>
            Cuota <strong>{cuota.numero}</strong> · código <code>{cuota.codigo}</code><br />
            Importe: <strong>{pesos(cuota.importe)}</strong> · vence el {fecha(cuota.vencimiento)}<br />
            {cuota.recargoAlSubir > 0
              ? <>Recargo según el día en que lo subió: <strong>{pesos(cuota.recargoAlSubir)}</strong> · total esperado <strong>{pesos(cuota.importe + cuota.recargoAlSubir)}</strong><br /></>
              : <>Total esperado: <strong>{pesos(cuota.importe)}</strong><br /></>}
            Subido el {new Date(comprobante.subidoEl).toLocaleString('es-AR')}
          </p>
          {comprobante.estado === 'rechazado' && <ErrorBox>Rechazado: {comprobante.motivoRechazo}</ErrorBox>}
          {comprobante.estado === 'pendiente' && (rechazando ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <Label htmlFor={`motivo-${comprobante.id}`}>Motivo (lo recibe la familia por mail)</Label>
              <TextArea id={`motivo-${comprobante.id}`} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el monto no coincide con la cuota" maxLength={200} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="button" onClick={() => setRechazando(false)}>Cancelar</Button>
                <Button type="button" $primario disabled={ocupado || motivo.trim().length < 5} onClick={() => enviar('rechazar', { motivo }, 'Comprobante rechazado')}>Rechazar</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <Label htmlFor={`fecha-${comprobante.id}`}>Fecha del pago</Label>
              <Input id={`fecha-${comprobante.id}`} type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} style={{ maxWidth: 200 }} />
              <Hint>Por defecto, el día en que la familia subió el comprobante (define si corresponde recargo).</Hint>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button type="button" $primario disabled={ocupado} onClick={() => enviar('aprobar', { fecha: fechaPago }, 'Pago confirmado')}><FaCheck /> Confirmar pago</Button>
                <Button type="button" disabled={ocupado} onClick={() => setRechazando(true)}><FaTimes /> Rechazar</Button>
              </div>
            </div>
          ))}
        </div>
        <Vista comprobante={comprobante} />
      </div>
    </Seccion>
  );
};

const ComprobantesEgresadosAdmin = () => {
  const [estado, setEstado] = useState('pendiente');
  const { data: lista, cargando, error, recargar } = useRecurso(`/admin/egresados/comprobantes?estado=${estado}`, { porDefecto: [] });

  return (
    <Container>
      <Header>
        <div>
          <Link to="/admin/dashboard/egresados" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}><FaArrowLeft /> Egresados</Link>
          <Title>Comprobantes de transferencia</Title>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Object.entries(ESTADOS).map(([k, t]) => (
            <Button key={k} type="button" $primario={estado === k} onClick={() => setEstado(k)}>{t}</Button>
          ))}
        </div>
      </Header>
      <Hint style={{ marginBottom: 16 }}>Las familias los suben desde la cuponera. Al confirmar, la cuota queda paga y la familia recibe un mail; si lo rechazás, le llega el motivo y puede subir otro.</Hint>
      {error && <ErrorBox>{error}</ErrorBox>}
      {cargando ? <Empty>Cargando...</Empty> : lista.length === 0 ? <Empty>{estado === 'pendiente' ? 'No hay comprobantes por revisar. 🎉' : 'No hay comprobantes en esta lista.'}</Empty> : (
        lista.map((c) => <Revision key={c.id} comprobante={c} onListo={recargar} />)
      )}
    </Container>
  );
};

export default ComprobantesEgresadosAdmin;
