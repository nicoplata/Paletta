import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import { ToastProvider } from './context/ToastContext';
import RutaProtegida from './routes/RutaProtegida';
import LayoutGeneral from './layouts/LayoutGeneral';
import LoadingSpinner from './components/common/LoadingSpinner';

// Sitio público
const SelectorColegiosHome = lazy(() => import('./components/SelectorColegiosHome'));
const ProductListHome = lazy(() => import('./components/ProductListHome'));
const Egresados = lazy(() => import('./components/Egresados'));
const Contact = lazy(() => import('./components/Contact'));
const Carousel = lazy(() => import('./components/Carousel'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const SelectorColegios = lazy(() => import('./pages/SelectorColegios'));
const ProductosPorColegio = lazy(() => import('./pages/ProductosPorColegio'));
const DetalleProducto = lazy(() => import('./pages/DetalleProducto'));
const EgresadosPage = lazy(() => import('./pages/EgresadosPage'));
const ContactoPage = lazy(() => import('./pages/ContactoPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Panel de administración
const LoginAdmin = lazy(() => import('./pages/admin/LoginAdmin'));
const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'));
const ProductosAdmin = lazy(() => import('./pages/admin/ProductosAdmin'));
const EditarProducto = lazy(() => import('./pages/admin/EditarProducto'));
const CategoriasAdmin = lazy(() => import('./pages/admin/CategoriasAdmin'));
const EditarCategoria = lazy(() => import('./pages/admin/EditarCategoria'));
const ColegiosAdmin = lazy(() => import('./pages/admin/ColegiosAdmin'));
const EditarColegio = lazy(() => import('./pages/admin/EditarColegio'));
const UsuariosAdmin = lazy(() => import('./pages/admin/UsuariosAdmin'));
const EditarUsuario = lazy(() => import('./pages/admin/EditarUsuario'));
const MensajesAdmin = lazy(() => import('./pages/admin/MensajesAdmin'));

const App = () => (
  <AuthProvider>
    <CarritoProvider>
      <ToastProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Sitio público con Header y Footer */}
            <Route path="/" element={<LayoutGeneral />}>
              <Route
                index
                element={
                  <>
                    <Carousel />
                    <SelectorColegiosHome />
                    <ProductListHome />
                    <Egresados />
                    <Contact />
                  </>
                }
              />
              <Route path="productos" element={<ProductListPage />} />
              <Route path="colegios" element={<SelectorColegios />} />
              <Route path="colegios/:id/productos" element={<ProductosPorColegio />} />
              <Route path="producto/:id" element={<DetalleProducto />} />
              <Route path="egresados" element={<EgresadosPage />} />
              <Route path="contacto" element={<ContactoPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Login del panel (sin layout) */}
            <Route path="/admin" element={<LoginAdmin />} />

            {/* Panel protegido */}
            <Route
              path="/admin/dashboard"
              element={
                <RutaProtegida rolRequerido="administrador">
                  <DashboardAdmin />
                </RutaProtegida>
              }
            >
              <Route index element={<Navigate to="productos" replace />} />
              <Route path="productos" element={<ProductosAdmin />} />
              <Route path="productos/nuevo" element={<EditarProducto />} />
              <Route path="productos/:id/editar" element={<EditarProducto />} />
              <Route path="categorias" element={<CategoriasAdmin />} />
              <Route path="categorias/nuevo" element={<EditarCategoria />} />
              <Route path="categorias/:id/editar" element={<EditarCategoria />} />
              <Route path="colegios" element={<ColegiosAdmin />} />
              <Route path="colegios/nuevo" element={<EditarColegio />} />
              <Route path="colegios/:id/editar" element={<EditarColegio />} />
              <Route path="usuarios" element={<UsuariosAdmin />} />
              <Route path="usuarios/nuevo" element={<EditarUsuario />} />
              <Route path="usuarios/:id/editar" element={<EditarUsuario />} />
              <Route path="mensajes" element={<MensajesAdmin />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </CarritoProvider>
  </AuthProvider>
);

export default App;
