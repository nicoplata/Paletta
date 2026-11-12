import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { useEsAdmin } from '../../../context/AuthContext';
import {
  Button, ButtonGroup, Container, Empty, ErrorBox, Form, FormGroup, Header, Hint, IconButton, Input, Label, Row, Select, Title,
} from '../adminUI';
import CuotasAlumno from './CuotasAlumno';
import { Cifras, Puntos, Seccion, Tabla, TablaScroll, fecha, nombrePlan, pesos } from './comun';

const aForm = (a) => ({
  nombre: a.nombre,
  dni: a.dni || '',
  responsableNombre: a.responsableNombre || '',
  responsableEmail: a.responsableEmail || '',
  responsableTelefono: a.responsableTelefono || '',
  plan: a.plan ? String(a.plan) : '',
  ajuste: String(a.ajuste || 0),
  ajusteMotivo: a.ajusteMotivo || '',
});

const AlumnoEgresadosAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const esAdmin = useEsAdmin();
  const { data, setData, cargando, error } = useRecurso(`/admin/egresados/alumnos/${id}`);
  const [form, setForm] = useState(null);
  const [items, setItems] = useState(null);
  const [errorDatos, setErrorDatos] = useState('');
  const [errorPrendas, setErrorPrendas] = useState('');

  useEffect(() => {
    if (!data) return;
    setForm(aForm(data));
    setItems(data.selecciones.map((s) => ({ prendaId: s.prendaId, talle: s.talle, bordado: s.bordado || '', cantidad: s.cantidad })));
  }, [data]);

  if (cargando && !data) return <Container><Empty>Cargando...</Empty></Container>;
  if (error) return <Container><ErrorBox>{error}</ErrorBox></Container>;
  if (!data || !form || !items) return null;

  const actualizar = (resumen) => setData((d) => ({ ...d, ...resumen }));
  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardarDatos = async (e) => {
    e.preventDefault();
    setErrorDatos('');
    try {
      const { data: r } = await api.put(`/admin/egresados/alumnos/${id}`, {
        ...form,
        plan: form.plan ? Number(form.plan) : null,
        ajuste: Number(form.ajuste || 0),
      });
      actualizar(r);
      showToast('Alumno actualizado', 'success');
    } catch (err) {
      setErrorDatos(mensajeError(err));
    }
  };

  const guardarPrendas = async () => {
    setErrorPrendas('');
    try {
      const { data: r } = await api.put(`/admin/egresados/alumnos/${id}/prendas`, { items });
      actualizar(r);
      showToast('Prendas actualizadas', 'success');
    } catch (err) {
      setErrorPrendas(mensajeError(err));
    }
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar a ${data.nombre} de la promo?`)) return;
    try {
      await api.delete(`/admin/egresados/alumnos/${id}`);
      navigate(`/admin/dashboard/egresados/${data.promo.id}`);
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const prendaDe = (prendaId) => data.prendas.find((p) => p.id === Number(prendaId));
  const cambiarItem = (i, campo, valor) => setItems(items.map((it, j) => (j === i ? { ...it, [campo]: valor } : it)));
  const planes = [...new Set([...data.promo.planes, ...(data.plan ? [data.plan] : [])])].sort((a, b) => a - b);

  return (
    <Container>
      <Header>
        <div>
          <Link to={`/admin/dashboard/egresados/${data.promo.id}`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <FaArrowLeft /> {data.promo.colegio} · {data.promo.curso} · {data.promo.anio}
          </Link>
          <Title>{data.nombre}</Title>
          <Hint>{data.codigo} · último ingreso: {data.ultimoIngreso ? new Date(data.ultimoIngreso).toLocaleString('es-AR') : 'nunca'}</Hint>
        </div>
        {esAdmin && <Button onClick={eliminar}><FaTrash /> Eliminar</Button>}
      </Header>

      <Cifras>
        <div><span>Avance</span><b><Puntos progreso={data.progreso} /></b></div>
        <div><span>Plan</span><b>{nombrePlan(data.plan)}</b></div>
        <div><span>Total</span><b>{pesos(data.totales.total)}</b></div>
        <div><span>Pagado</span><b>{pesos(data.totales.pagado)}</b></div>
        <div><span>Saldo</span><b>{pesos(data.totales.saldo)}</b></div>
      </Cifras>
      {data.pendientes.length > 0 && <ErrorBox style={{ marginBottom: '1.5rem' }}>Pendiente: {data.pendientes.join(' · ')}</ErrorBox>}

      <Seccion>
        <h2>Cuotas</h2>
        <CuotasAlumno alumno={data} onCambio={actualizar} />
      </Seccion>

      <Seccion>
        <h2>Prendas elegidas</h2>
        {errorPrendas && <ErrorBox role="alert" style={{ marginBottom: 12 }}>{errorPrendas}</ErrorBox>}
        {items.length === 0 ? <Empty>Todavía no eligió prendas.</Empty> : (
          <TablaScroll>
            <Tabla>
              <thead><tr><th>Prenda</th><th>Talle</th><th>Bordado</th><th>Cant.</th><th className="num">Precio</th><th /></tr></thead>
              <tbody>
                {items.map((it, i) => {
                  const p = prendaDe(it.prendaId);
                  return (
                    <tr key={i}>
                      <td>
                        <Select aria-label="Prenda" value={it.prendaId} onChange={(e) => cambiarItem(i, 'prendaId', Number(e.target.value))}>
                          {data.prendas.map((x) => <option key={x.id} value={x.id}>{x.nombre}{x.activo ? '' : ' (no disponible)'}</option>)}
                        </Select>
                      </td>
                      <td>
                        <Select aria-label="Talle" value={it.talle} onChange={(e) => cambiarItem(i, 'talle', e.target.value)}>
                          <option value="">-</option>
                          {(p?.talles || []).map((t) => <option key={t} value={t}>{t}</option>)}
                        </Select>
                      </td>
                      <td>{p?.conBordado ? <Input aria-label="Bordado" value={it.bordado} maxLength={20} onChange={(e) => cambiarItem(i, 'bordado', e.target.value.toUpperCase())} /> : '-'}</td>
                      <td><Input aria-label="Cantidad" type="number" min="1" max="10" value={it.cantidad} onChange={(e) => cambiarItem(i, 'cantidad', Number(e.target.value))} style={{ width: 70 }} /></td>
                      <td className="num">{p ? pesos(p.precio * it.cantidad) : '-'}</td>
                      <td><IconButton $peligro onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Quitar"><FaTrash /></IconButton></td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          </TablaScroll>
        )}
        <ButtonGroup style={{ justifyContent: 'flex-start', marginTop: 12 }}>
          {data.prendas.length > 0 && <Button type="button" onClick={() => setItems([...items, { prendaId: data.prendas[0].id, talle: '', bordado: '', cantidad: 1 }])}><FaPlus /> Agregar prenda</Button>}
          <Button type="button" $primario onClick={guardarPrendas}>Guardar prendas</Button>
        </ButtonGroup>
        <Hint style={{ marginTop: 8 }}>Desde el panel podés cambiar prendas aunque haya pagos o la carga esté cerrada. Las cuotas pendientes se recalculan solas.</Hint>
      </Seccion>

      <Seccion>
        <h2>Datos, plan y ajuste</h2>
        <Form onSubmit={guardarDatos}>
          {errorDatos && <ErrorBox role="alert">{errorDatos}</ErrorBox>}
          <Row>
            <FormGroup><Label htmlFor="nombre">Nombre y apellido</Label><Input id="nombre" name="nombre" value={form.nombre} onChange={cambiar} required minLength={3} /></FormGroup>
            <FormGroup><Label htmlFor="dni">DNI</Label><Input id="dni" name="dni" value={form.dni} onChange={cambiar} inputMode="numeric" maxLength={10} /><Hint>Borralo para que la familia lo vuelva a registrar.</Hint></FormGroup>
          </Row>
          <Row>
            <FormGroup><Label htmlFor="responsableNombre">Adulto responsable</Label><Input id="responsableNombre" name="responsableNombre" value={form.responsableNombre} onChange={cambiar} /></FormGroup>
            <FormGroup><Label htmlFor="responsableTelefono">WhatsApp</Label><Input id="responsableTelefono" name="responsableTelefono" value={form.responsableTelefono} onChange={cambiar} /></FormGroup>
            <FormGroup><Label htmlFor="responsableEmail">Email</Label><Input id="responsableEmail" name="responsableEmail" type="email" value={form.responsableEmail} onChange={cambiar} /></FormGroup>
          </Row>
          <Row>
            <FormGroup>
              <Label htmlFor="plan">Plan</Label>
              <Select id="plan" name="plan" value={form.plan} onChange={cambiar}>
                <option value="">Sin elegir</option>
                {planes.map((n) => <option key={n} value={n}>{nombrePlan(n)}</option>)}
              </Select>
            </FormGroup>
            <FormGroup><Label htmlFor="ajuste">Ajuste del total ($)</Label><Input id="ajuste" name="ajuste" type="number" step="1" value={form.ajuste} onChange={cambiar} /><Hint>Positivo suma, negativo descuenta.</Hint></FormGroup>
            <FormGroup><Label htmlFor="ajusteMotivo">Motivo del ajuste (lo ve la familia)</Label><Input id="ajusteMotivo" name="ajusteMotivo" value={form.ajusteMotivo} onChange={cambiar} maxLength={255} /></FormGroup>
          </Row>
          <ButtonGroup><Button type="submit" $primario>Guardar</Button></ButtonGroup>
        </Form>
        {data.cuotas.length > 0 && <Hint style={{ marginTop: 8 }}>Primer vencimiento actual: {fecha(data.cuotas[0].vencimiento)}.</Hint>}
      </Seccion>
    </Container>
  );
};

export default AlumnoEgresadosAdmin;
