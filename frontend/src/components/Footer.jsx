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
          Paletta
        </Link>
        <p>Uniformes escolares, egresados y empresas. Fabricación propia en Munro, Vicente López.</p>
      </div>
      <nav aria-label="Secciones">
        <h3>Navegá</h3>
        <ul>
          <li><Link to="/productos">Productos</Link></li>
          <li><Link to="/colegios">Colegios</Link></li>
          <li><Link to="/egresados">Egresados</Link></li>
          <li><Link to="/contacto">Contacto</Link></li>
        </ul>
      </nav>
      <div>
        <h3>Contacto</h3>
        <address>
          <a href={linkWhatsApp()} target="_blank" rel="noopener noreferrer">WhatsApp {CONTACTO.telefono}</a>
          <a href={`mailto:${CONTACTO.email}`}>{CONTACTO.email}</a>
          <span>{CONTACTO.direccion}</span>
          <span>{CONTACTO.horarios}</span>
        </address>
      </div>
      <div>
        <h3>Redes</h3>
        <ul>
          <li><a href={CONTACTO.instagramUniformes} target="_blank" rel="noopener noreferrer">@paletta.uniformes</a></li>
          <li><a href={CONTACTO.instagramEgresados} target="_blank" rel="noopener noreferrer">@paletta.egresados</a></li>
          <li><a href={CONTACTO.sitioEgresados}>Paletta Egresados</a></li>
        </ul>
      </div>
    </div>
    <div className="footer-legal">
      <span>© {new Date().getFullYear()} Paletta. Hecho en Munro.</span>
      <span>{CONTACTO.direccion}</span>
    </div>
  </footer>
);

export default Footer;
