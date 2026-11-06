import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FaShoppingBag, FaWhatsapp } from 'react-icons/fa';
import styles from '../styles/Header.module.css';
import isotipo from '../assets/img/isotipo.png';
import { useCarrito } from '../context/CarritoContext';
import { useTienda } from '../hooks/useTienda';
import { CONTACTO, linkWhatsApp } from '../datosContacto';

const LINKS = [
  { to: '/productos', texto: 'Productos' },
  { to: '/colegios', texto: 'Colegios' },
  { to: '/contacto', texto: 'Contacto' },
];

// Selector entre los dos sitios de Paletta (el mismo que tiene egresados.paletta.com.ar)
const Marcas = ({ className = '', tabIndex }) => (
  <nav className={`${styles.marcas} ${className}`} aria-label="Sitios de Paletta">
    <a href="/" aria-current="true" tabIndex={tabIndex}>Uniformes</a>
    <a href={CONTACTO.sitioEgresados} tabIndex={tabIndex}>Egresados <span aria-hidden="true">↗</span></a>
  </nav>
);

const Header = () => {
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolleado, setScrolleado] = useState(() => window.scrollY > 4);
  const { habilitada: tiendaHabilitada } = useTienda();
  const { cantidadTotal } = useCarrito();

  useEffect(() => {
    const onScroll = () => setScrolleado(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar el menú al navegar o con Escape; bloquear el scroll mientras está abierto
  useEffect(() => setMenuAbierto(false), [location.pathname]);
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuAbierto(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuAbierto]);

  const presupuesto = linkWhatsApp('Hola Paletta! Quiero pedir un presupuesto.');

  return (
    <>
      <header className={`${styles.header} ${scrolleado ? styles.conBorde : ''}`}>
        <div className={styles.interior}>
          <Link to="/" className={styles.logo} aria-label="Paletta Uniformes, ir al inicio">
            <img src={isotipo} alt="" width="34" height="27" />
            Paletta
            <span className={styles.logoTag}>Uniformes</span>
          </Link>
          <Marcas className={styles.marcasHeader} />

          <nav className={styles.nav} aria-label="Principal">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to}>{l.texto}</NavLink>
            ))}
          </nav>

          <div className={styles.acciones}>
            {tiendaHabilitada && (
              <NavLink
                to="/carrito"
                className={styles.carrito}
                aria-label={`Carrito, ${cantidadTotal} producto${cantidadTotal === 1 ? '' : 's'}`}
              >
                <FaShoppingBag size={18} aria-hidden="true" />
                {cantidadTotal > 0 && <span className={styles.badge}>{cantidadTotal}</span>}
              </NavLink>
            )}
            <a href={presupuesto} className={`btn btn-sm ${styles.ctaEscritorio}`} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp aria-hidden="true" /> Pedí tu presupuesto
            </a>
            <button
              type="button"
              className={styles.hamburguesa}
              onClick={() => setMenuAbierto(true)}
              aria-expanded={menuAbierto}
              aria-controls="menu-mobile"
              aria-label="Abrir menú"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div
        id="menu-mobile"
        className={`${styles.menu} ${menuAbierto ? styles.menuAbierto : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        aria-hidden={!menuAbierto}
      >
        <div className={styles.menuArriba}>
          <Link to="/" className={styles.logo} tabIndex={menuAbierto ? 0 : -1}>
            <img src={isotipo} alt="" width="34" height="27" />
            Paletta
            <span className={styles.logoTag}>Uniformes</span>
          </Link>
          <button type="button" className={styles.hamburguesa} onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" tabIndex={menuAbierto ? 0 : -1}>
            ✕
          </button>
        </div>
        <nav aria-label="Menú mobile">
          {[{ to: '/', texto: 'Inicio', end: true }, ...LINKS, ...(tiendaHabilitada ? [{ to: '/carrito', texto: 'Carrito' }] : [])].map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} tabIndex={menuAbierto ? 0 : -1}>{l.texto}</NavLink>
          ))}
        </nav>
        <div className={styles.menuPie}>
          <Marcas className={styles.marcasMenu} tabIndex={menuAbierto ? 0 : -1} />
          <a href={presupuesto} className="btn" target="_blank" rel="noopener noreferrer" tabIndex={menuAbierto ? 0 : -1}>
            <FaWhatsapp aria-hidden="true" /> Pedí tu presupuesto
          </a>
          <a href={`tel:${CONTACTO.telefonoLink}`} className={`btn btn-secundario ${styles.llamar}`} tabIndex={menuAbierto ? 0 : -1}>
            Llamar · {CONTACTO.telefono}
          </a>
        </div>
      </div>
    </>
  );
};

export default Header;
