import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Marca } from './PortalApp';
import { api, leerSesionComision, guardarSesionComision, linkWhatsApp, mensajeError } from './utils';

const CLAVE_ULTIMO_CODIGO = 'egr_ultimo_codigo';
const leer = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };

// Entrada única: código de contrato → "Soy familia" o "Soy de la comisión"
const Inicio = () => {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState(leer(CLAVE_ULTIMO_CODIGO));
  const [promo, setPromo] = useState(null);
  const [modoComision, setModoComision] = useState(false);
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const sesionComision = leerSesionComision();

  useEffect(() => { document.title = 'Mi promo | Paletta Egresados'; }, []);

  const buscar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { data } = await api.get(`/codigo/${encodeURIComponent(codigo.trim())}`);
      guardar(CLAVE_ULTIMO_CODIGO, data.codigo);
      setPromo(data);
    } catch (err) {
      setError(mensajeError(err, 'No encontramos esa promo.'));
    } finally {
      setEnviando(false);
    }
  };

  const entrarComision = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { data } = await api.post('/comision/ingresar', { codigo: promo.codigo, clave });
      guardarSesionComision({ token: data.token, codigo: promo.codigo });
      navigate('/comision');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <>
      <Marca />
      <main className="pf-main pf-angosto">
        <p className="eyebrow">Paletta Egresados</p>
        <h1 className="pf-titulo">Mi promo</h1>
        <p className="lead">El lugar para seguir el pedido de la promo: datos, talles, cuponera y avance del curso.</p>

        {sesionComision && !promo && (
          <button type="button" className="pf-card pf-atajo" onClick={() => navigate('/comision')}>
            <span><b>Volver al tablero de la comisión</b><small>Promo {sesionComision.codigo}</small></span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        {!promo ? (
          <form className="pf-card pf-ingreso" onSubmit={buscar}>
            <label className="campo">Código de la promo
              <input
                value={codigo}
                onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setError(''); }}
                placeholder="Ej.: EGR27-K7M2"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                minLength={4}
                maxLength={24}
                className="pf-codigo-input"
              />
            </label>
            <p className="pf-tenue">Está en el contrato de la promo. Si no lo tenés, pedíselo a la comisión del curso.</p>
            {error && <p className="aviso error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-ancho" disabled={enviando || codigo.trim().length < 4}>{enviando ? 'Buscando…' : 'Continuar'}</button>
          </form>
        ) : (
          <>
            <div className="pf-card pf-promo-elegida">
              <div>
                <p className="eyebrow">Promo {promo.anio} · {promo.codigo}</p>
                <h2 className="pf-h2">{promo.colegio} · {promo.curso}</h2>
              </div>
              <button type="button" className="pf-link" onClick={() => { setPromo(null); setModoComision(false); setError(''); }}>Cambiar</button>
            </div>

            {!modoComision ? (
              <div className="pf-opciones">
                <button type="button" className="pf-opcion" onClick={() => navigate(`/${promo.slug}`)}>
                  <span className="pf-opcion-icono" aria-hidden="true">👤</span>
                  <b>Individual: soy familia de un alumno</b>
                  <small>Datos, prendas y talles, plan de pago y cuponera. Se entra con el DNI del alumno.</small>
                </button>
                <button type="button" className="pf-opcion" onClick={() => { setModoComision(true); setError(''); }}>
                  <span className="pf-opcion-icono" aria-hidden="true">👥</span>
                  <b>Curso: soy de la comisión</b>
                  <small>El avance de toda la promo, quién tiene pendientes y la aprobación del diseño. Se entra con la clave de la comisión.</small>
                </button>
              </div>
            ) : (
              <form className="pf-card pf-ingreso" onSubmit={entrarComision}>
                <h2 className="pf-h2">Clave de la comisión</h2>
                <label className="campo">
                  <span className="sr-only">Clave de 6 números</span>
                  <input
                    value={clave}
                    onChange={(e) => { setClave(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6 números"
                    required
                    pattern="\d{6}"
                    className="pf-codigo-input"
                  />
                </label>
                <p className="pf-tenue">Son 6 números que les pasamos a la comisión. ¿No la tienen? <a href={linkWhatsApp(`¡Hola Paletta! Somos la comisión de ${promo.colegio} ${promo.curso} (${promo.codigo}) y necesitamos la clave de la comisión.`)} target="_blank" rel="noopener noreferrer">Pedila por WhatsApp</a>.</p>
                {error && <p className="aviso error" role="alert">{error}</p>}
                <div className="tb-botones">
                  <button type="button" className="btn btn-secundario" onClick={() => { setModoComision(false); setError(''); }}>Volver</button>
                  <button type="submit" className="btn" disabled={enviando || clave.length !== 6}>{enviando ? 'Entrando…' : 'Entrar al tablero'}</button>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </>
  );
};

export default Inicio;
