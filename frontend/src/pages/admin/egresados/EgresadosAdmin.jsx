import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaCashRegister, FaEnvelope, FaReceipt, FaPalette } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import {
  Button, ButtonGroup, CheckLabel, Container, Empty, ErrorBox, Form, FormGroup, Header, Hint, Input, Label, Row, Select, Title,
} from '../adminUI';
import { ESTADOS_PRODUCCION, Seccion, Tabla, TablaScroll, pesos } from './comun';

const PLANES_POSIBLES = [1, 2, 3, 4, 5, 6, 8, 10, 12];

export const VACIO_PROMO = {
  codigo: '',
  colegio: '', curso: '', anio: String(new Date().getFullYear() + 1), planes: [1, 3, 6], descuentoContado: '10',
  recargoTipo: '', recargoValor: '', primerVencimiento: '', fechaCierre: '', notas: '',
};

export const aPayloadPromo = (f) => ({
  ...(f.codigo ? { codigo: f.codigo } : {}),
  colegio: f.colegio,
  curso: f.curso,
  anio: Number(f.anio),
  planes: f.planes,
  descuentoContado: Number(f.descuentoContado || 0),
  recargoTipo: f.recargoTipo || null,
  recargoValor: f.recargoTipo ? Number(f.recargoValor || 0) : null,
  primerVencimiento: f.primerVencimiento,
  fechaCierre: f.fechaCierre || null,
  notas: f.notas,
});

// Formulario de promo (se usa para crear y para editar)
export const FormPromo = ({ valor, onChange, onSubmit, onCancel, guardando, error, textoBoton = 'Guardar' }) => {
  const cambiar = (e) => onChange({ ...valor, [e.target.name]: e.target.value });
  const togglePlan = (n) => onChange({
    ...valor,
    planes: valor.planes.includes(n) ? valor.planes.filter((p) => p !== n) : [...valor.planes, n].sort((a, b) => a - b),
  });
  return (
    <Form onSubmit={onSubmit}>
      {error && <ErrorBox role="alert">{error}</ErrorBox>}
      <Row>
        <FormGroup><Label htmlFor="colegio">Colegio</Label><Input id="colegio" name="colegio" value={valor.colegio} onChange={cambiar} required minLength={2} /></FormGroup>
        <FormGroup><Label htmlFor="curso">Curso</Label><Input id="curso" name="curso" value={valor.curso} onChange={cambiar} required placeholder="6º A" /></FormGroup>
        <FormGroup><Label htmlFor="anio">Promo (año)</Label><Input id="anio" name="anio" type="number" min="2020" max="2100" value={valor.anio} onChange={cambiar} required /></FormGroup>
      </Row>
      <FormGroup>
        <Label htmlFor="codigo">Código de la promo (opcional)</Label>
        <Input id="codigo" name="codigo" value={valor.codigo} onChange={(e) => onChange({ ...valor, codigo: e.target.value.toUpperCase() })} maxLength={19} placeholder="Si lo dejás vacío se genera uno, ej.: EGR27-K7M2" />
        <Hint>Es el que va en el contrato: con él entran familias y comisión. Conviene que no sea fácil de adivinar.</Hint>
      </FormGroup>
      <FormGroup>
        <Label as="span">Planes de pago que pueden elegir</Label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {PLANES_POSIBLES.map((n) => (
            <CheckLabel key={n}>
              <input type="checkbox" checked={valor.planes.includes(n)} onChange={() => togglePlan(n)} />
              {n === 1 ? 'Contado' : `${n} cuotas`}
            </CheckLabel>
          ))}
        </div>
      </FormGroup>
      <Row>
        <FormGroup><Label htmlFor="descuentoContado">Descuento contado en efectivo (%)</Label><Input id="descuentoContado" name="descuentoContado" type="number" min="0" max="50" step="0.5" value={valor.descuentoContado} onChange={cambiar} /></FormGroup>
        <FormGroup>
          <Label htmlFor="recargoTipo">Recargo por pago fuera de término</Label>
          <Select id="recargoTipo" name="recargoTipo" value={valor.recargoTipo} onChange={cambiar}>
            <option value="">Sin recargo</option>
            <option value="porcentaje">Porcentaje de la cuota</option>
            <option value="monto">Monto fijo</option>
          </Select>
        </FormGroup>
        {valor.recargoTipo && (
          <FormGroup><Label htmlFor="recargoValor">{valor.recargoTipo === 'porcentaje' ? 'Recargo (%)' : 'Recargo ($)'}</Label><Input id="recargoValor" name="recargoValor" type="number" min="0" step="0.5" value={valor.recargoValor} onChange={cambiar} required /></FormGroup>
        )}
      </Row>
      <Row>
        <FormGroup><Label htmlFor="primerVencimiento">Vencimiento de la cuota 1</Label><Input id="primerVencimiento" name="primerVencimiento" type="date" value={valor.primerVencimiento} onChange={cambiar} required /><Hint>Las demás vencen el mismo día de cada mes.</Hint></FormGroup>
        <FormGroup><Label htmlFor="fechaCierre">Cierre de la carga (opcional)</Label><Input id="fechaCierre" name="fechaCierre" type="date" value={valor.fechaCierre} onChange={cambiar} /><Hint>Después de esta fecha las familias no pueden cambiar prendas ni plan.</Hint></FormGroup>
      </Row>
      <ButtonGroup>
        {onCancel && <Button type="button" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" $primario disabled={guardando || valor.planes.length === 0}>{guardando ? 'Guardando...' : textoBoton}</Button>
      </ButtonGroup>
    </Form>
  );
};

const CuentaTransferencia = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/admin/egresados/cuenta').then((r) => setForm({ alias: '', cbu: '', titular: '', banco: '', cuit: '', ...r.data }))
      .catch((e) => setError(mensajeError(e)));
  }, []);
  if (!form) return error ? <ErrorBox>{error}</ErrorBox> : null;
  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put('/admin/egresados/cuenta', form);
      showToast('Cuenta guardada', 'success');
    } catch (err) {
      setError(mensajeError(err));
    }
  };
  return (
    <Form onSubmit={guardar}>
      {error && <ErrorBox role="alert">{error}</ErrorBox>}
      <Row>
        <FormGroup><Label htmlFor="alias">Alias</Label><Input id="alias" name="alias" value={form.alias || ''} onChange={cambiar} /></FormGroup>
        <FormGroup><Label htmlFor="cbu">CBU / CVU</Label><Input id="cbu" name="cbu" value={form.cbu || ''} onChange={cambiar} inputMode="numeric" maxLength={22} /></FormGroup>
      </Row>
      <Row>
        <FormGroup><Label htmlFor="titular">Titular</Label><Input id="titular" name="titular" value={form.titular || ''} onChange={cambiar} /></FormGroup>
        <FormGroup><Label htmlFor="cuit">CUIT (opcional)</Label><Input id="cuit" name="cuit" value={form.cuit || ''} onChange={cambiar} /></FormGroup>
        <FormGroup><Label htmlFor="banco">Banco</Label><Input id="banco" name="banco" value={form.banco || ''} onChange={cambiar} /></FormGroup>
      </Row>
      <Hint>Es la cuenta que ven las familias en la cuponera (distinta de la de la tienda).</Hint>
      <ButtonGroup><Button type="submit" $primario>Guardar cuenta</Button></ButtonGroup>
    </Form>
  );
};

const EgresadosAdmin = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [enviandoAvisos, setEnviandoAvisos] = useState(false);
  const enviarRecordatorios = async () => {
    setEnviandoAvisos(true);
    try {
      const { data } = await api.post('/admin/egresados/recordatorios');
      showToast(data.enviados || data.errores ? `Recordatorios: ${data.enviados} enviados${data.errores ? `, ${data.errores} con error` : ''}` : 'No había recordatorios pendientes', data.errores ? 'error' : 'success', 6000);
    } catch (err) {
      showToast(mensajeError(err), 'error', 8000);
    } finally {
      setEnviandoAvisos(false);
    }
  };
  const { data: promos, cargando, error } = useRecurso('/admin/egresados/promos', { porDefecto: [] });
  const { data: porRevisar } = useRecurso('/admin/egresados/comprobantes?estado=pendiente', { porDefecto: [] });
  const { data: pedidosNuevos } = useRecurso('/admin/egresados/presupuestos?estado=nuevo', { porDefecto: [] });
  const [form, setForm] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const crear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      const { data } = await api.post('/admin/egresados/promos', aPayloadPromo(form));
      navigate(`/admin/dashboard/egresados/${data.id}`);
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo crear la promo'));
      setGuardando(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Egresados</Title>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button as={Link} to="/admin/dashboard/egresados/presupuestos" $primario={pedidosNuevos.length > 0}>
            <FaPalette /> Presupuestos{pedidosNuevos.length ? ` (${pedidosNuevos.length} nuevos)` : ''}
          </Button>
          <Button as={Link} to="/admin/dashboard/egresados/comprobantes" $primario={porRevisar.length > 0}>
            <FaReceipt /> Comprobantes{porRevisar.length ? ` (${porRevisar.length} por revisar)` : ''}
          </Button>
          <Button as={Link} to="/admin/dashboard/egresados/cobrar"><FaCashRegister /> Registrar pago</Button>
          <Button onClick={enviarRecordatorios} disabled={enviandoAvisos} title="Se envían solos cada hora; con este botón salen ahora"><FaEnvelope /> {enviandoAvisos ? 'Enviando...' : 'Enviar recordatorios'}</Button>
          {!form && <Button $primario onClick={() => setForm(VACIO_PROMO)}><FaPlus /> Nueva promo</Button>}
        </div>
      </Header>

      {form && (
        <Seccion>
          <h2>Nueva promo</h2>
          <FormPromo valor={form} onChange={setForm} onSubmit={crear} onCancel={() => setForm(null)} guardando={guardando} error={errorForm} textoBoton="Crear promo" />
        </Seccion>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}
      <Seccion>
        <h2>Promos</h2>
        {cargando ? <Empty>Cargando...</Empty> : promos.length === 0 ? <Empty>Todavía no hay promos. Creá la primera con “Nueva promo”.</Empty> : (
          <TablaScroll>
            <Tabla>
              <thead>
                <tr><th>Promo</th><th>Estado</th><th className="num">Alumnos</th><th className="num">Con plan</th><th className="num">Cuota 1</th><th className="num">Vencidas</th><th className="num">Cobrado</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.55 }}>
                    <td><Link to={`/admin/dashboard/egresados/${p.id}`}><strong>{p.colegio}</strong> · {p.curso} · {p.anio}</Link><br /><small>{p.codigo}</small></td>
                    <td>{p.activo ? ESTADOS_PRODUCCION[p.estadoProduccion] : 'Inactiva'}</td>
                    <td className="num">{p.resumen.alumnos}</td>
                    <td className="num">{p.resumen.plan}</td>
                    <td className="num">{p.resumen.sena}</td>
                    <td className="num" style={{ color: p.resumen.vencidas ? '#c0392b' : undefined }}>{p.resumen.vencidas}</td>
                    <td className="num">{pesos(p.resumen.cobrado)}</td>
                    <td className="num">{pesos(p.resumen.total)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </TablaScroll>
        )}
      </Seccion>

      <Seccion>
        <h2>Cuenta para transferencias de egresados</h2>
        <CuentaTransferencia />
      </Seccion>
    </Container>
  );
};

export default EgresadosAdmin;
