import { Link } from 'react-router-dom';
import isotipo from '../assets/img/isotipo.png';
import { CONTACTO, linkWhatsApp } from '../datosContacto';
import '../styles/Secciones.css';

const Footer = () => (
  <footer className="footer">
    <div className="footer-grilla">
      <div className="footer-marca">
        <Link to="/" className="footer-logo">
          <img src={isotipo} alt="" width="40" height="32" loading="lazy" />
          Paletta <span className="footer-tag">Uniformes</span>
        </Link>
        <p>Uniformes escolares, institucionales y de empresa. Fabricación propia en Munro, Vicente López.</p>
      </div>
      <nav aria-label="Secciones">
        <h2>Navegá</h2>
        <ul>
          <li><Link to="/productos">Productos</Link></li>
          <li><Link to="/colegios">Colegios</Link></li>
          <li><Link to="/contacto">Contacto</Link></li>
        </ul>
      </nav>
      <div>
        <h2>Contacto</h2>
        <address>
          <a href={linkWhatsApp()} target="_blank" rel="noopener noreferrer">WhatsApp {CONTACTO.telefono}</a>
          <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>
          <span>{CONTACTO.direccion}</span>
          <span>{CONTACTO.horarios}</span>
        </address>
      </div>
      <div>
        <h2>Seguinos</h2>
        <ul>
          <li><a href={CONTACTO.instagramUniformes} target="_blank" rel="noopener noreferrer">@paletta.uniformes</a></li>
        </ul>
        <h2 className="footer-hermano">¿Sos de la promo?</h2>
        <ul>
          <li><a href={CONTACTO.sitioEgresados}>Paletta Egresados ↗</a></li>
        </ul>
      </div>
    </div>
    <div className="footer-legal">
      <span>© {new Date().getFullYear()} Paletta Uniformes. Hecho en Munro.</span>
    </div>
  </footer>
);

export default Footer;
