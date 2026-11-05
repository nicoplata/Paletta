import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import useRecurso from '../../hooks/useRecurso';
import { useToast } from '../../context/ToastContext';
import ProductoCard from '../../components/ProductoCard';
import { Button, Container, Empty, ErrorBox, Grid, Header, Input, Title } from './adminUI';

const ProductosAdmin = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: productos, cargando, error, recargar } = useRecurso('/productos', { porDefecto: [] });
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) =>
      [p.nombre, p.colegio?.nombre, p.categoria?.nombre].some((v) => v?.toLowerCase().includes(q))
    );
  }, [productos, busqueda]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este producto y sus imágenes? Si solo querés ocultarlo, editalo y desmarcá "Visible".')) return;
    try {
      await api.delete(`/productos/${id}`);
      showToast('Producto eliminado', 'success');
      recargar();
    } catch (err) {
      showToast(mensajeError(err, 'Error al eliminar el producto'), 'error', 5000);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Productos</Title>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Input type="search" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar productos" />
          <Button $primario onClick={() => navigate('/admin/dashboard/productos/nuevo')}>
            <FaPlus /> Nuevo producto
          </Button>
        </div>
      </Header>
      {error && <ErrorBox>{error}</ErrorBox>}
      <Grid>
        {cargando ? <Empty>Cargando...</Empty> : filtrados.length === 0 ? <Empty>No hay productos.</Empty> : (
          filtrados.map((producto) => (
            <ProductoCard
              key={producto.id}
              producto={producto}
              onEdit={() => navigate(`/admin/dashboard/productos/${producto.id}/editar`)}
              onDelete={handleDelete}
            />
          ))
        )}
      </Grid>
    </Container>
  );
};

export default ProductosAdmin;
