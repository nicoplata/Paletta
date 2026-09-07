import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { RutaProtegida } from '../components/RutaProtegida';

const LoginAdmin = lazy(() => import('../pages/admin/LoginAdmin'));
const DashboardAdmin = lazy(() => import('../pages/admin/DashboardAdmin'));
const CategoriasAdmin = lazy(() => import('../pages/admin/CategoriasAdmin'));
// ...other admin imports...

const AdminRoutes = () => {
  return (
    <Routes>
      <Route index element={<LoginAdmin />} />
      <Route
        path="dashboard/*"
        element={
          <RutaProtegida rolRequerido="administrador">
            <DashboardAdmin />
          </RutaProtegida>
        }
      >
        <Route path="categorias" element={<CategoriasAdmin />} />
        {/* ...other admin routes... */}
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
