import { CONTACTO } from '../datosContacto';
import '../styles/Secciones.css';

const Egresados = ({ titulo: Titulo = 'h2' }) => (
  <section id="egresados" className="egresados">
    <div className="egresados-interior">
      <div>
        <p className="eyebrow">Egresados</p>
        <Titulo className="display">Tu promo, tu buzo.</Titulo>
        <p>
          Buzos, camperas y chombas de egresados hechos por nosotros en Munro. Diseñá el tuyo online:
          elegí colores, sumá nombres y bordados, y pedí tu presupuesto.
        </p>
      </div>
      <div className="egresados-acciones">
        <a href={`${CONTACTO.sitioEgresados}/disena.html`} className="btn btn-claro">Diseñá tu buzo →</a>
        <a href={`${CONTACTO.sitioEgresados}/modelos.html`} className="btn btn-claro">Ver modelos</a>
      </div>
    </div>
  </section>
);

export default Egresados;
