import { Link } from 'react-router-dom';
import logoWhite from '../assets/img/palettaWhite.png';
import '../styles/Secciones.css';

export const DATOS_CONTACTO = {
  email: 'info@paletta.com.ar',
  telefono: '+54 11 4777-7777',
  telefonoLink: '+541147777777',
  direccion: 'Vélez Sarsfield 4270, Munro, Buenos Aires',
};

const Footer = () => (
  <footer className="footer">
    <div className="footer-grilla">
      <div>
        <img src={logoWhite} alt="Paletta" width="92" height="54" loading="lazy" />
      </div>
      <nav aria-label="Secciones">
        <ul>
          <li><Link to="/productos">Productos</Link></li>
          <li><Link to="/colegios">Colegios</Link></li>
          <li><Link to="/egresados">Egresados</Link></li>
          <li><Link to="/contacto">Contacto</Link></li>
        </ul>
      </nav>
      <address className="footer-contacto">
        <strong>Contacto</strong>
        <a href={`mailto:${DATOS_CONTACTO.email}`}>{DATOS_CONTACTO.email}</a>
        <a href={`tel:${DATOS_CONTACTO.telefonoLink}`}>{DATOS_CONTACTO.telefono}</a>
        <span>{DATOS_CONTACTO.direccion}</span>
      </address>
    </div>
    <p className="footer-legal">© {new Date().getFullYear()} Paletta. Indumentaria para egresados, colegios y empresas.</p>
  </footer>
);

export default Footer;
