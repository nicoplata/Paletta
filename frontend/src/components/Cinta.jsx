import '../styles/Secciones.css';

const ITEMS = ['Uniformes escolares', 'Hecho en Munro', 'Colegios', 'Instituciones', 'Empresas'];

// Marquesina decorativa (se duplica el grupo para que el desplazamiento sea continuo)
const Cinta = () => (
  <div className="cinta" aria-hidden="true">
    <div className="cinta-pista">
      {[0, 1].map((g) => (
        <div className="cinta-grupo" key={g}>
          {ITEMS.map((t, i) => (
            <span key={t} className={`cinta-item${i % 2 ? ' acento' : ''}`}>{t} ★</span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default Cinta;
