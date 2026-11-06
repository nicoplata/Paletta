import { CONTACTO } from '../datosContacto';
import '../styles/Secciones.css';

// Enlace al sitio hermano. Los egresados viven en egresados.paletta.com.ar: acá solo se lo presenta.
const Egresados = () => (
  <aside className="egresados" aria-labelledby="egresados-titulo">
    <div className="egresados-interior">
      <div>
        <p className="eyebrow">Paletta Egresados</p>
        <h2 id="egresados-titulo">¿Buscás el buzo de tu promo?</h2>
        <p>Los egresados tienen su propio sitio, con el diseñador online, los modelos y la guía de talles.</p>
      </div>
      <a href={CONTACTO.sitioEgresados} className="btn btn-claro">
        Ir a Paletta Egresados <span aria-hidden="true">↗</span>
      </a>
    </div>
  </aside>
);

export default Egresados;
