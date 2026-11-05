import { Link } from 'react-router-dom';
import useSeo from '../hooks/useSeo';
import '../styles/Secciones.css';

const NotFound = () => {
  useSeo({ titulo: 'Página no encontrada', noindex: true });
  return (
    <div className="pagina angosta no-encontrada">
      <h1 className="pagina-titulo">Página no encontrada</h1>
      <p>La página que buscás no existe o fue movida.</p>
      <Link to="/" className="btn">Volver al inicio</Link>
    </div>
  );
};

export default NotFound;
