import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowDown, FaArrowLeft, FaArrowUp, FaCloudUploadAlt, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';
import api, { mensajeError } from '../../../lib/api';
import useRecurso from '../../../hooks/useRecurso';
import { useToast } from '../../../context/ToastContext';
import { Button, Container, Empty, ErrorBox, FormGroup, Header, Hint, IconButton, Input, Label, Row, Select, Title } from '../adminUI';
import InstagramAdmin from './InstagramAdmin';
import './fotos.css';

const SITIO = 'https://egresados.paletta.com.ar';
const LADO_MAX = 2400; // se achica en el navegador antes de subir (más rápido y sin límite de peso)

// Achica la foto en el navegador (respeta la orientación de la cámara) y la devuelve como JPEG
async function prepararFoto(archivo) {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return archivo;
  try {
    const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
    if (escala === 1 && archivo.size < 4 * 1024 * 1024) return archivo;
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bmp.width * escala);
    lienzo.height = Math.round(bmp.height * escala);
    lienzo.getContext('2d').drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.9));
    return blob ? new File([blob], archivo.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : archivo;
  } catch {
    return archivo;
  }
}

// Acepta el link que se copia del diseñador (…/disena.html#tipo=…) o el link corto de un diseño (…/d/abcd1234)
const normalizarDiseno = (txt) => {
  const t = String(txt || '').trim();
  const corto = t.match(/\/d\/([A-Za-z0-9]{6,12})\b/);
  if (corto) return `dz=${corto[1]}`;
  return t.includes('#') ? t.slice(t.indexOf('#') + 1) : t;
};

// Una foto de la galería: se edita en el lugar y se guarda al salir del campo
const FotoCard = ({ f, primero, ultimo, onGuardar, onMover, onBorrar }) => {
  const [d, setD] = useState({ alt: f.alt, anio: f.anio, colegio: f.colegio, diseno: f.diseno, tipo: f.tipoClave });
  const guardar = (campo) => {
    const valor = campo === 'diseno' ? normalizarDiseno(d.diseno) : d[campo];
    if (campo === 'diseno' && valor !== d.diseno) setD({ ...d, diseno: valor });
    if (valor !== (campo === 'tipo' ? f.tipoClave : f[campo])) onGuardar(f, { [campo]: valor });
  };
  return (
    <li className={`foto-card${f.visible ? '' : ' oculta'}`}>
      <a href={f.foto} target="_blank" rel="noopener noreferrer" className="foto-img"><img src={f.mini} alt={f.alt} loading="lazy" />{!f.visible && <span className="foto-oculta">Oculta</span>}</a>
      <div className="foto-campos">
        <Input aria-label="Descripción de la foto" value={d.alt} onChange={(e) => setD({ ...d, alt: e.target.value })} onBlur={() => guardar('alt')} placeholder="Qué se ve en la foto" maxLength={200} />
        <div className="foto-fila">
          <Select aria-label="Tipo" value={d.tipo} onChange={(e) => { setD({ ...d, tipo: e.target.value }); onGuardar(f, { tipo: e.target.value }); }}>
            <option value="promo">Promo real</option>
            <option value="diseno">Diseño</option>
          </Select>
          <Input aria-label="Año" value={d.anio} onChange={(e) => setD({ ...d, anio: e.target.value.replace(/\D/g, '').slice(0, 4) })} onBlur={() => guardar('anio')} placeholder="Año" inputMode="numeric" style={{ width: 80 }} />
        </div>
        <Input aria-label="Colegio" value={d.colegio} onChange={(e) => setD({ ...d, colegio: e.target.value })} onBlur={() => guardar('colegio')} placeholder="Colegio (opcional)" />
        <Input aria-label="Diseño en el diseñador" value={d.diseno} onChange={(e) => setD({ ...d, diseno: e.target.value })} onBlur={() => guardar('diseno')} placeholder="Link al diseñador (opcional)" />
      </div>
      <div className="foto-acciones">
        <IconButton type="button" onClick={() => onMover(f, -1)} disabled={primero} aria-label="Mover antes"><FaArrowUp /></IconButton>
        <IconButton type="button" onClick={() => onMover(f, 1)} disabled={ultimo} aria-label="Mover después"><FaArrowDown /></IconButton>
        <IconButton type="button" onClick={() => onGuardar(f, { visible: !f.visible })} aria-label={f.visible ? 'Ocultar del sitio' : 'Mostrar en el sitio'} title={f.visible ? 'Ocultar del sitio' : 'Mostrar en el sitio'}>{f.visible ? <FaEye /> : <FaEyeSlash />}</IconButton>
        <IconButton type="button" $peligro onClick={() => onBorrar(f)} aria-label="Eliminar foto"><FaTrash /></IconButton>
      </div>
    </li>
  );
};

// Fotos de buzos del sitio de egresados: se suben, se optimizan solas y se publican sin deploy
const FotosEgresadosAdmin = () => {
  const { showToast } = useToast();
  const { data: fotos, setData: setFotos, cargando, error, recargar } = useRecurso('/admin/egresados/fotos', { porDefecto: [] });
  const [tanda, setTanda] = useState({ tipo: 'promo', anio: String(new Date().getFullYear()), colegio: '' });
  const [cola, setCola] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef(null);
  const subiendo = cola.some((c) => c.estado === 'subiendo' || c.estado === 'esperando');

  const subir = async (archivos) => {
    const lista = [...archivos].filter((a) => a.type.startsWith('image/'));
    if (!lista.length) return;
    const nuevos = lista.map((a, i) => ({ id: `${Date.now()}-${i}`, nombre: a.name, estado: 'esperando' }));
    setCola((c) => [...nuevos, ...c]);
    let ok = 0;
    // De a una: cada foto viaja ya achicada y el servidor la convierte a WebP en dos tamaños
    for (const [i, archivo] of lista.entries()) {
      const id = nuevos[i].id;
      setCola((c) => c.map((x) => (x.id === id ? { ...x, estado: 'subiendo' } : x)));
      try {
        const datos = new FormData();
        Object.entries(tanda).forEach(([k, v]) => datos.append(k, v));
        datos.append('fotos', await prepararFoto(archivo));
        const { data } = await api.post('/admin/egresados/fotos', datos, { timeout: 120000 });
        ok += data.fotos.length;
        setCola((c) => c.map((x) => (x.id === id ? { ...x, estado: data.fotos.length ? 'lista' : 'error', error: data.errores?.[0] } : x)));
      } catch (err) {
        setCola((c) => c.map((x) => (x.id === id ? { ...x, estado: 'error', error: mensajeError(err) } : x)));
      }
    }
    if (ok) showToast(`${ok} foto${ok === 1 ? '' : 's'} publicada${ok === 1 ? '' : 's'} en el sitio`, 'success');
    recargar();
  };

  const guardar = async (f, cambios) => {
    try {
      const { data } = await api.put(`/admin/egresados/fotos/${f.id}`, cambios);
      setFotos((l) => l.map((x) => (x.id === f.id ? data : x)));
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };
  const mover = async (f, paso) => {
    const i = fotos.findIndex((x) => x.id === f.id);
    const nueva = [...fotos];
    [nueva[i], nueva[i + paso]] = [nueva[i + paso], nueva[i]];
    setFotos(nueva);
    try {
      await api.put('/admin/egresados/fotos/orden', { ids: nueva.map((x) => x.id) });
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
      recargar();
    }
  };
  const borrar = async (f) => {
    if (!window.confirm('¿Eliminar esta foto del sitio?')) return;
    try {
      await api.delete(`/admin/egresados/fotos/${f.id}`);
      setFotos((l) => l.filter((x) => x.id !== f.id));
    } catch (err) {
      showToast(mensajeError(err), 'error', 6000);
    }
  };

  const visibles = fotos.filter((f) => f.visible).length;

  return (
    <Container>
      <Header>
        <div>
          <Link to="/admin/dashboard/egresados" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 6 }}><FaArrowLeft /> Egresados</Link>
          <Title>Fotos e Instagram</Title>
        </div>
        <Button as="a" href={`${SITIO}/#promos`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>Ver la galería</Button>
      </Header>
      <Hint style={{ marginBottom: 14 }}>Las fotos aparecen en la galería del inicio de egresados.paletta.com.ar (y los diseños también en Modelos). Se achican y se convierten a WebP solas, sin los datos de la cámara ni la ubicación. Pedí permiso antes de publicar fotos donde se vean chicos.</Hint>

      <InstagramAdmin />

      <section className={`fotos-subida${arrastrando ? ' arrastrando' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); subir(e.dataTransfer.files); }}>
        <Row style={{ flexWrap: 'wrap' }}>
          <FormGroup>
            <Label htmlFor="g-tipo">Tipo</Label>
            <Select id="g-tipo" value={tanda.tipo} onChange={(e) => setTanda({ ...tanda, tipo: e.target.value })}>
              <option value="promo">Promo real (fotos con la promo)</option>
              <option value="diseno">Diseño (prenda o render)</option>
            </Select>
          </FormGroup>
          <FormGroup><Label htmlFor="g-anio">Año</Label><Input id="g-anio" value={tanda.anio} inputMode="numeric" onChange={(e) => setTanda({ ...tanda, anio: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></FormGroup>
          <FormGroup><Label htmlFor="g-colegio">Colegio (opcional)</Label><Input id="g-colegio" value={tanda.colegio} onChange={(e) => setTanda({ ...tanda, colegio: e.target.value })} /></FormGroup>
        </Row>
        <button type="button" className="fotos-drop" onClick={() => input.current?.click()} disabled={subiendo}>
          <FaCloudUploadAlt aria-hidden="true" />
          <strong>{subiendo ? 'Subiendo…' : 'Arrastrá las fotos acá o tocá para elegirlas'}</strong>
          <small>JPG, PNG, WEBP o AVIF · varias a la vez · se publican apenas terminan de subir</small>
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => { subir(e.target.files); e.target.value = ''; }} />
        {cola.length > 0 && (
          <ul className="fotos-cola" aria-live="polite">
            {cola.slice(0, 12).map((c) => (
              <li key={c.id} className={c.estado}>
                <span>{c.nombre}</span>
                <span>{{ esperando: 'En espera', subiendo: 'Optimizando…', lista: 'Publicada ✓', error: c.error || 'No se pudo subir' }[c.estado]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <ErrorBox>{error}</ErrorBox>}
      <h2 style={{ margin: '20px 0 10px' }}>Galería <small style={{ fontWeight: 400, color: '#7f8c8d' }}>· {visibles} visibles de {fotos.length}</small></h2>
      {cargando && !fotos.length ? <Empty>Cargando...</Empty> : fotos.length === 0 ? <Empty>Todavía no hay fotos: el sitio muestra las que tiene fijas en el código hasta que subas la primera.</Empty> : (
        <ul className="fotos-grilla">
          {fotos.map((f, i) => (
            <FotoCard key={f.id} f={f} primero={i === 0} ultimo={i === fotos.length - 1} onGuardar={guardar} onMover={mover} onBorrar={borrar} />
          ))}
        </ul>
      )}
    </Container>
  );
};

export default FotosEgresadosAdmin;
