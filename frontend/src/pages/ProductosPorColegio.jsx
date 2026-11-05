import { Link, useParams } from 'react-router-dom';
import ProductList from '../components/ProductList';
import { useColegio, useProductosDeColegio } from '../hooks/useCatalogo';
import useSeo from '../hooks/useSeo';
import NotFound from './NotFound';
import '../styles/ProductListPage.css';

const ProductosPorColegio = () => {
  const { id } = useParams();
  const { data: colegio, loading: cargandoColegio, errorMensaje: errorColegio } = useColegio(id);
  const { data: productos, loading, errorMensaje } = useProductosDeColegio(id);

  useSeo({
    titulo: colegio ? `Uniformes ${colegio.nombre}` : 'Uniformes por colegio',
    descripcion: colegio
      ? `Uniformes y prendas de ${colegio.nombre}${colegio.ciudad ? ` (${colegio.ciudad})` : ''}: ${productos.slice(0, 4).map((p) => p.nombre).join(', ') || 'consultá disponibilidad'}. Paletta, Munro.`
      : undefined,
    ruta: `/colegios/${id}/productos`,
    imagen: colegio?.imagenes?.[0]?.url,
  });

  if (!cargandoColegio && errorColegio) return <NotFound />;

  return (
    <div className="pagina">
      <Link to="/colegios" className="volver">← Ver todos los colegios</Link>
      <h1 className="pagina-titulo">{colegio ? `Uniformes de ${colegio.nombre}` : 'Productos'}</h1>
      <ProductList productos={productos} loading={loading} error={errorMensaje} mostrarColegio={false} />
    </div>
  );
};

export default ProductosPorColegio;
