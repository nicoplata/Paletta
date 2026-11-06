# Paletta

Sitio de Paletta (uniformes escolares e indumentaria de egresados): catálogo público por colegio, tienda online (carrito, Mercado Pago y transferencia, cupones, envío por zona) y panel de administración. El sitio de egresados con el diseñador de buzos vive aparte en https://egresados.paletta.com.ar (repo `nicoplata/paletta-egresados`) y comparte la misma estética.

- **frontend/**: React 18 + Vite. Sitio público y panel `/admin`. Aparte, el portal de familias de egresados (`portal/`, `npm run dev:portal`, build en `dist-portal/`).
- **backend/**: Node 20+ con Express 5, Sequelize y PostgreSQL. API REST en `/api`.
- **deploy/**: configuración de ejemplo para la VPS (nginx y pm2).

## Desarrollo local

Requisitos: Node 20+ y PostgreSQL 14+.

```bash
# 1. Base de datos
createdb paletta

# 2. Backend
cd backend
cp .env.example .env        # completar DB_* (en desarrollo JWT_SECRET puede quedar vacío)
npm install
npm run db:migrate          # crea o actualiza las tablas
ADMIN_EMAIL=admin@paletta.com.ar ADMIN_PASSWORD='una-clave-larga' npm run seed
npm run dev                 # http://localhost:3000

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173 (redirige /api y /uploads al backend)
```

Panel de administración: `http://localhost:5173/admin`.

### Scripts útiles

| Dónde | Comando | Qué hace |
|---|---|---|
| backend | `npm run db:migrate` | Aplica migraciones pendientes (`-- status` / `-- down`) |
| backend | `npm run seed` | Crea/actualiza el admin (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) y categorías base |
| frontend | `npm run lint` | ESLint |
| backend | `npm test` / `npm run lint` | Tests de integración (node:test + supertest) / ESLint |
| frontend | `npm test` | Tests (Vitest + Testing Library) |
| frontend | `npm run build` | Build de producción en `frontend/dist` |

### Estilos

- `frontend/src/styles/base.css`: variables de diseño (colores, tipografía, espaciado), reset y componentes comunes (`.btn`, `.campo`, `.pagina`, `.aviso`). Se carga una sola vez en `main.jsx`.
- Sitio público: un CSS por sección que usa solo esas variables. Panel admin: styled-components (`pages/admin/adminUI.jsx`) con las mismas variables.
- SEO por página con el hook `useSeo` (título, descripción, canonical, Open Graph, `noindex`, JSON-LD).

### Variables de entorno

- `backend/.env.example`: base de datos, `JWT_SECRET` (obligatorio en producción), CORS, SMTP opcional para el formulario de contacto.
- Tienda: `TIENDA_HABILITADA`, Mercado Pago (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`), transferencia (`TRANSFERENCIA_*`), envío (`ENVIO_*`). Ver `deploy/VPS.md` §9.
- `frontend/.env.example`: `VITE_API_URL` (vacío si front y API comparten dominio) y `VITE_MOSTRAR_PRECIOS` (`false` = modo catálogo, `true` = muestra precios y stock).

## Tests y CI

```bash
# Backend: tests de integración contra un Postgres real (base "paletta_test", se recrea en cada corrida)
createdb paletta_test
cd backend && npm run lint && npm test

# Frontend: Vitest + Testing Library
cd frontend && npm run lint && npm test
```

El backend toma la conexión de las variables `DB_*` (o del `.env`), y el nombre de la base de tests de `TEST_DB_NAME`.
GitHub Actions (`.github/workflows/ci.yml`) corre lint, tests, build y `npm audit` en cada push a `main` y en cada PR.

## Despliegue

Producción: VPS Ubuntu con nginx y pm2, en **www.paletta.com.ar**. La guía paso a paso está en [`deploy/VPS.md`](deploy/VPS.md).

- `deploy/nginx.conf`: sirve el frontend y las imágenes, hace proxy de `/api`, redirige `paletta.com.ar` a `www` y agrega cabeceras de seguridad.
- `deploy/ecosystem.config.cjs`: configuración de pm2 para la API.
- `deploy/deploy.sh`: actualización (pull, dependencias, migraciones, build y reload).
- `deploy/backup.sh`: backup diario de la base y de las imágenes (`backend/public/uploads`, que no está en git).

Healthcheck para monitoreo: `GET /api/health`. SEO: `GET /sitemap.xml` y páginas de producto/colegio con metadatos servidas por el backend (ver `deploy/VPS.md` §10).

## API (resumen)

Públicos: `GET /api/productos/public[/:id]`, `GET /api/colegios[/:id][/productos]`, `GET /api/categorias`, `POST /api/contacto`, `POST /api/auth/login`.

Tienda (pública): `GET /api/tienda/config`, `POST /api/pedidos`, `GET /api/pedidos/:token`, `POST /api/pedidos/:token/pagar`, `POST /api/pedidos/:token/verificar-pago`, `POST /api/pagos/webhook` (Mercado Pago, firma verificada).

Tienda (pública, extra): `POST /api/cupones/validar`, `GET /api/envio/cotizar?cp=`.

Egresados (portal de familias, `egresados.paletta.com.ar/mi-promo/<slug>`): `GET /api/egresados/promos/:slug`, `POST /api/egresados/promos/:slug/ingresar` (alumno + DNI), `POST /api/egresados/promos/:slug/alumnos`, y con el token de la familia `GET /api/egresados/mi-promo`, `PUT /api/egresados/mi-promo/{datos,prendas,plan}`.

Solo administradores (`Authorization: Bearer <token>`): `/api/admin/egresados` (promos, prendas, alumnos, cuotas y pagos, búsqueda por código/DNI, cuenta para transferencias) y `/api/admin/pedidos` (listado, resumen, detalle, cambio de estado, notas, `exportar` a CSV), `/api/admin/cupones`, `/api/admin/zonas-envio` y: CRUD de `/api/productos`, `/api/categorias`, `/api/colegios` (`/api/colegios/admin` lista también los inactivos), `/api/usuarios`, `/api/imagenes`, y la bandeja de `/api/contacto`.
