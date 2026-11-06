import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Marca } from './PortalApp';
import { EGRESADOS, api, conToken, diasHasta, fecha, guardarSesionComision, leerSesionComision, linkWhatsApp, mensajeError } from './utils';

const waLibre = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

const PASOS = [
  { clave: 'datos', titulo: 'Datos', porque: 'Con el nombre, el DNI y un adulto responsable de cada alumno armamos su cuponera.', accion: 'cargar los datos del alumno' },
  { clave: 'prendas', titulo: 'Prendas y talles', porque: 'Sin todos los talles no podemos cortar las telas ni pedir los bordados.', accion: 'elegir prendas y talles' },
  { clave: 'sena', titulo: 'Cuota 1', porque: 'La cuota 1 confirma el pedido de cada alumno: con todas pagas se aprueba el diseño y arranca la producción.', accion: 'pagar la cuota 1' },
  { clave: 'pagos', titulo: 'Pagos al día', porque: 'Solo mostramos si cada familia está al día o tiene una cuota pendiente: los montos los ve cada familia en su cuponera.' },
];

const ICONO = { completa: '✓', bloqueada: '🔒' };

const Copiar = ({ texto, children = 'Copiar link' }) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secundario btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch { /* sin portapapeles */ }
      }}
    >
      {ok ? '¡Copiado!' : children}
    </button>
  );
};

const Integrantes = ({ actuales, guardar }) => {
  const [lista, setLista] = useState(() => (actuales.length ? actuales : [{ nombre: '', telefono: '' }]).map((i) => ({ nombre: i.nombre || '', telefono: i.telefono || '' })));
  const [editando, setEditando] = useState(actuales.length === 0);
  const [error, setError] = useState('');

  if (!editando) {
    return (
      <div className="tb-integrantes">
        <ul>{actuales.map((i) => <li key={i.nombre}><b>{i.nombre}</b>{i.telefono ? ` · ${i.telefono}` : ''}</li>)}</ul>
        <button type="button" className="pf-link" onClick={() => setEditando(true)}>Editar integrantes</button>
      </div>
    );
  }
  const cambiar = (i, campo, valor) => setLista(lista.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  const enviar = async (e) => {
    e.preventDefault();
    const integrantes = lista.filter((x) => x.nombre.trim());
    if (!integrantes.length) return setError('Cargá al menos un nombre.');
    const err = await guardar(integrantes);
    setError(err);
    if (!err) setEditando(false);
    return undefined;
  };
  return (
    <form className="pf-form" onSubmit={enviar}>
      {lista.map((x, i) => (
        <div className="pf-fila" key={i}>
          <label className="campo">Nombre (ej.: Laura, mamá de Sofi)
            <input value={x.nombre} onChange={(e) => cambiar(i, 'nombre', e.target.value)} maxLength={80} />
          </label>
          <label className="campo">WhatsApp (opcional)
            <input value={x.telefono} onChange={(e) => cambiar(i, 'telefono', e.target.value)} type="tel" />
          </label>
        </div>
      ))}
      {lista.length < 8 && <button type="button" className="pf-link" onClick={() => setLista([...lista, { nombre: '', telefono: '' }])}>+ Sumar otro integrante</button>}
      {error && <p className="aviso error" role="alert">{error}</p>}
      <button type="submit" className="btn">Guardar comisión</button>
    </form>
  );
};

const AprobarDiseno = ({ tablero, aprobar }) => {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const { promo, puedeAprobarDiseno } = tablero;
  if (promo.disenoAprobadoEl) {
    return <p className="aviso exito">Aprobado por {promo.disenoAprobadoPor} el {new Date(promo.disenoAprobadoEl).toLocaleDateString('es-AR')}. ¡A producción!</p>;
  }
  if (!puedeAprobarDiseno) {
    return <p className="pf-tenue">🔒 Se desbloquea cuando todas las familias completan datos, prendas y la cuota 1. Mientras tanto, revisen juntos la propuesta de diseño que les mandamos.</p>;
  }
  const enviar = async (e) => {
    e.preventDefault();
    if (!window.confirm('¿Confirman el diseño final? Después de aprobarlo empieza la producción.')) return;
    setError(await aprobar(nombre));
  };
  return (
    <form className="pf-form" onSubmit={enviar}>
      <p>¡Está todo cargado! Cuando estén de acuerdo con la propuesta de diseño, apruébenla acá.</p>
      <label className="campo">¿Quién aprueba?
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={3} maxLength={80} placeholder="Nombre de quien aprueba" />
      </label>
      {error && <p className="aviso error" role="alert">{error}</p>}
      <button type="submit" className="btn">Aprobar el diseño final</button>
    </form>
  );
};

// Para entrar como comisión desde "Mi curso" (solo hace falta para editar la comisión y aprobar el diseño)
const ClaveComision = ({ codigo }) => {
  const navigate = useNavigate();
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const entrar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const { data } = await api.post('/comision/ingresar', { codigo, clave });
      guardarSesionComision({ token: data.token, codigo });
      navigate('/comision');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };
  return (
    <form className="pf-form tb-clave" onSubmit={entrar}>
      <label className="campo">¿Sos de la comisión? Clave de 6 números
        <input
          value={clave}
          onChange={(e) => { setClave(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          pattern="\d{6}"
          required
        />
      </label>
      {error && <p className="aviso error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-sm" disabled={enviando || clave.length !== 6}>{enviando ? 'Entrando…' : 'Entrar como comisión'}</button>
    </form>
  );
};

const TableroComision = () => {
  const { token, codigo } = useParams();
  const navigate = useNavigate();
  // Tres formas de verlo: "Mi curso" con el código (público, solo lectura), la sesión de la comisión
  // (clave) o el link secreto anterior (/comision/<token>)
  const publico = Boolean(codigo);
  const sesion = token || publico ? null : leerSesionComision();
  const base = publico ? `/codigo/${encodeURIComponent(codigo)}/curso` : token ? `/comision/${token}` : '/comision';
  const opciones = sesion ? conToken(sesion.token) : {};
  const salir = useCallback(() => {
    guardarSesionComision(null);
    navigate('/');
  }, [navigate]);
  const [tablero, setTablero] = useState(null);
  const [error, setError] = useState('');
  const [paso, setPaso] = useState(null);

  const cargar = useCallback(async () => {
    if (!publico && !token && !sesion) {
      navigate('/', { replace: true });
      return;
    }
    try {
      const { data } = await api.get(base, opciones);
      setTablero(data);
      setPaso((p) => p || (PASOS.find((x) => x.clave !== 'pagos' && !data.pasos[x.clave].completo)?.clave || 'pagos'));
    } catch (err) {
      if (err?.response?.status === 401) salir();
      else setError(mensajeError(err, 'No pudimos cargar el tablero.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, codigo, sesion?.token]);
  useEffect(() => { cargar(); }, [cargar]);

  const accion = async (metodo, ruta, datos) => {
    try {
      const { data } = await api[metodo](`${base}${ruta}`, datos, opciones);
      setTablero(data);
      return '';
    } catch (err) {
      return mensajeError(err);
    }
  };

  if (error) {
    return (
      <>
        <Marca />
        <main className="pf-main pf-angosto">
          <h1 className="pf-titulo">Mi curso</h1>
          <p className="aviso error" role="alert">{error}</p>
          <a className="btn" href={linkWhatsApp('¡Hola Paletta! Soy de una comisión de egresados y no puedo entrar al tablero.')} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>
        </main>
      </>
    );
  }
  if (!tablero) return <><Marca /><main className="pf-main pf-angosto"><p className="pf-cargando">Cargando…</p></main></>;

  const { promo, etapas, pasos, pagos, logros, linkFamilias } = tablero;
  const diasCierre = diasHasta(promo.fechaCierre);
  const actualPaso = PASOS.find((p) => p.clave === paso);
  const curso = `${promo.curso} · ${promo.colegio}`;
  const codigoPromo = tablero.codigo || sesion?.codigo || '';
  const portal = `${EGRESADOS.sitio}/mi-promo`;
  const comoEntrar = codigoPromo
    ? `entren a ${portal} con el código ${codigoPromo}, elijan “Mi pedido” y pongan el DNI del alumno`
    : `entren acá con el DNI del alumno: ${linkFamilias}`;
  // En la vista pública los pagos van solo en totales
  const pagosPrivados = tablero.publico && (paso === 'sena' || paso === 'pagos');

  let pendientes = [];
  let hechos = 0;
  let total = 0;
  if (paso === 'pagos') {
    pendientes = pagos.pendientes.map((p) => ({ ...p, motivo: 'tiene una cuota pendiente' }));
    hechos = pagos.alDia;
    total = pagos.conPlan;
  } else if (paso) {
    ({ pendientes, hechos, total } = pasos[paso]);
  }
  const recordatorio = (p) => (paso === 'pagos'
    ? `¡Hola! Soy de la comisión de ${curso}. Les recordamos que ${p.nombre} tiene una cuota pendiente. Para ver la cuponera, ${comoEntrar}.`
    : `¡Hola! Soy de la comisión de ${curso}. A ${p.nombre} le falta ${actualPaso.accion} (${p.motivo}). Para hacerlo, ${comoEntrar}.`);
  const recordatorioGrupal = paso === 'pagos' || pagosPrivados
    ? `¡Hola familias de ${curso}! Recuerden revisar las cuotas en la cuponera: ${comoEntrar}.`
    : `¡Hola familias de ${curso}! Para que las prendas lleguen a tiempo, todavía falta ${actualPaso?.accion} de: ${pendientes.map((p) => p.nombre).join(', ')}. Para hacerlo, ${comoEntrar}.`;

  return (
    <>
      <Marca>
        <span className="tb-quien">{tablero.publico ? 'Mi curso' : 'Comisión'} · {promo.curso} · {promo.anio}</span>
        {sesion && <button type="button" className="btn btn-secundario btn-sm" onClick={salir}>Salir</button>}
      </Marca>
      <main className="pf-main tb-main">
        <section className="pf-hero" aria-labelledby="tb-titulo">
          <div>
            <p className="eyebrow">Estado de la promo · {promo.colegio}</p>
            <h1 id="tb-titulo" className="pf-hero-titulo">{tablero.mensaje}</h1>
            {promo.fechaCierre && diasCierre !== null && !promo.disenoAprobadoEl && (
              <p className={`pf-cierre${diasCierre < 0 ? ' cerrado' : ''}`}>
                {diasCierre < 0 ? `La carga cerró el ${fecha(promo.fechaCierre)}` : diasCierre === 0 ? '⏳ La carga cierra hoy' : `⏳ Cierre de la carga en ${diasCierre} día${diasCierre === 1 ? '' : 's'} · ${fecha(promo.fechaCierre)}`}
              </p>
            )}
          </div>
          <div className="pf-anillo tb-anillo" style={{ '--p': tablero.porcentaje }} role="img" aria-label={`${tablero.porcentaje}% de la promo completa`}>
            <div><b>{tablero.porcentaje}%</b><span>de la promo</span></div>
          </div>
        </section>

        <ol className="tb-etapas" aria-label="Etapas de la promo">
          {etapas.map((e, i) => (
            <li key={e.clave} className={`tb-etapa ${e.estado}`} aria-current={e.estado === 'actual' ? 'step' : undefined}>
              <i aria-hidden="true">{ICONO[e.estado] || i + 1}</i>
              <b>{e.titulo}</b>
              <small>{e.quien}</small>
            </li>
          ))}
        </ol>

        <div className="tb-grilla">
          <section className="pf-card tb-detalle" aria-labelledby="tb-paso">
            <div className="tb-tabs" role="tablist" aria-label="Pasos de las familias">
              {PASOS.map((p) => {
                const listo = p.clave === 'pagos' ? pagos.conPlan > 0 && pagos.alDia === pagos.conPlan : pasos[p.clave].completo;
                return (
                  <button key={p.clave} type="button" role="tab" aria-selected={paso === p.clave} className={`tb-tab${listo ? ' listo' : ''}`} onClick={() => setPaso(p.clave)}>
                    {listo ? '✓ ' : ''}{p.titulo}
                  </button>
                );
              })}
            </div>
            <h2 id="tb-paso" className="pf-h2">
              {paso === 'pagos' ? `${hechos} de ${total} familias al día` : `${hechos} de ${total} familias completaron`}
            </h2>
            <div className="tb-barra" aria-hidden="true"><b style={{ width: `${total ? (hechos / total) * 100 : 0}%` }} /></div>
            <p className="pf-tenue">{actualPaso?.porque}</p>

            {pagosPrivados && hechos < total ? (
              <>
                <p className="aviso">Faltan {total - hechos}. Por privacidad, los pagos se muestran solo en totales: cada familia ve los suyos en su cuponera.</p>
                <a className="btn btn-sm" href={waLibre(recordatorioGrupal)} target="_blank" rel="noopener noreferrer">Mandar recordatorio al grupo</a>
              </>
            ) : pendientes.length === 0 ? (
              <p className="aviso exito">{total ? '¡Nadie pendiente en este paso! 🎉' : 'Todavía no hay familias en este paso.'}</p>
            ) : (
              <>
                <ul className="tb-pendientes">
                  {pendientes.map((p) => (
                    <li key={p.id}>
                      <span><b>{p.nombre}</b><small>{p.motivo}</small></span>
                      <span className="tb-tag">Pendiente</span>
                      <a className="tb-wa" href={waLibre(recordatorio(p))} target="_blank" rel="noopener noreferrer">Recordar por WhatsApp</a>
                    </li>
                  ))}
                </ul>
                <a className="btn btn-sm" href={waLibre(recordatorioGrupal)} target="_blank" rel="noopener noreferrer">Mandar recordatorio al grupo</a>
              </>
            )}
          </section>

          <div className="tb-lateral">
            <section className="pf-card" aria-labelledby="tb-logros">
              <h2 id="tb-logros" className="pf-h2">Logros de la promo</h2>
              <ul className="tb-logros">
                {logros.map((l) => (
                  <li key={l.clave} className={l.logrado ? 'on' : ''}>
                    <span aria-hidden="true">{l.icono}</span>{l.titulo}
                    <span className="sr-only">{l.logrado ? ' (logrado)' : ' (pendiente)'}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pf-card" aria-labelledby="tb-link">
              <h2 id="tb-link" className="pf-h2">Cómo entran las familias</h2>
              <p className="pf-tenue">{codigoPromo ? <>En <b>{portal}</b> (botón “Mi promo”) con el código:</> : 'Con este link y el DNI del alumno:'}</p>
              <code className="tb-link">{codigoPromo || linkFamilias}</code>
              <div className="tb-botones">
                <Copiar texto={codigoPromo || linkFamilias}>{codigoPromo ? 'Copiar código' : 'Copiar link'}</Copiar>
                <a className="btn btn-sm" href={waLibre(`¡Hola familias de ${curso}! Para cargar los datos, talles y ver la cuponera de egresados, ${comoEntrar}.`)} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a>
              </div>
              <p className="pf-tenue">Paletta también les manda recordatorios por mail a las familias que ya cargaron su email.</p>
            </section>
          </div>
        </div>

        <div className="tb-grilla tb-grilla-pareja">
          <section className="pf-card" aria-labelledby="tb-comision">
            <h2 id="tb-comision" className="pf-h2">La comisión</h2>
            {tablero.publico ? (
              <>
                {tablero.integrantes.length
                  ? <ul className="tb-integrantes-lista">{tablero.integrantes.map((i) => <li key={i.nombre}>{i.nombre}</li>)}</ul>
                  : <p className="pf-tenue">Todavía no cargaron quiénes son.</p>}
                <ClaveComision codigo={codigoPromo} />
              </>
            ) : (
              <Integrantes actuales={tablero.integrantes} guardar={(integrantes) => accion('put', '/integrantes', { integrantes })} />
            )}
          </section>
          <section className="pf-card" aria-labelledby="tb-diseno">
            <h2 id="tb-diseno" className="pf-h2">Diseño final</h2>
            {tablero.publico && !promo.disenoAprobadoEl ? (
              <p className="pf-tenue">
                {tablero.puedeAprobarDiseno
                  ? '¡Está todo cargado! La comisión ya puede aprobar el diseño final entrando con su clave.'
                  : '🔒 Se desbloquea cuando todas las familias completan datos, prendas y la cuota 1. Lo aprueba la comisión con su clave.'}
              </p>
            ) : (
              <AprobarDiseno tablero={tablero} aprobar={(nombre) => accion('post', '/diseno', { nombre })} />
            )}
          </section>
        </div>

        <p className="pf-tenue pf-centro">
          {tablero.publico
            ? 'Esto lo ve cualquier familia con el código de la promo.'
            : sesion ? 'La clave es solo para la comisión: no la compartan en el grupo.' : 'Este link es solo para la comisión: no lo compartan en el grupo.'} ¿Dudas? <a href={linkWhatsApp(`¡Hola Paletta! Soy de la comisión de ${curso} (${promo.anio}). Tengo una consulta:`)} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>.
        </p>
      </main>
    </>
  );
};

export default TableroComision;
