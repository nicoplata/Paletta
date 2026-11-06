import { useMemo, useState } from 'react';
import { EGRESADOS, fecha, formatearDni, linkWhatsApp, nombrePlan, pesos, previsualizarPlan } from './utils';

const Aviso = ({ tipo = 'error', children }) => (children ? <p className={`aviso ${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</p> : null);

function avisoBloqueo(bloqueos) {
  if (bloqueos.conPagos) return 'Ya hay pagos registrados, así que el pedido quedó confirmado. Para cambiar algo, escribinos por WhatsApp.';
  if (bloqueos.cerrado) return 'La carga de la promo ya cerró. Para cambiar algo, escribinos por WhatsApp.';
  return '';
}

// ---------- 1. Datos ----------
export const PasoDatos = ({ alumno, guardar }) => {
  const [form, setForm] = useState({
    nombre: alumno.nombre || '',
    dni: alumno.dni || '',
    responsableNombre: alumno.responsableNombre || '',
    responsableEmail: alumno.responsableEmail || '',
    responsableTelefono: alumno.responsableTelefono || '',
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cambiar = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(await guardar('datos', form, 'prendas'));
    setEnviando(false);
  };

  return (
    <form onSubmit={enviar} className="pf-form">
      <h2 className="pf-h2">Datos del alumno/a</h2>
      <div className="pf-fila">
        <label className="campo">Nombre y apellido
          <input name="nombre" value={form.nombre} onChange={cambiar} required minLength={3} maxLength={120} autoComplete="off" />
        </label>
        <label className="campo">DNI
          <input name="dni" value={form.dni} onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value.replace(/\D/g, '') }))} required inputMode="numeric" minLength={7} maxLength={8} autoComplete="off" />
        </label>
      </div>
      <h2 className="pf-h2">Adulto responsable</h2>
      <p className="pf-tenue">Le escribimos por los pagos y la entrega. No lo ve nadie más de la promo.</p>
      <div className="pf-fila">
        <label className="campo">Nombre y apellido
          <input name="responsableNombre" value={form.responsableNombre} onChange={cambiar} required minLength={3} maxLength={120} autoComplete="name" />
        </label>
        <label className="campo">WhatsApp
          <input name="responsableTelefono" value={form.responsableTelefono} onChange={cambiar} required type="tel" placeholder="11 5555-1234" autoComplete="tel" />
        </label>
      </div>
      <label className="campo">Email
        <input name="responsableEmail" value={form.responsableEmail} onChange={cambiar} required type="email" autoComplete="email" />
      </label>
      <Aviso>{error}</Aviso>
      <button type="submit" className="btn" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar y seguir →'}</button>
    </form>
  );
};

// ---------- 2. Prendas y talles ----------
const itemsIniciales = (alumno) => alumno.selecciones.map((s) => ({
  clave: `s${s.id}`, prendaId: s.prendaId, talle: s.talle, bordado: s.bordado || '', cantidad: s.cantidad,
}));

export const PasoPrendas = ({ alumno, promo, guardar }) => {
  const [items, setItems] = useState(() => itemsIniciales(alumno));
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const bloqueo = avisoBloqueo(alumno.bloqueos);
  const editable = alumno.bloqueos.puedeEditarPedido;
  const porId = useMemo(() => new Map(promo.prendas.map((p) => [p.id, p])), [promo.prendas]);
  const subtotal = items.reduce((a, it) => a + (porId.get(it.prendaId)?.precio || 0) * it.cantidad, 0);

  const agregar = (prenda) => setItems((xs) => [...xs, { clave: `n${Date.now()}${xs.length}`, prendaId: prenda.id, talle: '', bordado: '', cantidad: 1 }]);
  const cambiar = (clave, campo, valor) => {
    setError('');
    setItems((xs) => xs.map((x) => (x.clave === clave ? { ...x, [campo]: valor } : x)));
  };
  const quitar = (clave) => setItems((xs) => xs.filter((x) => x.clave !== clave));

  const enviar = async (e) => {
    e.preventDefault();
    if (items.length === 0) return setError('Elegí al menos una prenda.');
    const sinTalle = items.find((it) => !it.talle);
    if (sinTalle) return setError(`Elegí el talle de ${porId.get(sinTalle.prendaId)?.nombre || 'cada prenda'}.`);
    setEnviando(true);
    const err = await guardar('prendas', { items: items.map(({ prendaId, talle, bordado, cantidad }) => ({ prendaId, talle, bordado, cantidad })) }, 'plan');
    setError(err);
    setEnviando(false);
    return undefined;
  };

  return (
    <form onSubmit={enviar} className="pf-form">
      <h2 className="pf-h2">Prendas y talles</h2>
      <p className="pf-tenue">
        Podés sumar más de una prenda. ¿No sabés el talle? Mirá la <a href={`${EGRESADOS.sitio}/talles.html`} target="_blank" rel="noopener noreferrer">guía de talles</a>.
      </p>
      <Aviso tipo="">{bloqueo}</Aviso>

      {editable && (
        <div className="pf-catalogo">
          {promo.prendas.map((p) => (
            <div key={p.id} className="pf-prenda">
              <div>
                <b>{p.nombre}</b>
                <span>{pesos(p.precio)}{p.conBordado ? ' · con bordado' : ''}</span>
                {p.descripcion && <small>{p.descripcion}</small>}
              </div>
              <button type="button" className="btn btn-secundario btn-sm" onClick={() => agregar(p)}>+ Agregar</button>
            </div>
          ))}
          {promo.prendas.length === 0 && <p className="pf-tenue">Todavía no hay prendas cargadas para la promo.</p>}
        </div>
      )}

      {items.length > 0 && (
        <ul className="pf-elegidas">
          {items.map((it) => {
            const prenda = porId.get(it.prendaId);
            if (!prenda) return null;
            return (
              <li key={it.clave} className="pf-elegida">
                <div className="pf-elegida-top">
                  <b>{prenda.nombre}</b>
                  <span>{pesos(prenda.precio * it.cantidad)}</span>
                  {editable && <button type="button" className="pf-quitar" onClick={() => quitar(it.clave)} aria-label={`Quitar ${prenda.nombre}`}>✕</button>}
                </div>
                <div className="pf-talles" role="radiogroup" aria-label={`Talle de ${prenda.nombre}`}>
                  {prenda.talles.map((t) => (
                    <button key={t} type="button" role="radio" className="chip" aria-checked={it.talle === t} disabled={!editable} onClick={() => cambiar(it.clave, 'talle', t)}>{t}</button>
                  ))}
                </div>
                <div className="pf-fila">
                  {prenda.conBordado && (
                    <label className="campo">Nombre o apodo para el bordado
                      <input value={it.bordado} onChange={(e) => cambiar(it.clave, 'bordado', e.target.value.toUpperCase())} maxLength={20} placeholder="Ej.: SOFI" disabled={!editable} />
                    </label>
                  )}
                  <label className="campo pf-cantidad">Cantidad
                    <select value={it.cantidad} onChange={(e) => cambiar(it.clave, 'cantidad', Number(e.target.value))} disabled={!editable}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pf-total"><span>Total de prendas</span><b>{pesos(subtotal)}</b></div>
      {alumno.totales.ajuste !== 0 && (
        <p className="pf-tenue">Además hay un ajuste de {pesos(alumno.totales.ajuste)}{alumno.ajusteMotivo ? ` (${alumno.ajusteMotivo})` : ''}.</p>
      )}
      <Aviso>{error}</Aviso>
      {editable && <button type="submit" className="btn" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar y seguir →'}</button>}
    </form>
  );
};

// ---------- 3. Plan de pago ----------
export const PasoPlan = ({ alumno, promo, guardar, irA }) => {
  const [plan, setPlan] = useState(alumno.plan || null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const bloqueo = avisoBloqueo(alumno.bloqueos);
  const editable = alumno.bloqueos.puedeEditarPedido;
  const base = Math.max(0, alumno.totales.subtotal + alumno.totales.ajuste);

  if (!alumno.progreso.datos || !alumno.progreso.prendas) {
    return (
      <div className="pf-form">
        <h2 className="pf-h2">Plan de pago</h2>
        <p className="aviso">Para elegir el plan, primero completá {!alumno.progreso.datos ? 'los datos' : 'las prendas y los talles'}.</p>
        <button type="button" className="btn" onClick={() => irA(!alumno.progreso.datos ? 'datos' : 'prendas')}>Ir a completar</button>
      </div>
    );
  }

  const enviar = async (e) => {
    e.preventDefault();
    if (!plan) return setError('Elegí un plan.');
    setEnviando(true);
    setError(await guardar('plan', { plan }, 'cuponera'));
    setEnviando(false);
    return undefined;
  };

  return (
    <form onSubmit={enviar} className="pf-form">
      <h2 className="pf-h2">¿Cómo vas a pagar?</h2>
      <p className="pf-tenue">
        Las cuotas vencen una por mes desde el {fecha(promo.primerVencimiento)}.
        {promo.recargoTipo && promo.recargoValor ? ` Pagando después del vencimiento se suma un recargo de ${promo.recargoTipo === 'porcentaje' ? `${promo.recargoValor}%` : pesos(promo.recargoValor)}.` : ''}
      </p>
      <Aviso tipo="">{bloqueo}</Aviso>
      <div className="pf-planes" role="radiogroup" aria-label="Plan de pago">
        {promo.planes.slice().sort((a, b) => a - b).map((n) => {
          const p = previsualizarPlan(base, n, promo.descuentoContado);
          return (
            <button key={n} type="button" role="radio" aria-checked={plan === n} className="pf-plan" disabled={!editable} onClick={() => { setPlan(n); setError(''); }}>
              <span className="pf-plan-nombre">{nombrePlan(n, promo.descuentoContado)}</span>
              <b>{n === 1 ? pesos(p.total) : `${n} × ${pesos(p.cuota)}`}</b>
              <small>{n === 1 ? `Ahorrás ${pesos(p.descuento)}` : `Total ${pesos(p.total)}`}</small>
            </button>
          );
        })}
      </div>
      <Aviso>{error}</Aviso>
      {editable && <button type="submit" className="btn" disabled={enviando}>{enviando ? 'Armando la cuponera…' : 'Confirmar y ver mi cuponera →'}</button>}
    </form>
  );
};

// ---------- 4. Cuponera ----------
const Copiar = ({ texto, etiqueta }) => {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setTimeout(() => setOk(false), 1800);
    } catch { /* sin permiso de portapapeles: el texto igual está a la vista */ }
  };
  return (
    <button type="button" className="pf-copiar" onClick={copiar} aria-label={`Copiar ${etiqueta}`}>
      {ok ? '¡Copiado!' : 'Copiar'}
    </button>
  );
};

const ESTADOS = {
  pagada: { texto: 'Pagada', clase: 'ok' },
  pendiente: { texto: 'Pendiente', clase: '' },
  vencida: { texto: 'Vencida', clase: 'vencida' },
};

export const PasoCuponera = ({ vista, irA }) => {
  const { alumno, promo, cuenta } = vista;
  if (!alumno.cuotas.length) {
    return (
      <div className="pf-form">
        <h2 className="pf-h2">Cuponera</h2>
        <p className="aviso">La cuponera se arma cuando elegís el plan de pago.</p>
        <button type="button" className="btn" onClick={() => irA('plan')}>Elegir plan</button>
      </div>
    );
  }
  const hayCuenta = cuenta && (cuenta.alias || cuenta.cbu);

  return (
    <div className="pf-form">
      <div className="pf-cup-head">
        <div>
          <h2 className="pf-h2">Cuponera de {alumno.nombre}</h2>
          <p className="pf-tenue">DNI {formatearDni(alumno.dni)} · {nombrePlan(alumno.plan, promo.descuentoContado)} · Código {alumno.codigo}</p>
        </div>
        <div className="pf-saldos">
          <div><span>Total</span><b>{pesos(alumno.totales.total)}</b></div>
          <div><span>Pagado</span><b>{pesos(alumno.totales.pagado)}</b></div>
          <div><span>Saldo</span><b>{pesos(alumno.totales.saldo)}</b></div>
        </div>
      </div>

      <ol className="pf-cupones">
        {alumno.cuotas.map((c) => {
          const e = ESTADOS[c.estado];
          return (
            <li key={c.id} className={`pf-cupon ${e.clase}`}>
              <div className="pf-cupon-n"><small>Cuota</small><b>{c.numero}</b><small>de {Math.max(alumno.plan, alumno.cuotas.length)}</small></div>
              <div className="pf-cupon-datos">
                <span className={`pf-estado ${e.clase}`}>{e.texto}</span>
                <b className="pf-cupon-importe">{pesos(c.aPagar)}</b>
                <span>
                  {c.estado === 'pagada'
                    ? `Pagada el ${fecha(c.pagadaEl)}${c.medio ? ` · ${c.medio}` : ''}`
                    : `Vence el ${fecha(c.vencimiento)}`}
                  {c.recargo > 0 && c.estado !== 'pagada' ? ` · incluye ${pesos(c.recargo)} de recargo` : ''}
                </span>
                <span className="pf-codigo"><code>{c.codigo}</code>{c.estado !== 'pagada' && <Copiar texto={c.codigo} etiqueta={`código de la cuota ${c.numero}`} />}</span>
              </div>
              {c.estado !== 'pagada' && (
                <a
                  className="btn btn-secundario btn-sm pf-cupon-wa"
                  href={linkWhatsApp(`¡Hola Paletta! Pagué la cuota ${c.numero} de ${alumno.nombre} (código ${c.codigo}). Te mando el comprobante:`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Avisar que pagué
                </a>
              )}
            </li>
          );
        })}
      </ol>

      <h2 className="pf-h2">¿Cómo pago?</h2>
      <div className="pf-medios">
        <div className="pf-medio">
          <p className="eyebrow">Transferencia</p>
          {hayCuenta ? (
            <dl>
              {cuenta.alias && <><dt>Alias</dt><dd>{cuenta.alias} <Copiar texto={cuenta.alias} etiqueta="alias" /></dd></>}
              {cuenta.cbu && <><dt>CBU/CVU</dt><dd>{cuenta.cbu} <Copiar texto={cuenta.cbu} etiqueta="CBU" /></dd></>}
              {cuenta.titular && <><dt>Titular</dt><dd>{cuenta.titular}</dd></>}
              {cuenta.cuit && <><dt>CUIT</dt><dd>{cuenta.cuit}</dd></>}
              {cuenta.banco && <><dt>Banco</dt><dd>{cuenta.banco}</dd></>}
            </dl>
          ) : <p className="pf-tenue">Pedinos los datos por WhatsApp.</p>}
          <p className="pf-tenue">Poné el <b>código de la cuota</b> en el concepto y avisanos con el botón “Avisar que pagué”.</p>
        </div>
        <div className="pf-medio">
          <p className="eyebrow">Efectivo en el local</p>
          <p><b>{EGRESADOS.direccion}</b></p>
          <p className="pf-tenue">{EGRESADOS.horarios}</p>
          <p className="pf-tenue">Decinos el código de la cuota o el DNI del alumno.</p>
        </div>
      </div>
    </div>
  );
};
