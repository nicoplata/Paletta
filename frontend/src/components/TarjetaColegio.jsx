import { assetUrl, IMAGEN_COLEGIO_DEFAULT } from '../config';

const TarjetaColegio = ({ colegio, onSelect, conInfo = false }) => (
  <button
    type="button"
    className="tarjeta-colegio"
    onClick={() => onSelect(colegio)}
    aria-label={`Ver productos de ${colegio.nombre}`}
  >
    <img
      src={assetUrl(colegio.imagenes?.[0]?.url, IMAGEN_COLEGIO_DEFAULT)}
      alt={colegio.nombre}
      className="imagen-colegio"
      loading="lazy"
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGEN_COLEGIO_DEFAULT; }}
    />
    {conInfo && (
      <div className="info-colegio">
        <h3>{colegio.nombre}</h3>
        <p>{colegio.ciudad}</p>
        {colegio.nivel?.length > 0 && <p>{colegio.nivel.join(', ')}</p>}
      </div>
    )}
  </button>
);

export default TarjetaColegio;
