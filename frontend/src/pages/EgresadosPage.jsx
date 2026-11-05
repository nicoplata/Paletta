import { Link } from 'react-router-dom';
import Egresados from '../components/Egresados';
import useSeo from '../hooks/useSeo';
import '../styles/Secciones.css';

const PASOS = [
  { titulo: '1. Elegí las prendas', texto: 'Buzos, camperas y conjuntos para todo el curso.' },
  { titulo: '2. Personalizalas', texto: 'Colores, estampas y detalles únicos para tu grupo.' },
  { titulo: '3. Pedí tu presupuesto', texto: 'Escribinos y coordinamos talles, cantidades y entrega.' },
];

const EgresadosPage = () => {
  useSeo({
    titulo: 'Buzos y camperas de egresados personalizados',
    descripcion: 'Buzos, camperas y conjuntos de egresados personalizados con la mejor calidad y diseño. Pedí presupuesto para tu grupo en Paletta.',
    ruta: '/egresados',
  });

  return (
    <div className="pagina-egresados">
      <Egresados titulo="h1" />
      <div className="egresados-lista">
        {PASOS.map((p) => (
          <article key={p.titulo}>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </article>
        ))}
      </div>
      <p className="egresados-cta">
        <Link to="/contacto" className="btn">Pedir presupuesto</Link>
      </p>
    </div>
  );
};

export default EgresadosPage;
