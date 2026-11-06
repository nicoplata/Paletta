import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaSearch } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import { Button, Container, Empty, ErrorBox, Header, Hint, Input, Title } from '../adminUI';
import CuotasAlumno from './CuotasAlumno';
import { Seccion, nombrePlan, pesos } from './comun';

// Mostrador: buscar por código de cuota, DNI o nombre y registrar el pago.
const CobranzaEgresadosAdmin = () => {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState('');

  const buscar = async (e) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setError('');
    try {
      const { data } = await api.get('/admin/egresados/buscar', { params: { q: q.trim() } });
      setResultados(data);
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const actualizar = (alumno) => setResultados((rs) => rs.map((r) => (r.id === alumno.id ? { ...r, ...alumno } : r)));

  return (
    <Container>
      <Header>
        <div>
          <Link to="/admin/dashboard/egresados" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}><FaArrowLeft /> Egresados</Link>
          <Title>Registrar pago</Title>
        </div>
      </Header>
      <Seccion>
        <form onSubmit={buscar} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código (EGR-27-014-07-2), DNI o nombre" aria-label="Buscar alumno" style={{ flex: 1, minWidth: 240 }} autoFocus />
          <Button type="submit" $primario><FaSearch /> Buscar</Button>
        </form>
        <Hint style={{ marginTop: 8 }}>El código está en la cuponera de la familia y en el concepto de las transferencias.</Hint>
      </Seccion>
      {error && <ErrorBox>{error}</ErrorBox>}
      {resultados && resultados.length === 0 && <Empty>No encontramos alumnos con esa búsqueda.</Empty>}
      {resultados && resultados.map((a) => (
        <Seccion key={a.id}>
          <h2>
            <Link to={`/admin/dashboard/egresados/alumnos/${a.id}`}>{a.nombre}</Link>
            <small style={{ fontWeight: 400, color: '#7f8c8d' }}> · {a.promo.colegio} {a.promo.curso} {a.promo.anio} · {a.codigo}</small>
          </h2>
          <p style={{ marginTop: 0 }}>
            {nombrePlan(a.plan)} · Total {pesos(a.totales.total)} · Pagado {pesos(a.totales.pagado)} · <strong>Saldo {pesos(a.totales.saldo)}</strong>
          </p>
          <CuotasAlumno alumno={a} onCambio={actualizar} resaltar={a.cuotaBuscada} />
        </Seccion>
      ))}
    </Container>
  );
};

export default CobranzaEgresadosAdmin;
