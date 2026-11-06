import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Marca } from './PortalApp';
import { EGRESADOS, api, linkWhatsApp, mensajeError } from './utils';

const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Ingreso = ({ slug, onIngreso }) => {
  const [promo, setPromo] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [elegido, setElegido] = useState(null);
  const [dni, setDni] = useState('');
  const [modoNuevo, setModoNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get(`/promos/${slug}`)
      .then((r) => setPromo(r.data))
      .catch((e) => setErrorCarga(mensajeError(e, 'No encontramos esa promo.')));
  }, [slug]);

  const lista = useMemo(() => {
    if (!promo) return [];
    const q = normalizar(busqueda.trim());
    return q ? promo.alumnos.filter((a) => normalizar(a.nombre).includes(q)) : promo.alumnos;
  }, [promo, busqueda]);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { data } = modoNuevo
        ? await api.post(`/promos/${slug}/alumnos`, { nombre: nombreNuevo, dni })
        : await api.post(`/promos/${slug}/ingresar`, { alumnoId: elegido.id, dni });
      onIngreso(data.token);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  if (errorCarga) {
    return (
      <>
        <Marca />
        <main className="pf-main pf-angosto">
          <h1 className="pf-titulo">Mi promo</h1>
          <p className="aviso error" role="alert">{errorCarga}</p>
          <a className="btn" href={linkWhatsApp('¡Hola Paletta! No puedo entrar al link de mi promo.')} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>
        </main>
      </>
    );
  }
  if (!promo) return <><Marca /><main className="pf-main pf-angosto"><p className="pf-cargando">Cargando…</p></main></>;

  return (
    <>
      <Marca />
      <main className="pf-main pf-angosto">
        <Link to="/" className="pf-link pf-volver">← Cambiar de promo</Link>
        <p className="eyebrow">Promo {promo.anio} · {promo.colegio} · {promo.curso}</p>
        <h1 className="pf-titulo">¡Hola! Entrá para armar el pedido de tu hijo/a.</h1>
        <p className="lead">Vas a cargar sus datos, elegir prendas y talles, el plan de pago y ver la cuponera. Te lleva unos 5 minutos.</p>

        {promo.cerrada && <p className="aviso" role="status">La carga de esta promo ya cerró: podés entrar para ver tu cuponera.</p>}

        <form className="pf-card pf-ingreso" onSubmit={enviar}>
          {!modoNuevo ? (
            <>
              <h2 className="pf-h2">1. Buscá a tu hijo/a</h2>
              <label className="campo">
                <span className="sr-only">Buscar por nombre</span>
                <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribí el nombre o apellido" autoComplete="off" />
              </label>
              <div className="pf-lista" role="radiogroup" aria-label="Alumnos de la promo">
                {lista.length === 0 && <p className="pf-tenue">No hay coincidencias.</p>}
                {lista.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={elegido?.id === a.id}
                    className="pf-alumno"
                    onClick={() => { setElegido(a); setError(''); }}
                  >
                    <span>{a.nombre}</span>
                    {a.registrado && <small>ya ingresó</small>}
                  </button>
                ))}
              </div>
              {!promo.cerrada && (
                <button type="button" className="pf-link" onClick={() => { setModoNuevo(true); setElegido(null); setError(''); }}>
                  No encuentro a mi hijo/a en la lista
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="pf-h2">1. Sumá a tu hijo/a a la promo</h2>
              <label className="campo">
                Nombre y apellido del alumno/a
                <input value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} required minLength={3} maxLength={120} autoComplete="off" />
              </label>
              <button type="button" className="pf-link" onClick={() => { setModoNuevo(false); setError(''); }}>Volver a la lista</button>
            </>
          )}

          {(elegido || modoNuevo) && (
            <>
              <h2 className="pf-h2">2. DNI del alumno/a{elegido ? ` (${elegido.nombre})` : ''}</h2>
              <label className="campo">
                <span className="sr-only">DNI del alumno</span>
                <input
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="numeric"
                  required
                  minLength={7}
                  maxLength={10}
                  placeholder="Ej.: 45.123.456"
                  autoComplete="off"
                />
              </label>
              <p className="pf-tenue">
                {elegido && !elegido.registrado
                  ? 'Es la primera vez que entran: el DNI que pongas queda asociado al alumno y lo vas a usar para volver a entrar.'
                  : 'Usamos el DNI para que solo su familia pueda ver y cambiar su pedido.'}
              </p>
              {error && <p className="aviso error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-ancho" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
              <p className="pf-tenue pf-centro">
                Al entrar aceptás la <a href={`${EGRESADOS.sitio}/privacidad.html`} target="_blank" rel="noopener noreferrer">política de privacidad</a>.
              </p>
            </>
          )}
        </form>
        <p className="pf-tenue pf-centro">
          ¿Problemas para entrar? <a href={linkWhatsApp(`¡Hola Paletta! Tengo un problema para entrar al portal de la promo ${promo.anio} de ${promo.colegio} (${promo.curso}).`)} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>.
        </p>
      </main>
    </>
  );
};

export default Ingreso;
