import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// roles: los roles que pueden entrar (por defecto, el equipo del panel). Si no puede, va a "redirigir".
const RutaProtegida = ({ children, roles = ['administrador', 'encargado'], redirigir = '/' }) => {
  const { usuario, cargando } = useAuth();

  if (cargando) return <div style={{ padding: '2rem' }}>Verificando sesión...</div>;
  if (!usuario) return <Navigate to="/admin" replace />;
  if (!roles.includes(usuario.rol)) return <Navigate to={redirigir} replace />;

  return children;
};

export default RutaProtegida;
