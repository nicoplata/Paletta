import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';
import styles from '../styles/Header.module.css';
import logoWhite from '../assets/img/palettaWhite.png';
import logoBlack from '../assets/img/logoPaletta.png';
import { useCarrito } from '../context/CarritoContext';
import { useTienda } from '../hooks/useTienda';
import '../styles/Tienda.css';

const LINKS = [
  { to: '/', texto: 'Inicio', end: true },
  { to: '/colegios', texto: 'Colegios' },
  { to: '/productos', texto: 'Productos' },
  { to: '/egresados', texto: 'Egresados' },
  { to: '/contacto', texto: 'Contacto' },
];

const Header = () => {
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [scrolleado, setScrolleado] = useState(() => window.scrollY > 1);
  const { habilitada: tiendaHabilitada } = useTienda();
  const { cantidadTotal } = useCarrito();

  const esHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolleado(window.scrollY > 1);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar el menú al navegar o con Escape
  useEffect(() => setMenuAbierto(false), [location.pathname]);
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuAbierto(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuAbierto]);

  const solido = !esHome || scrolleado || menuAbierto;

  return (
    <header className={`${styles.header} ${solido ? styles.solido : ''}`}>
      <Link to="/" className={styles.logo} aria-label="Paletta, ir al inicio">
        <img src={solido ? logoBlack : logoWhite} alt="Paletta" width="136" height="80" />
      </Link>

      <button
        type="button"
        className={`${styles.hamburguesa} ${menuAbierto ? styles.abierto : ''}`}
        onClick={() => setMenuAbierto((v) => !v)}
        aria-expanded={menuAbierto}
        aria-controls="menu-principal"
        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
      >
        <span />
        <span />
        <span />
      </button>

      {menuAbierto && (
        <button type="button" className={styles.fondoOscuro} onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" tabIndex={-1} />
      )}

      <nav id="menu-principal" className={`${styles.nav} ${menuAbierto ? styles.navAbierta : ''}`} aria-label="Principal">
        <ul>
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end}>{l.texto}</NavLink>
            </li>
          ))}
          {tiendaHabilitada && (
            <li>
              <NavLink
                to="/carrito"
                className="carrito-header"
                aria-label={`Carrito, ${cantidadTotal} producto${cantidadTotal === 1 ? '' : 's'}`}
              >
                <FaShoppingCart size={20} aria-hidden="true" />
                {cantidadTotal > 0 && <span className="badge">{cantidadTotal}</span>}
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
