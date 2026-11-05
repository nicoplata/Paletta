import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RutaProtegida = ({ children, rolRequerido }) => {
  const { usuario, cargando } = useAuth();

  if (cargando) return <div style={{ padding: '2rem' }}>Verificando sesión...</div>;
  if (!usuario) return <Navigate to="/admin" replace />;
  if (rolRequerido && usuario.rol !== rolRequerido) return <Navigate to="/" replace />;

  return children;
};

export default RutaProtegida;
