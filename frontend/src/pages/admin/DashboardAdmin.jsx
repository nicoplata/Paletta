import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaBars, FaTimes, FaBox, FaTags, FaSchool, FaUsers, FaSignOutAlt, FaEnvelope, FaExternalLinkAlt, FaShoppingBag, FaTicketAlt, FaTruck, FaGraduationCap, FaCut, FaHistory } from 'react-icons/fa';
import Campanita from '../../components/admin/Campanita';
import ConfirmacionModal from '../../components/admin/ConfirmacionModal';
import { useAuth } from '../../context/AuthContext';
import { AdminGlobalStyles } from '../../styles/AdminStyles';

const DashboardContainer = styled.div`
  min-height: 100vh;
  display: flex;
  background: var(--color-fondo);
`;

const MOVIL = '(max-width: 768px)';

const Sidebar = styled.nav`
  width: ${props => props.$isCollapsed ? '80px' : '280px'};
  background: var(--color-superficie);
  height: 100vh;
  height: 100dvh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  transition: width 0.3s ease, transform 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;

  /* En el celular es un panel que entra desde la izquierda y se oculta */
  @media ${MOVIL} {
    width: min(280px, 85vw);
    transform: translateX(${({ $abierto }) => ($abierto ? '0' : '-105%')});
    visibility: ${({ $abierto }) => ($abierto ? 'visible' : 'hidden')};
    transition: transform 0.3s ease, visibility 0.3s;
  }
`;

const Fondo = styled.div`
  display: none;
  @media ${MOVIL} {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(14, 14, 18, 0.45);
    opacity: ${({ $abierto }) => ($abierto ? 1 : 0)};
    pointer-events: ${({ $abierto }) => ($abierto ? 'auto' : 'none')};
    transition: opacity 0.3s ease;
  }
`;

const BarraMovil = styled.header`
  display: none;
  @media ${MOVIL} {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: sticky;
    top: 0;
    z-index: 900;
    padding: 0.5rem 0.75rem;
    background: var(--color-superficie);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    font-weight: 700;
    color: #2c3e50;
  }
`;

const SidebarHeader = styled.div`
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: ${props => props.$isCollapsed ? 'center' : 'space-between'};
  border-bottom: 1px solid #eee;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin: 0;
  font-size: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '1.2rem')};
  transition: all 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #2c3e50;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--color-primario);
  }
`;

const NavMenu = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  flex: 1;
  /* min-height: 0 deja que el menú se achique dentro del panel y muestre la barra de desplazamiento */
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #c9c9c9 transparent;

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-thumb { background: #c9c9c9; border-radius: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
`;

const StyledNavLink = styled(NavLink)`
  color: #7f8c8d;
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;

  svg {
    font-size: 1.2rem;
    min-width: 20px;
  }

  span {
    display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'block')};
  }

  @media ${MOVIL} {
    span { display: block; }
  }

  &:hover {
    background: var(--color-primario-suave);
    color: var(--color-primario);
  }

  &.active {
    background: var(--color-primario);
    color: white;
  }
`;

const Content = styled.main`
  margin-left: ${props => props.$isCollapsed ? '80px' : '280px'};
  padding: 2rem;
  flex: 1;
  min-width: 0;
  transition: margin-left 0.3s ease;

  @media ${MOVIL} {
    margin-left: 0;
    padding: 0.75rem;
  }
`;

const ContentArea = styled.div`
  background: var(--color-superficie);
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);

  @media ${MOVIL} {
    padding: 1rem;
  }
`;

const BarraSuperior = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin: -0.75rem 0 0.75rem;
  color: #7f8c8d;
  font-size: 0.9rem;
`;

const Columna = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const LogoutButton = styled(StyledNavLink)`
  margin-top: auto;
  flex: none;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
  text-align: left;
  color: var(--color-primario);
  
  &:hover {
    background: var(--color-primario-suave);
    color: var(--color-primario-oscuro);
  }
`;

const DashboardAdmin = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [abierto, setAbierto] = useState(false); // panel en el celular
  const [esMovil, setEsMovil] = useState(() => window.matchMedia(MOVIL).matches);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout, usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  useEffect(() => {
    const mq = window.matchMedia(MOVIL);
    const alCambiar = (e) => { setEsMovil(e.matches); if (!e.matches) setAbierto(false); };
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  // Al navegar se cierra el panel del celular
  useEffect(() => { setAbierto(false); }, [pathname]);

  // Escape cierra el panel y, mientras está abierto, la página de atrás no se desplaza
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('keydown', alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', alTeclear); document.body.style.overflow = overflow; };
  }, [abierto]);

  const colapsado = isCollapsed && !esMovil;

  const handleLogout = () => {
    logout();
    navigate('/admin', { replace: true });
  };

  return (
    <>
      <AdminGlobalStyles />
      <ConfirmacionModal />
      <DashboardContainer>
        <Fondo $abierto={abierto} onClick={() => setAbierto(false)} aria-hidden="true" />
        <Sidebar id="admin-menu" aria-label="Menú del panel" $isCollapsed={colapsado} $abierto={abierto}>
          <SidebarHeader $isCollapsed={colapsado}>
            <Title $isCollapsed={colapsado}>Panel Admin</Title>
            {esMovil ? (
              <ToggleButton type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú"><FaTimes /></ToggleButton>
            ) : (
              <ToggleButton type="button" onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}>
                {isCollapsed ? <FaBars /> : <FaTimes />}
              </ToggleButton>
            )}
          </SidebarHeader>

          <NavMenu>
            <StyledNavLink to="/admin/dashboard/pedidos" $isCollapsed={colapsado}>
              <FaShoppingBag />
              <span>Pedidos</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/egresados" $isCollapsed={colapsado}>
              <FaGraduationCap />
              <span>Egresados</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/produccion" $isCollapsed={colapsado}>
              <FaCut />
              <span>Producción</span>
            </StyledNavLink>
            {esAdmin && (
              <StyledNavLink to="/admin/dashboard/cupones" $isCollapsed={colapsado}>
                <FaTicketAlt />
                <span>Cupones</span>
              </StyledNavLink>
            )}
            {esAdmin && (
              <StyledNavLink to="/admin/dashboard/envios" $isCollapsed={colapsado}>
                <FaTruck />
                <span>Envíos</span>
              </StyledNavLink>
            )}
            <StyledNavLink to="/admin/dashboard/productos" $isCollapsed={colapsado}>
              <FaBox />
              <span>Productos</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/categorias" $isCollapsed={colapsado}>
              <FaTags />
              <span>Categorías</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/colegios" $isCollapsed={colapsado}>
              <FaSchool />
              <span>Colegios</span>
            </StyledNavLink>
            {esAdmin && (
              <StyledNavLink to="/admin/dashboard/usuarios" $isCollapsed={colapsado}>
                <FaUsers />
                <span>Usuarios</span>
              </StyledNavLink>
            )}
            <StyledNavLink to="/admin/dashboard/mensajes" $isCollapsed={colapsado}>
              <FaEnvelope />
              <span>Mensajes</span>
            </StyledNavLink>
            {esAdmin && (
              <StyledNavLink to="/admin/dashboard/actividad" $isCollapsed={colapsado}>
                <FaHistory />
                <span>Actividad</span>
              </StyledNavLink>
            )}
            <StyledNavLink as="a" href="/" target="_blank" rel="noopener noreferrer" $isCollapsed={colapsado}>
              <FaExternalLinkAlt />
              <span>Ver sitio</span>
            </StyledNavLink>
            
            <LogoutButton as="button" onClick={handleLogout} $isCollapsed={colapsado}>
              <FaSignOutAlt />
              <span>Cerrar Sesión</span>
            </LogoutButton>
          </NavMenu>
        </Sidebar>

        <Columna>
          <BarraMovil>
            <ToggleButton type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto} aria-controls="admin-menu"><FaBars /></ToggleButton>
            <span style={{ flex: 1 }}>Panel Admin</span>
            {esMovil && <Campanita />}
          </BarraMovil>
          <Content $isCollapsed={colapsado}>
            {!esMovil && (
              <BarraSuperior>
                <span>{usuario?.nombre}{usuario?.rol === 'encargado' ? ' · Encargado/a' : ''}</span>
                <Campanita />
              </BarraSuperior>
            )}
            <ContentArea>
              <Outlet />
            </ContentArea>
          </Content>
        </Columna>
      </DashboardContainer>
    </>
  );
};

export default DashboardAdmin;
