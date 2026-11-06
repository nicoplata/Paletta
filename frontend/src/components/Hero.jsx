import { Link } from 'react-router-dom';
import { CONTACTO } from '../datosContacto';
import '../styles/Secciones.css';

const Hero = () => (
  <section className="hero puntos" aria-labelledby="hero-titulo">
    <div className="hero-grilla">
      <div className="hero-texto">
        <p className="eyebrow">Paletta Uniformes · Munro</p>
        <h1 id="hero-titulo" className="display">
          Tu colegio, <span className="marca">tu uniforme.</span>
          <span className="subtitulo">Hecho en Munro.</span>
        </h1>
        <p className="lead">
          Uniformes para colegios, instituciones y empresas, con fabricación propia. Elegí tu colegio y encontrá cada prenda en su talle.
        </p>
        <div className="hero-ctas">
          <Link to="/colegios" className="btn">Elegí tu colegio</Link>
          <Link to="/productos" className="btn btn-secundario">Ver productos →</Link>
        </div>
        <ul className="hero-notas">
          <li>Fabricación propia</li>
          <li>Local en {CONTACTO.direccion.split(',').slice(0, 2).join(',')}</li>
        </ul>
      </div>

      <div className="hero-escena" aria-hidden="true">
        <div className="hero-blob" />
        <div className="hero-anillo" />
        <picture className="hero-foto">
          <source media="(max-width: 700px)" srcSet="/img/hero-mobile.jpg" />
          <img src="/img/hero.jpg" alt="" width="1920" height="1440" fetchpriority="high" />
        </picture>
        <span className="sticker sticker-1">★ Fabricación propia</span>
        <span className="sticker sticker-2">Hecho en Munro</span>
      </div>
    </div>
  </section>
);

export default Hero;
