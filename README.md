# Paletta

Sitio de Paletta (uniformes escolares e indumentaria de egresados): catálogo público por colegio y panel de administración.

- **frontend/**: React 18 + Vite. Sitio público y panel `/admin`.
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
| frontend | `npm test` | Tests (Jest + Testing Library) |
| frontend | `npm run build` | Build de producción en `frontend/dist` |

### Variables de entorno

- `backend/.env.example`: base de datos, `JWT_SECRET` (obligatorio en producción), CORS, SMTP opcional para el formulario de contacto.
- `frontend/.env.example`: `VITE_API_URL` (vacío si front y API comparten dominio) y `VITE_MOSTRAR_PRECIOS` (`false` = modo catálogo, `true` = muestra precios y stock).

## Despliegue en VPS

Esquema: nginx sirve el build del frontend y las imágenes subidas, y hace proxy de `/api` al backend en Node, gestionado con pm2. Todo bajo el mismo dominio, sin problemas de CORS.

```bash
# En la VPS (una vez): Node 20+, PostgreSQL, nginx, pm2 (npm i -g pm2), certbot
sudo -u postgres createuser -P paletta
sudo -u postgres createdb -O paletta paletta

git clone <repo> /var/www/paletta && cd /var/www/paletta

# Backend
cd backend
cp .env.example .env    # NODE_ENV=production, DB_*, JWT_SECRET, CORS_ORIGINS, MAIL_* (opcional)
npm ci --omit=dev
npm run db:migrate
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed
cd ..
pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup

# Frontend
cd frontend
cp .env.example .env    # VITE_API_URL vacío; VITE_MOSTRAR_PRECIOS según corresponda
npm ci && npm run build

# nginx + HTTPS
sudo cp ../deploy/nginx.conf /etc/nginx/sites-available/paletta   # ajustar dominio y rutas
sudo ln -s /etc/nginx/sites-available/paletta /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d paletta.com.ar -d www.paletta.com.ar
```

Actualizar una versión:

```bash
cd /var/www/paletta && git pull
(cd backend && npm ci --omit=dev && npm run db:migrate) && pm2 restart paletta-api
(cd frontend && npm ci && npm run build)
```

### Backups (importante)

- Base: `pg_dump paletta | gzip > backup-$(date +%F).sql.gz`, programado con cron y copiado fuera de la VPS.
- Imágenes: `backend/public/uploads/` vive solo en el servidor (no está en git), así que hay que incluirla en el backup.

Healthcheck para monitoreo: `GET /api/health`.

## API (resumen)

Públicos: `GET /api/productos/public[/:id]`, `GET /api/colegios[/:id][/productos]`, `GET /api/categorias`, `POST /api/contacto`, `POST /api/auth/login`.

Solo administradores (`Authorization: Bearer <token>`): CRUD de `/api/productos`, `/api/categorias`, `/api/colegios` (`/api/colegios/admin` lista también los inactivos), `/api/usuarios`, `/api/imagenes`, y la bandeja de `/api/contacto`.
