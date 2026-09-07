import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const RutaProtegida = ({ children, rolRequerido }) => {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/admin" replace />;
  }

  if (rolRequerido && usuario.rol !== rolRequerido) {
    return <Navigate to="/" replace />;
  }

  return children;
};
