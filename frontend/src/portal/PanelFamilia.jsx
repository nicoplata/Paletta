import { useCallback, useEffect, useState } from 'react';
import { Marca } from './PortalApp';
import { PasoDatos, PasoPrendas, PasoPlan, PasoCuponera } from './Pasos';
import { api, conToken, diasHasta, fecha, linkWhatsApp, mensajeError } from './utils';

const PASOS = [
  { clave: 'datos', titulo: 'Datos', listo: (a) => a.progreso.datos },
  { clave: 'prendas', titulo: 'Prendas y talles', listo: (a) => a.progreso.prendas },
  { clave: 'plan', titulo: 'Plan de pago', listo: (a) => a.progreso.plan },
  { clave: 'cuponera', titulo: 'Cuponera', listo: (a) => a.progreso.sena },
];

const primerPendiente = (alumno) => (PASOS.find((p) => !p.listo(alumno)) || PASOS[3]).clave;

function mensajeAvance(alumno, listos) {
  if (listos === 4) return '¡Listo! Ya está todo cargado y la cuota 1 está paga.';
  if (!alumno.progreso.datos) return 'Empezá por los datos del alumno y de un adulto responsable.';
  if (!alumno.progreso.prendas) return 'Ahora elegí las prendas, los talles y el bordado.';
  if (!alumno.progreso.plan) return 'Último paso: elegí cómo vas a pagar y se arma tu cuponera.';
  return 'Ya tenés tu cuponera. Cuando pagues la cuota 1, el pedido queda confirmado.';
}

const PanelFamilia = ({ token, onSalir }) => {
  const [vista, setVista] = useState(null);
  const [paso, setPaso] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/mi-promo', conToken(token));
      setVista(data);
      setPaso((p) => p || primerPendiente(data.alumno));
    } catch (err) {
      if (err?.response?.status === 401) onSalir();
      else setError(mensajeError(err));
    }
  }, [token, onSalir]);

  useEffect(() => { cargar(); }, [cargar]);

  // Guarda en la API y refresca la vista; devuelve el mensaje de error (o '' si salió bien)
  const guardar = useCallback(async (ruta, datos, siguiente) => {
    try {
      const { data } = await api.put(`/mi-promo/${ruta}`, datos, conToken(token));
      setVista(data);
      if (siguiente) {
        setPaso(siguiente);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return '';
    } catch (err) {
      if (err?.response?.status === 401) onSalir();
      return mensajeError(err);
    }
  }, [token, onSalir]);

  const salir = (
    <button type="button" className="btn btn-secundario btn-sm" onClick={onSalir}>Salir</button>
  );

  if (error) {
    return <><Marca>{salir}</Marca><main className="pf-main pf-angosto"><p className="aviso error" role="alert">{error}</p><button className="btn" type="button" onClick={cargar}>Reintentar</button></main></>;
  }
  if (!vista) return <><Marca /><main className="pf-main pf-angosto"><p className="pf-cargando">Cargando…</p></main></>;

  const { alumno, promo } = vista;
  const listos = PASOS.filter((p) => p.listo(alumno)).length;
  const porcentaje = Math.round((listos / PASOS.length) * 100);
  const diasCierre = diasHasta(promo.fechaCierre);
  const nombreCorto = alumno.nombre.split(' ')[0];

  return (
    <>
      <Marca>{salir}</Marca>
      <main className="pf-main">
        <section className="pf-hero" aria-labelledby="pf-hola">
          <div>
            <p className="eyebrow">Promo {promo.anio} · {promo.colegio} · {promo.curso}</p>
            <h1 id="pf-hola" className="pf-hero-titulo">Hola, familia de {nombreCorto}.</h1>
            <p className="pf-hero-texto">{mensajeAvance(alumno, listos)}</p>
            {promo.fechaCierre && diasCierre !== null && (
              <p className={`pf-cierre${diasCierre < 0 ? ' cerrado' : ''}`}>
                {diasCierre < 0
                  ? `La carga cerró el ${fecha(promo.fechaCierre)}`
                  : diasCierre === 0
                    ? '⏳ La carga cierra hoy'
                    : `⏳ La carga cierra en ${diasCierre} día${diasCierre === 1 ? '' : 's'} · ${fecha(promo.fechaCierre)}`}
              </p>
            )}
          </div>
          <div className="pf-anillo" style={{ '--p': porcentaje }} role="img" aria-label={`${listos} de 4 pasos completos`}>
            <div><b>{listos}/4</b><span>pasos listos</span></div>
          </div>
        </section>

        <nav className="pf-pasos" aria-label="Pasos">
          {PASOS.map((p, i) => {
            const listo = p.listo(alumno);
            return (
              <button
                key={p.clave}
                type="button"
                className={`pf-paso${listo ? ' listo' : ''}${paso === p.clave ? ' actual' : ''}`}
                aria-current={paso === p.clave ? 'step' : undefined}
                onClick={() => setPaso(p.clave)}
              >
                <i aria-hidden="true">{listo ? '✓' : i + 1}</i>
                <span>{p.titulo}</span>
                <small>{listo ? 'Listo' : 'Pendiente'}</small>
              </button>
            );
          })}
        </nav>

        <section className="pf-card pf-contenido">
          {paso === 'datos' && <PasoDatos alumno={alumno} guardar={guardar} />}
          {paso === 'prendas' && <PasoPrendas alumno={alumno} promo={promo} guardar={guardar} />}
          {paso === 'plan' && <PasoPlan alumno={alumno} promo={promo} guardar={guardar} irA={setPaso} />}
          {paso === 'cuponera' && <PasoCuponera vista={vista} irA={setPaso} />}
        </section>

        <p className="pf-tenue pf-centro">
          ¿Dudas? <a href={linkWhatsApp(`¡Hola Paletta! Soy de la familia de ${alumno.nombre} (${alumno.codigo}). Tengo una consulta:`)} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>.
        </p>
      </main>
    </>
  );
};

export default PanelFamilia;
