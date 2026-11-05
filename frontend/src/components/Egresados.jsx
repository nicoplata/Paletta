import { Link } from 'react-router-dom';
import '../styles/Secciones.css';

const Egresados = ({ titulo: Titulo = 'h2' }) => (
  <section id="egresados" className="egresados">
    <Titulo>Egresados</Titulo>
    <p>
      Descubrí nuestra línea especial para egresados: buzos, camperas y conjuntos personalizados con la mejor
      calidad y diseño. ¡Hacé que tu grupo se destaque y lleve un recuerdo inolvidable!
    </p>
    <div className="egresados-acciones">
      <Link to="/productos" className="btn btn-claro">Ver productos</Link>
      <Link to="/contacto" className="btn btn-claro">Pedí presupuesto para tu grupo</Link>
    </div>
  </section>
);

export default Egresados;
