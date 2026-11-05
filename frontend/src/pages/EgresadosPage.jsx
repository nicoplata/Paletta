import Egresados from '../components/Egresados';
import useSeo from '../hooks/useSeo';
import { CONTACTO } from '../datosContacto';
import '../styles/Secciones.css';

const PASOS = [
  { titulo: 'Elegí el modelo', texto: 'Buzo canguro, con cierre, campera, chomba o remera para todo el curso.' },
  { titulo: 'Diseñalo online', texto: 'Colores, nombres, apodos y bordados en el diseñador de egresados.' },
  { titulo: 'Pedí tu presupuesto', texto: 'Te contactamos para coordinar talles, cantidades, pagos y entrega.' },
];

const EgresadosPage = () => {
  useSeo({
    titulo: 'Buzos y camperas de egresados personalizados',
    descripcion: 'Buzos, camperas y chombas de egresados personalizados, hechos en Munro. Diseñá el tuyo online y pedí presupuesto para tu promo.',
    ruta: '/egresados',
  });

  return (
    <div className="pagina-egresados">
      <Egresados titulo="h1" />
      <ol className="egresados-lista">
        {PASOS.map((p, i) => (
          <li key={p.titulo}>
            <span className="numero" aria-hidden="true">{i + 1}</span>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </li>
        ))}
      </ol>
      <p className="egresados-cta">
        <a href={CONTACTO.sitioEgresados} className="btn">Ir a Paletta Egresados →</a>
      </p>
    </div>
  );
};

export default EgresadosPage;
