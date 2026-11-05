import { Link, useParams } from 'react-router-dom';
import ProductList from '../components/ProductList';
import { useColegio, useProductosDeColegio } from '../hooks/useCatalogo';
import '../styles/ProductListPage.css';

const ProductosPorColegio = () => {
  const { id } = useParams();
  const { data: colegio, loading: cargandoColegio, errorMensaje: errorColegio } = useColegio(id);
  const { data: productos, loading, errorMensaje } = useProductosDeColegio(id);

  if (!cargandoColegio && errorColegio) {
    return <p style={{ marginTop: 125, padding: '2rem', textAlign: 'center' }}>Colegio no encontrado.</p>;
  }

  return (
    <div style={{ marginTop: 125, padding: '0 1rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Link to="/colegios" style={{ color: '#9c1f23' }}>← Ver todos los colegios</Link>
        <h1 style={{ color: '#9c1f23', margin: '1rem 0 1.5rem' }}>
          {colegio ? `Productos de ${colegio.nombre}` : 'Productos'}
        </h1>
        <ProductList productos={productos} loading={loading} error={errorMensaje} mostrarColegio={false} />
      </div>
    </div>
  );
};

export default ProductosPorColegio;
