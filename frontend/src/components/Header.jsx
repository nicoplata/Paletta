import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import styles from '../styles/Header.module.css';
import logoWhite from '../assets/img/palettaWhite.png';
import logoBlack from '../assets/img/logoPaletta.png';

const Header = ({ forceScrolled = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(forceScrolled);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isDesktop && menuOpen) setMenuOpen(false);
  }, [isDesktop, menuOpen]);

  useEffect(() => {
    if (forceScrolled) return;
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 1);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceScrolled]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const mostrarLogoNegro = !isHome || isScrolled || menuOpen;
  const headerClass = `${styles.header} ${mostrarLogoNegro ? styles.scrolled : ''}`;
  const lineColor = mostrarLogoNegro ? 'black' : 'white';
  const navLinkColor = mostrarLogoNegro ? 'black' : 'white';

  return (
    <div className="container">
      <div className={headerClass}>
        <div
          className={styles.logoContainer}
          onClick={() => navigate('/')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <img
            src={mostrarLogoNegro ? logoBlack : logoWhite}
            alt="Logo Paletta"
          />
        </div>

        {!isDesktop && (
          <div
            className={styles.openMenu}
            onClick={toggleMenu}
            style={{ display: 'block' }}
          >
            <span className={`${styles.line1} ${menuOpen ? styles.activeline1 : ''}`} style={{ background: lineColor }}></span>
            <span className={`${styles.line2} ${menuOpen ? styles.activeline2 : ''}`} style={{ background: lineColor }}></span>
            <span className={`${styles.line3} ${menuOpen ? styles.activeline3 : ''}`} style={{ background: lineColor }}></span>
          </div>
        )}

        {!isDesktop && (
          <div
            className={styles.darkenBackground}
            style={{ display: menuOpen ? 'block' : 'none', cursor: 'pointer' }}
            onClick={toggleMenu}
          ></div>
        )}

        <div
          className={styles.navContainer}
          style={
            isDesktop
              ? undefined
              : { right: menuOpen ? '0px' : '-300px' }
          }
        >
          <div className={styles.navDesktop}>
            <ul>
              <li><Link to="/" style={{ color: navLinkColor, textDecoration: 'none' }}>Inicio</Link></li>
              <li><Link to="/colegios" style={{ color: navLinkColor, textDecoration: 'none' }}>Colegios</Link></li>
              <li><Link to="/productos" style={{ color: navLinkColor, textDecoration: 'none' }}>Productos</Link></li>
              <li><Link to="/egresados" style={{ color: navLinkColor, textDecoration: 'none' }}>Egresados</Link></li>
              <li><Link to="/contacto" style={{ color: navLinkColor, textDecoration: 'none' }}>Contacto</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
