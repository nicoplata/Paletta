import { useState } from 'react';
import { FaLock } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import useRecurso from '../../hooks/useRecurso';
import { Button, CheckLabel, Container, Empty, ErrorBox, Header, Hint, Tag, Title } from './adminUI';
import { Tabla, TablaScroll } from './egresados/comun';

const fechaHora = (iso) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

// Registro de actividad: quién hizo qué y cuándo (solo lo ve el administrador)
const ActividadAdmin = () => {
  const [sensibles, setSensibles] = useState(false);
  const { data, setData, cargando, error } = useRecurso(`/admin/actividad${sensibles ? '?sensibles=true' : ''}`, { porDefecto: [] });
  const [masError, setMasError] = useState('');
  const [hayMas, setHayMas] = useState(true);

  const verMas = async () => {
    setMasError('');
    try {
      const ultimo = data[data.length - 1];
      const { data: mas } = await api.get(`/admin/actividad?antesDe=${ultimo.id}${sensibles ? '&sensibles=true' : ''}`);
      setData([...data, ...mas]);
      if (mas.length < 100) setHayMas(false);
    } catch (err) {
      setMasError(mensajeError(err));
    }
  };

  return (
    <Container>
      <Header>
        <Title>Actividad</Title>
        <CheckLabel><input type="checkbox" checked={sensibles} onChange={(e) => { setSensibles(e.target.checked); setHayMas(true); }} /> Solo acciones sensibles</CheckLabel>
      </Header>
      <Hint style={{ marginBottom: 14 }}>Quién hizo qué en el panel. Las acciones sensibles (borrados, pagos anulados, usuarios, datos bancarios) piden la contraseña y se marcan con un candado.</Hint>
      {error && <ErrorBox>{error}</ErrorBox>}
      {cargando && !data.length ? <Empty>Cargando...</Empty> : data.length === 0 ? <Empty>Todavía no hay actividad registrada.</Empty> : (
        <>
          <TablaScroll>
            <Tabla>
              <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué hizo</th></tr></thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(a.createdAt)}</td>
                    <td>{a.usuarioNombre || 'Sistema'}{a.rol && <><br /><Tag $color={a.rol === 'administrador' ? 'var(--color-primario)' : '#2980b9'}>{a.rol === 'encargado' ? 'Encargado/a' : a.rol}</Tag></>}</td>
                    <td>{a.sensible && <FaLock title="Acción sensible" aria-label="Acción sensible" style={{ color: '#c0392b', marginRight: 6 }} />}{a.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </TablaScroll>
          {masError && <ErrorBox>{masError}</ErrorBox>}
          {hayMas && data.length >= 100 && <Button type="button" onClick={verMas} style={{ marginTop: 12 }}>Ver más</Button>}
        </>
      )}
    </Container>
  );
};

export default ActividadAdmin;
