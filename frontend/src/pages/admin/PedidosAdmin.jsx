import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { FaFileExcel } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { formatearPrecio } from '../../config';
import { useToast } from '../../context/ToastContext';
import useRecurso from '../../hooks/useRecurso';
import { ESTADOS } from '../PedidoEstado';
import { Button, Container, Empty, ErrorBox, Header, Input, Select, Tag, Title } from './adminUI';

export const COLOR_ESTADO = {
  pendiente_pago: '#f39c12',
  pagado: '#27ae60',
  en_preparacion: '#2980b9',
  listo_para_retirar: '#8e44ad',
  enviado: '#16a085',
  entregado: '#7f8c8d',
  cancelado: 'var(--color-primario-oscuro)',
};

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;

  th, td {
    text-align: left;
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }

  th { color: #7f8c8d; font-weight: 600; font-size: 0.85rem; }
  tbody tr:hover { background: #fafafa; }
  a { color: #2c3e50; font-weight: 600; white-space: nowrap; }

  @media (max-width: 800px) {
    thead { display: none; }
    tr { display: block; border-bottom: 1px solid #eee; padding: 0.5rem 0; }
    td { display: block; border: none; padding: 0.2rem 0; }
  }
`;

const Resumen = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const Tarjeta = styled.button`
  background: ${({ $activa }) => ($activa ? 'var(--color-primario-suave)' : '#fff')};
  border: 2px solid ${({ $activa }) => ($activa ? 'var(--color-primario)' : '#eee')};
  border-radius: 10px;
  padding: 0.9rem;
  text-align: left;
  cursor: pointer;
  font: inherit;

  strong { display: block; font-size: 1.4rem; color: #2c3e50; }
  span { color: #7f8c8d; font-size: 0.85rem; }
`;

const fecha = (iso) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

const PedidosAdmin = () => {
  const [params, setParams] = useSearchParams();
  const estado = params.get('estado') || '';
  const [busqueda, setBusqueda] = useState(params.get('q') || '');
  const [q, setQ] = useState(busqueda);

  // Pequeño debounce para la búsqueda
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const query = new URLSearchParams({ ...(estado ? { estado } : {}), ...(q ? { q } : {}) }).toString();
  const { data: pedidos, cargando, error } = useRecurso(`/admin/pedidos${query ? `?${query}` : ''}`, { porDefecto: [] });
  const { data: resumen } = useRecurso('/admin/pedidos/resumen');

  const filtrar = (nuevo) => {
    const p = new URLSearchParams(params);
    if (nuevo) p.set('estado', nuevo);
    else p.delete('estado');
    setParams(p, { replace: true });
  };

  const contar = (e) => resumen?.porEstado?.[e] || 0;

  const { showToast } = useToast();
  const [exportando, setExportando] = useState(false);
  // La descarga necesita el token, así que se pide con el cliente de la API y se arma el archivo acá
  const exportar = async (detalle) => {
    setExportando(true);
    try {
      const { data, headers } = await api.get('/admin/pedidos/exportar', {
        params: { detalle, ...(estado ? { estado } : {}) },
        responseType: 'blob',
      });
      const nombre = /filename="([^"]+)"/.exec(headers['content-disposition'] || '')?.[1] || `pedidos-${detalle}.csv`;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(mensajeError(err, 'No se pudo exportar'), 'error');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Pedidos</Title>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Input type="search" placeholder="N.º, nombre o email" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar pedidos" />
          <Select value={estado} onChange={(e) => filtrar(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Button type="button" onClick={() => exportar('pedidos')} disabled={exportando} title="Un renglón por pedido (para administración)">
            <FaFileExcel /> Exportar pedidos
          </Button>
          <Button type="button" onClick={() => exportar('items')} disabled={exportando} title="Un renglón por prenda con talle y cantidad (para producción)">
            <FaFileExcel /> Exportar prendas
          </Button>
        </div>
      </Header>

      {resumen && (
        <Resumen>
          <Tarjeta type="button" $activa={estado === 'pagado'} onClick={() => filtrar('pagado')}>
            <strong>{contar('pagado')}</strong><span>Pagados para preparar</span>
          </Tarjeta>
          <Tarjeta type="button" $activa={estado === 'en_preparacion'} onClick={() => filtrar('en_preparacion')}>
            <strong>{contar('en_preparacion')}</strong><span>En preparación</span>
          </Tarjeta>
          <Tarjeta type="button" $activa={estado === 'pendiente_pago'} onClick={() => filtrar('pendiente_pago')}>
            <strong>{contar('pendiente_pago')}</strong><span>Esperando pago</span>
          </Tarjeta>
          <Tarjeta type="button" as="div">
            <strong>{formatearPrecio(resumen.mes.total)}</strong><span>Vendido este mes ({resumen.mes.cantidad})</span>
          </Tarjeta>
        </Resumen>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}
      {cargando ? <Empty>Cargando...</Empty> : pedidos.length === 0 ? <Empty>No hay pedidos.</Empty> : (
        <Tabla>
          <thead>
            <tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Entrega</th><th>Pago</th><th>Total</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/admin/dashboard/pedidos/${p.id}`}>{p.numero}</Link></td>
                <td>{fecha(p.createdAt)}</td>
                <td>{p.nombre}<br /><small>{p.email}</small></td>
                <td>{p.tipoEntrega === 'retiro' ? 'Retiro' : `Envío · ${p.ciudad}`}</td>
                <td>{p.metodoPago === 'mercadopago' ? 'Mercado Pago' : 'Transferencia'}</td>
                <td>{formatearPrecio(p.total)}</td>
                <td><Tag $color={COLOR_ESTADO[p.estado]}>{ESTADOS[p.estado]}</Tag></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </Container>
  );
};

export default PedidosAdmin;
