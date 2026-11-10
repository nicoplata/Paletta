// Feed de Instagram de @paletta.egresados (API de Instagram con inicio de sesión de Instagram).
// - El token largo (60 días) se carga desde el panel y se renueva solo cuando faltan menos de 20 días.
// - Cada 30 minutos se traen las últimas publicaciones y se guardan las imágenes optimizadas (WebP)
//   en el servidor: los links de Instagram vencen y así los visitantes no cargan nada de Meta.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ENV = require('../config/env');
const { Configuracion } = require('../models');
const { AppError } = require('../utils/errorHandler');

const CLAVE = 'instagram';
const DIR = path.join(ENV.UPLOADS_DIR, 'instagram');
const URL_IMG = '/api/egresados/instagram/img';
const CANTIDAD = 12;
const DIA = 24 * 60 * 60 * 1000;
const RENOVAR_ANTES = 20 * DIA;
const CAMPOS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

fs.mkdirSync(DIR, { recursive: true });

async function leer() {
  const fila = await Configuracion.findByPk(CLAVE);
  return fila ? { ...fila.valor } : {};
}
const guardar = (valor) => Configuracion.upsert({ clave: CLAVE, valor });

async function ig(ruta, params) {
  const url = `${ENV.IG_API_URL}${ruta}?${new URLSearchParams(params)}`;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new AppError('No se pudo conectar con Instagram. Probá de nuevo en un rato.', 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msj = data.error?.message || `HTTP ${res.status}`;
    const err = new AppError(res.status === 400 || res.status === 401 || data.error?.code === 190
      ? 'Instagram rechazó el token: generá uno nuevo y pegalo en el panel.'
      : `Instagram respondió con un error: ${msj}`, res.status === 400 || res.status === 401 ? 400 : 502);
    err.detalleInstagram = msj;
    throw err;
  }
  return data;
}

const tokenActual = (estado) => estado.token || ENV.IG_ACCESS_TOKEN || null;

// Verifica el token contra Instagram y lo guarda (se pega desde el panel)
async function conectar(token) {
  const yo = await ig('/me', { fields: 'user_id,username', access_token: token });
  const estado = await leer();
  await guardar({ ...estado, token, usuario: yo.username, expira: Date.now() + 60 * DIA, conectadoEl: new Date().toISOString(), error: null });
  return sincronizar();
}

async function desconectar() {
  const estado = await leer();
  (estado.items || []).forEach((it) => fs.rmSync(path.join(DIR, it.archivo), { force: true }));
  await Configuracion.destroy({ where: { clave: CLAVE } });
}

// Renueva el token largo si está por vencer (Instagram lo permite una vez que tiene más de 24 h)
async function renovarSiHaceFalta(estado) {
  const token = tokenActual(estado);
  if (!token || !estado.expira || estado.expira - Date.now() > RENOVAR_ANTES) return estado;
  const r = await ig('/refresh_access_token', { grant_type: 'ig_refresh_token', access_token: token });
  const nuevo = { ...estado, token: r.access_token, expira: Date.now() + (Number(r.expires_in) || 60 * 24 * 3600) * 1000 };
  await guardar(nuevo);
  return nuevo;
}

async function descargarImagen(url, archivo) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`imagen HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await sharp(buffer).rotate().resize({ width: 640, height: 640, fit: 'cover', position: 'attention' }).webp({ quality: 76 }).toFile(path.join(DIR, archivo));
}

// Trae las últimas publicaciones y guarda las imágenes que falten
async function sincronizar() {
  let estado = await leer();
  const token = tokenActual(estado);
  if (!token) return estado;
  try {
    estado = await renovarSiHaceFalta(estado);
    const { data = [] } = await ig('/me/media', { fields: CAMPOS, limit: String(CANTIDAD), access_token: tokenActual(estado) });
    const previos = new Map((estado.items || []).map((it) => [it.id, it]));
    const items = [];
    for (const m of data.slice(0, CANTIDAD)) {
      const fuente = m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url;
      if (!fuente || !/^\d+$/.test(String(m.id))) continue;
      const archivo = `${m.id}.webp`;
      if (!previos.has(m.id) || !fs.existsSync(path.join(DIR, archivo))) {
        try { await descargarImagen(fuente, archivo); } catch { continue; }
      }
      items.push({
        id: m.id,
        archivo,
        tipo: m.media_type,
        permalink: m.permalink,
        texto: String(m.caption || '').slice(0, 300),
        fecha: m.timestamp,
      });
    }
    // Borra las imágenes de publicaciones que ya no están entre las últimas
    const vigentes = new Set(items.map((it) => it.archivo));
    (estado.items || []).forEach((it) => { if (!vigentes.has(it.archivo)) fs.rmSync(path.join(DIR, it.archivo), { force: true }); });
    estado = { ...estado, items, sincronizadoEl: new Date().toISOString(), error: null };
  } catch (err) {
    estado = { ...estado, error: err.message, errorEl: new Date().toISOString() };
    console.error('[instagram]', err.detalleInstagram || err.message);
  }
  await guardar(estado);
  return estado;
}

// Lo que ve el sitio (sin token ni datos internos)
async function feedPublico() {
  const estado = await leer();
  return {
    usuario: estado.usuario || 'paletta.egresados',
    perfil: `https://www.instagram.com/${estado.usuario || 'paletta.egresados'}/`,
    items: (estado.items || []).map((it) => ({
      id: it.id, imagen: `${URL_IMG}/${it.archivo}`, tipo: it.tipo, link: it.permalink, texto: it.texto, fecha: it.fecha,
    })),
  };
}

// Lo que ve el panel
async function estadoPanel() {
  const estado = await leer();
  return {
    conectado: Boolean(tokenActual(estado)),
    desdeVariable: !estado.token && Boolean(ENV.IG_ACCESS_TOKEN),
    usuario: estado.usuario || null,
    expira: estado.expira ? new Date(estado.expira).toISOString() : null,
    sincronizadoEl: estado.sincronizadoEl || null,
    publicaciones: (estado.items || []).length,
    error: estado.error || null,
  };
}

function programarInstagram() {
  const tarea = () => sincronizar().catch((err) => console.error('[instagram]', err.message));
  setTimeout(tarea, 20 * 1000).unref();
  setInterval(tarea, 30 * 60 * 1000).unref();
}

module.exports = { conectar, desconectar, sincronizar, feedPublico, estadoPanel, programarInstagram, DIR_INSTAGRAM: DIR, URL_INSTAGRAM: URL_IMG };
