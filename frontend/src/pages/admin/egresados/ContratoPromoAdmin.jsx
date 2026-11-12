import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaEye, FaFileUpload, FaPrint, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { useEsAdmin } from '../../../context/AuthContext';
import { Button, ButtonGroup, Container, Empty, ErrorBox, Header, Hint, TextArea, Title } from '../adminUI';
import { Seccion, fecha, nombrePlan, pesos } from './comun';
import '../produccion/fichas.css';

const linea = '______________________________';

// Contrato de la promo: se genera con los datos cargados, se imprime para firmar y se sube firmado
const ContratoPromoAdmin = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  const esAdmin = useEsAdmin();
  const { data, cargando, error, recargar } = useRecurso(`/admin/egresados/promos/${id}/contrato/datos`);
  const [editando, setEditando] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  if (error) return <Container><ErrorBox>{error}</ErrorBox></Container>;
  if (cargando || !data) return <Container><Empty>Cargando...</Empty></Container>;
  const { promo, disenos, clausulas, cuenta } = data;

  const guardarClausulas = async () => {
    try {
      await api.put('/admin/egresados/contrato/clausulas', { clausulas: editando });
      showToast('Cláusulas guardadas: se usan en los contratos de todas las promos', 'success', 5000);
      setEditando(null);
      recargar();
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };
  const restaurar = async () => {
    const { data: c } = await api.get('/admin/egresados/contrato/clausulas');
    setEditando(c.base);
  };

  const subir = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setSubiendo(true);
    try {
      const datos = new FormData();
      datos.append('archivo', archivo);
      await api.post(`/admin/egresados/promos/${id}/contrato`, datos);
      showToast('Contrato firmado cargado: ya lo ven las familias y la comisión', 'success', 5000);
      recargar();
    } catch (err) {
      showToast(mensajeError(err, 'No se pudo subir el contrato'), 'error', 6000);
    } finally {
      setSubiendo(false);
    }
  };
  const ver = async () => {
    const ventana = window.open('', '_blank');
    try {
      const { data: blob } = await api.get(`/admin/egresados/promos/${id}/contrato`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      if (ventana) ventana.location.href = url;
      else window.location.assign(url);
    } catch {
      ventana?.close();
    }
  };
  const quitar = async () => {
    if (!window.confirm('¿Quitar el contrato firmado? Las familias y la comisión dejan de verlo.')) return;
    await api.delete(`/admin/egresados/promos/${id}/contrato`);
    recargar();
  };

  const recargo = promo.recargoTipo && promo.recargoValor
    ? (promo.recargoTipo === 'porcentaje' ? `${promo.recargoValor}% de la cuota` : pesos(promo.recargoValor))
    : 'sin recargo';
  const integrantes = promo.comisionIntegrantes || [];
  const firmantes = integrantes.length ? integrantes : [{ nombre: '' }, { nombre: '' }];

  return (
    <Container>
      <Header className="no-print">
        <div>
          <Link to={`/admin/dashboard/egresados/${promo.id}`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}><FaArrowLeft /> {promo.colegio} {promo.curso} {promo.anio}</Link>
          <Title>Contrato de la promo</Title>
        </div>
        <Button $primario onClick={() => window.print()}><FaPrint /> Imprimir para firmar</Button>
      </Header>

      <Seccion className="no-print">
        <h2>Contrato firmado</h2>
        {promo.contratoSubidoEl ? (
          <>
            <p style={{ margin: '0 0 10px' }}>Cargado el {new Date(promo.contratoSubidoEl).toLocaleString('es-AR')}. Lo ven las familias en Mi promo y la comisión en Mi curso (con su clave).</p>
            <ButtonGroup style={{ justifyContent: 'flex-start' }}>
              <Button type="button" onClick={ver}><FaEye /> Ver</Button>
              <Button as="label" style={{ cursor: 'pointer' }}><FaFileUpload /> Reemplazar<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={subir} hidden /></Button>
              {esAdmin && <Button type="button" onClick={quitar}><FaTrash /> Quitar</Button>}
            </ButtonGroup>
          </>
        ) : (
          <>
            <Hint style={{ marginBottom: 10 }}>Imprimí el contrato, que lo firme la comisión y subí el escaneo o una foto (PDF, JPG, PNG o WEBP, hasta 10 MB).</Hint>
            <Button as="label" $primario style={{ cursor: subiendo ? 'wait' : 'pointer' }}><FaFileUpload /> {subiendo ? 'Subiendo…' : 'Subir contrato firmado'}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={subir} hidden disabled={subiendo} /></Button>
          </>
        )}
      </Seccion>

      {editando !== null && (
        <Seccion className="no-print">
          <h2>Cláusulas del contrato</h2>
          <Hint style={{ marginBottom: 8 }}>Son las mismas para todas las promos. Los precios, planes y fechas se completan solos con los datos de cada promo.</Hint>
          <TextArea aria-label="Cláusulas" rows={16} value={editando} onChange={(e) => setEditando(e.target.value)} />
          <ButtonGroup>
            <Button type="button" onClick={restaurar}>Volver al texto original</Button>
            <Button type="button" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button type="button" $primario onClick={guardarClausulas}>Guardar cláusulas</Button>
          </ButtonGroup>
        </Seccion>
      )}

      <section className="ficha contrato">
        <div className="ficha-cabecera">
          <div>
            <div className="ficha-tipo">Contrato de confección · Paletta Egresados</div>
            <h2>{promo.colegio} · {promo.curso} · Promo {promo.anio}</h2>
            <small>Código de la promo: <strong>{promo.codigo}</strong> · egresados.paletta.com.ar/mi-promo</small>
          </div>
          <small>Fecha: {linea.slice(0, 16)}</small>
        </div>

        <p>Entre <strong>Paletta</strong> (Av. Vélez Sarsfield 4270, Munro, Vicente López) y la comisión de egresados del curso indicado, en representación de las familias, se acuerda lo siguiente:</p>

        <h3>Prendas y precios por alumno</h3>
        <table>
          <thead><tr><th>Prenda</th><th>Talles</th><th>Bordado</th><th className="num">Precio</th></tr></thead>
          <tbody>
            {promo.prendas.map((p) => (
              <tr key={p.id}><td><strong>{p.nombre}</strong>{p.descripcion ? <><br /><small>{p.descripcion}</small></> : null}</td><td>{p.talles.join(', ')}</td><td>{p.conBordado ? 'Nombre o apodo' : '—'}</td><td className="num">{pesos(p.precio)}</td></tr>
            ))}
          </tbody>
        </table>

        <h3>Pago y fechas</h3>
        <table>
          <tbody>
            <tr><th>Planes de pago</th><td>{promo.planes.map(nombrePlan).join(' · ')}</td></tr>
            {Number(promo.descuentoContado) > 0 && <tr><th>Descuento por pago contado</th><td>{promo.descuentoContado}%</td></tr>}
            <tr><th>Primer vencimiento</th><td>{fecha(promo.primerVencimiento)} (las cuotas siguientes vencen cada mes)</td></tr>
            <tr><th>Recargo por pago fuera de término</th><td>{recargo}</td></tr>
            <tr><th>Cierre de la carga de pedidos</th><td>{promo.fechaCierre ? fecha(promo.fechaCierre) : linea.slice(0, 18)}</td></tr>
            <tr><th>Entrega estimada</th><td>{promo.fechaEntrega ? fecha(promo.fechaEntrega) : linea.slice(0, 18)}</td></tr>
            {(cuenta?.alias || cuenta?.cbu) && <tr><th>Transferencias</th><td>{[cuenta.alias && `Alias ${cuenta.alias}`, cuenta.cbu && `CBU ${cuenta.cbu}`, cuenta.titular].filter(Boolean).join(' · ')}</td></tr>}
          </tbody>
        </table>

        {disenos.length > 0 && (
          <>
            <h3>Diseño</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {disenos.slice(0, 2).map((d) => <img key={d.codigo} className="ficha-diseno" src={d.imagen} alt={`Diseño ${d.titulo || d.codigo}`} />)}
            </div>
            <p><small>El diseño final lo aprueba la comisión desde Mi curso antes de empezar la producción.</small></p>
          </>
        )}

        <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Cláusulas
          {esAdmin && <Button type="button" className="no-print" onClick={() => setEditando(clausulas)} style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', letterSpacing: 0, textTransform: 'none' }}><FaEdit /> Editar cláusulas</Button>}
        </h3>
        <div className="ficha-pasos">{clausulas}</div>

        <h3>Firmas</h3>
        <div className="ficha-firmas">
          <div>Por Paletta: firma y aclaración</div>
          {firmantes.map((f, i) => <div key={i}>Comisión: {f.nombre || 'firma y aclaración'}<br />DNI: {linea.slice(0, 14)}</div>)}
        </div>
      </section>
    </Container>
  );
};

export default ContratoPromoAdmin;
