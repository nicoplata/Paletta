import { Link } from 'react-router-dom';

const NotFound = () => (
  <div style={{ marginTop: 125, padding: '3rem 1rem', textAlign: 'center', fontFamily: 'opensans, Arial, sans-serif' }}>
    <h1 style={{ color: '#9c1f23' }}>Página no encontrada</h1>
    <p>La página que buscás no existe o fue movida.</p>
    <Link to="/" style={{ color: '#9c1f23', fontWeight: 700 }}>Volver al inicio</Link>
  </div>
);

export default NotFound;
