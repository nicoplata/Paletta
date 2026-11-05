import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaBars, FaTimes, FaBox, FaTags, FaSchool, FaUsers, FaSignOutAlt, FaEnvelope, FaExternalLinkAlt, FaShoppingBag, FaTicketAlt, FaTruck } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { AdminGlobalStyles } from '../../styles/AdminStyles';

const DashboardContainer = styled.div`
  min-height: 100vh;
  display: flex;
  background: var(--color-fondo);
`;

const Sidebar = styled.div`
  width: ${props => props.$isCollapsed ? '80px' : '280px'};
  background: var(--color-superficie);
  height: 100vh;
  position: fixed;
  transition: all 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
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
  transition: all 0.3s ease;
`;

const ContentArea = styled.div`
  background: var(--color-superficie);
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
`;

const LogoutButton = styled(StyledNavLink)`
  margin-top: auto;
  color: var(--color-primario);
  
  &:hover {
    background: var(--color-primario-suave);
    color: var(--color-primario-oscuro);
  }
`;

const DashboardAdmin = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin', { replace: true });
  };

  return (
    <>
      <AdminGlobalStyles />
      <DashboardContainer>
        <Sidebar $isCollapsed={isCollapsed}>
          <SidebarHeader $isCollapsed={isCollapsed}>
            <Title $isCollapsed={isCollapsed}>Panel Admin</Title>
            <ToggleButton onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}>
              {isCollapsed ? <FaBars /> : <FaTimes />}
            </ToggleButton>
          </SidebarHeader>

          <NavMenu>
            <StyledNavLink to="/admin/dashboard/pedidos" $isCollapsed={isCollapsed}>
              <FaShoppingBag />
              <span>Pedidos</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/cupones" $isCollapsed={isCollapsed}>
              <FaTicketAlt />
              <span>Cupones</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/envios" $isCollapsed={isCollapsed}>
              <FaTruck />
              <span>Envíos</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/productos" $isCollapsed={isCollapsed}>
              <FaBox />
              <span>Productos</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/categorias" $isCollapsed={isCollapsed}>
              <FaTags />
              <span>Categorías</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/colegios" $isCollapsed={isCollapsed}>
              <FaSchool />
              <span>Colegios</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/usuarios" $isCollapsed={isCollapsed}>
              <FaUsers />
              <span>Usuarios</span>
            </StyledNavLink>
            <StyledNavLink to="/admin/dashboard/mensajes" $isCollapsed={isCollapsed}>
              <FaEnvelope />
              <span>Mensajes</span>
            </StyledNavLink>
            <StyledNavLink as="a" href="/" target="_blank" rel="noopener noreferrer" $isCollapsed={isCollapsed}>
              <FaExternalLinkAlt />
              <span>Ver sitio</span>
            </StyledNavLink>
            
            <LogoutButton as="button" onClick={handleLogout} $isCollapsed={isCollapsed}>
              <FaSignOutAlt />
              <span>Cerrar Sesión</span>
            </LogoutButton>
          </NavMenu>
        </Sidebar>

        <Content $isCollapsed={isCollapsed}>
          <ContentArea>
            <Outlet />
          </ContentArea>
        </Content>
      </DashboardContainer>
    </>
  );
};

export default DashboardAdmin;
