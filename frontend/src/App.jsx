import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import { ToastProvider } from './context/ToastContext';
import RutaProtegida from './routes/RutaProtegida';
import LayoutGeneral from './layouts/LayoutGeneral';
import LoadingSpinner from './components/common/LoadingSpinner';

// Sitio público
const Inicio = lazy(() => import('./pages/Inicio'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const SelectorColegios = lazy(() => import('./pages/SelectorColegios'));
const ProductosPorColegio = lazy(() => import('./pages/ProductosPorColegio'));
const DetalleProducto = lazy(() => import('./pages/DetalleProducto'));
const IrAEgresados = lazy(() => import('./components/IrAEgresados'));
const ContactoPage = lazy(() => import('./pages/ContactoPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Carrito = lazy(() => import('./pages/Carrito'));
const Checkout = lazy(() => import('./pages/Checkout'));
const PedidoEstado = lazy(() => import('./pages/PedidoEstado'));

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
const PedidosAdmin = lazy(() => import('./pages/admin/PedidosAdmin'));
const PedidoDetalleAdmin = lazy(() => import('./pages/admin/PedidoDetalleAdmin'));
const CuponesAdmin = lazy(() => import('./pages/admin/CuponesAdmin'));
const ZonasEnvioAdmin = lazy(() => import('./pages/admin/ZonasEnvioAdmin'));
const EgresadosAdmin = lazy(() => import('./pages/admin/egresados/EgresadosAdmin'));
const PromoEgresadosAdmin = lazy(() => import('./pages/admin/egresados/PromoEgresadosAdmin'));
const AlumnoEgresadosAdmin = lazy(() => import('./pages/admin/egresados/AlumnoEgresadosAdmin'));
const CobranzaEgresadosAdmin = lazy(() => import('./pages/admin/egresados/CobranzaEgresadosAdmin'));

const App = () => (
  <AuthProvider>
    <CarritoProvider>
      <ToastProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Sitio público con Header y Footer */}
            <Route path="/" element={<LayoutGeneral />}>
              <Route index element={<Inicio />} />
              <Route path="productos" element={<ProductListPage />} />
              <Route path="colegios" element={<SelectorColegios />} />
              <Route path="colegios/:id/productos" element={<ProductosPorColegio />} />
              <Route path="producto/:id" element={<DetalleProducto />} />
              <Route path="egresados" element={<IrAEgresados />} />
              <Route path="contacto" element={<ContactoPage />} />
              <Route path="carrito" element={<Carrito />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="pedido/:token" element={<PedidoEstado />} />
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
              <Route path="pedidos" element={<PedidosAdmin />} />
              <Route path="pedidos/:id" element={<PedidoDetalleAdmin />} />
              <Route path="cupones" element={<CuponesAdmin />} />
              <Route path="envios" element={<ZonasEnvioAdmin />} />
              <Route path="egresados" element={<EgresadosAdmin />} />
              <Route path="egresados/cobrar" element={<CobranzaEgresadosAdmin />} />
              <Route path="egresados/alumnos/:id" element={<AlumnoEgresadosAdmin />} />
              <Route path="egresados/:id" element={<PromoEgresadosAdmin />} />
            </Route>
          </Routes>
        </Suspense>
      </ToastProvider>
    </CarritoProvider>
  </AuthProvider>
);

export default App;
