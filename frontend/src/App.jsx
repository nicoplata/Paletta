import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import { ToastProvider } from './context/ToastContext';
import RutaProtegida from './routes/RutaProtegida'; // Actualizar esta línea
import LayoutGeneral from './layouts/LayoutGeneral';

// Lazy loaded components
const SelectorColegiosHome = lazy(() => import('./components/SelectorColegiosHome'));
const ProductListHome = lazy(() => import('./components/ProductListHome'));
const Egresados = lazy(() => import('./components/Egresados'));
const Contact = lazy(() => import('./components/Contact'));
const Carousel = lazy(() => import('./components/Carousel'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const SelectorColegios = lazy(() => import('./components/SelectorColegios.jsx'));
const DetalleProducto = lazy(() => import('./pages/DetalleProducto'));
const EgresadosPage = lazy(() => import('./pages/EgresadosPage'));
const ContactoPage = lazy(() => import('./pages/ContactoPage'));
const LoginAdmin = lazy(() => import('./pages/admin/LoginAdmin'));
const DashboardAdmin = lazy(() => import('./pages/admin/DashboardAdmin'));
const CategoriasAdmin = lazy(() => import('./pages/admin/CategoriasAdmin'));
const ProductosAdmin = lazy(() => import('./pages/admin/ProductosAdmin'));
const ColegiosAdmin = lazy(() => import('./pages/admin/ColegiosAdmin'));
const UsuariosAdmin = lazy(() => import('./pages/admin/UsuariosAdmin'));
const EditarProducto = lazy(() => import('./pages/admin/EditarProducto'));

const App = () => {
  return (
    <AuthProvider>
      <CarritoProvider>
        <ToastProvider>
          <Suspense fallback={<div>Cargando...</div>}>
            <Routes>
              {/* Rutas públicas con Header y Footer */}
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
                <Route path="/productos" element={<ProductListPage />} />
                <Route path="/colegios" element={<SelectorColegios />} />
                <Route path="/producto/:id" element={<DetalleProducto />} />
                <Route path="/egresados" element={<EgresadosPage />} />
                <Route path="/contacto" element={<ContactoPage />} />
              </Route>

              {/* Login sin layout */}
              <Route path="/admin" element={<LoginAdmin />} />

              {/* Rutas protegidas del dashboard */}
              <Route
                path="/admin/dashboard"
                element={
                  <RutaProtegida rolRequerido="administrador">
                    <DashboardAdmin />
                  </RutaProtegida>
                }
              >
                <Route path="categorias" element={<CategoriasAdmin />} />
                <Route
                  path="productos"
                  element={
                    <Suspense fallback={<div>Cargando productos...</div>}>
                      <ProductosAdmin />
                    </Suspense>
                  }
                />
                <Route path="productos/nuevo" element={<EditarProducto />} />
                <Route path="productos/:id/editar" element={<EditarProducto />} />
                <Route path="colegios" element={<ColegiosAdmin />} />
                <Route path="usuarios" element={<UsuariosAdmin />} />
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </CarritoProvider>
    </AuthProvider>
  );
};

export default App;

