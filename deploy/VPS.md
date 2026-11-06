# Instalación en la VPS (Ubuntu) — www.paletta.com.ar

Guía para la primera puesta en producción. Supone Ubuntu con Node 20+, PostgreSQL, nginx y git ya instalados.
Los comandos con `sudo` se corren con tu usuario administrador; el resto, con el usuario que va a correr la app
(en esta guía, `paletta`).

## 0. DNS

En el proveedor del dominio, dos registros `A` apuntando a la IP de la VPS:

| Nombre | Tipo | Valor |
|---|---|---|
| `paletta.com.ar` (o `@`) | A | IP de la VPS |
| `www` | A | IP de la VPS |

Verificá con `dig +short www.paletta.com.ar` antes del paso 6 (certbot lo necesita).

## 1. Usuario, pm2 y firewall

```bash
sudo adduser --disabled-password --gecos "" paletta
sudo npm install -g pm2
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

El puerto 3000 de la API **no** se abre: solo lo usa nginx desde localhost.

## 2. Base de datos (desde cero)

Como la base actual se puede descartar, se borra y se crea limpia con su propio usuario:

```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS paletta;"
sudo -u postgres psql -c "DROP ROLE IF EXISTS paletta;"
sudo -u postgres psql -c "CREATE ROLE paletta LOGIN PASSWORD 'CAMBIAR_POR_UNA_CLAVE_LARGA';"
sudo -u postgres psql -c "CREATE DATABASE paletta OWNER paletta;"
```

> Si la base actual tiene otro nombre, ajustá el `DROP DATABASE`.

## 3. Código

```bash
sudo mkdir -p /var/www/paletta && sudo chown paletta:paletta /var/www/paletta
sudo -iu paletta
git clone https://github.com/nicoplata/Paletta.git /var/www/paletta
cd /var/www/paletta
```

## 4. Backend

```bash
cd /var/www/paletta/backend
cp .env.example .env
nano .env
```

Valores a completar en `.env`:

- `NODE_ENV=production`
- `DB_PASSWORD=` la clave del paso 2
- `JWT_SECRET=` generalo con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `CORS_ORIGINS=https://www.paletta.com.ar,https://paletta.com.ar` (ya viene así)
- `MAIL_*` y `CONTACT_TO` si querés recibir por mail los mensajes de contacto (opcional: igual quedan en el panel)

```bash
chmod 600 .env
npm ci --omit=dev
npm run db:migrate
ADMIN_EMAIL=tu-email@paletta.com.ar ADMIN_PASSWORD='una-clave-de-al-menos-10' npm run seed

cd /var/www/paletta
pm2 start deploy/ecosystem.config.cjs
pm2 save
curl http://127.0.0.1:3000/api/health      # -> {"ok":true}
```

Para que pm2 arranque solo al reiniciar la VPS, corré `pm2 startup` y ejecutá (como admin) el comando `sudo ...` que te muestra.
Logs: `pm2 logs paletta-api`. Para que no crezcan sin límite: `pm2 install pm2-logrotate`.

## 5. Frontend

```bash
cd /var/www/paletta/frontend
cp .env.example .env      # VITE_API_URL vacío; VITE_MOSTRAR_PRECIOS=false (catálogo) o true
npm ci && npm run build   # genera frontend/dist, que sirve nginx
```

## 6. nginx + HTTPS

```bash
sudo cp /var/www/paletta/deploy/nginx.conf /etc/nginx/sites-available/paletta
sudo ln -s /etc/nginx/sites-available/paletta /etc/nginx/sites-enabled/paletta
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d www.paletta.com.ar -d paletta.com.ar --redirect
```

Certbot renueva el certificado solo (`systemctl list-timers | grep certbot` para verificarlo).

nginx lee `frontend/dist` y `backend/public/uploads` con su usuario (`www-data`), así que necesita permiso de lectura:

```bash
sudo chmod 755 /var/www/paletta /var/www/paletta/frontend /var/www/paletta/backend /var/www/paletta/backend/public
```

## 7. Backups

```bash
sudo mkdir -p /var/backups/paletta && sudo chown paletta:paletta /var/backups/paletta
sudo touch /var/log/paletta-backup.log && sudo chown paletta:paletta /var/log/paletta-backup.log
/var/www/paletta/deploy/backup.sh        # probarlo una vez
crontab -e                               # como usuario paletta, agregar:
# 15 3 * * * /var/www/paletta/deploy/backup.sh >> /var/log/paletta-backup.log 2>&1
```

Importante: copiá `/var/backups/paletta` fuera de la VPS (rclone a Google Drive/S3, o un `scp` periódico).

## 8. Verificación final

- https://www.paletta.com.ar carga, y https://paletta.com.ar redirige a www.
- https://www.paletta.com.ar/admin: entrar con el admin del paso 4, crear un colegio con logo y un producto con imagen.
- Verlos en el sitio público y enviar un mensaje de contacto (tiene que aparecer en *Mensajes*).

## 9. Tienda online (cuando quieras activarla)

La tienda viene apagada (`TIENDA_HABILITADA=false`): el sitio funciona como catálogo. Para activarla:

1. **Cargar talles y stock** de cada producto desde el panel (Productos → editar → *Talles y stock*).
2. **Mercado Pago** (opcional):
   - En https://www.mercadopago.com.ar/developers/panel/app creá una aplicación (*Pagos online → Checkout Pro*).
   - Copiá el **Access Token de producción** en `MP_ACCESS_TOKEN`.
   - En *Webhooks* configurá la URL `https://www.paletta.com.ar/api/pagos/webhook` con el evento **Pagos**,
     y copiá la **clave secreta** en `MP_WEBHOOK_SECRET` (sin ella, en producción se rechazan las notificaciones).
   - Para probar primero, usá las credenciales de prueba y los usuarios de prueba de Mercado Pago.
3. **Transferencia** (opcional): completá `TRANSFERENCIA_ALIAS` y/o `TRANSFERENCIA_CBU`, `TRANSFERENCIA_TITULAR`, `TRANSFERENCIA_BANCO`.
4. **Envío**: desde el panel → *Envíos* podés cargar zonas por rango de código postal con su costo y demora
   (si cargás zonas, solo se envía a esos códigos postales). Sin zonas se usa el costo fijo `ENVIO_COSTO`.
   `ENVIO_GRATIS_DESDE` activa el envío gratis desde un monto, y `ENVIO_HABILITADO=false` deja solo el retiro.
5. **Cupones**: se crean en el panel → *Cupones* (porcentaje o monto fijo, compra mínima, vigencia y límite de usos).
   Si un pedido se cancela, el uso del cupón se devuelve.
6. **Exportar pedidos**: en el panel → *Pedidos*, "Exportar pedidos" (uno por fila, para administración) o
   "Exportar prendas" (una fila por prenda con talle y cantidad, para producción). El CSV abre directo en Excel.
7. **Mails**: configurá `MAIL_*` y `CONTACT_TO` para que el cliente reciba la confirmación y vos el aviso de cada pedido pagado.
8. `SITE_URL=https://www.paletta.com.ar` y `TIENDA_HABILITADA=true` en `backend/.env`, y `pm2 reload paletta-api`.

Los pedidos impagos vencen solos (60 min con Mercado Pago, 48 h con transferencia, configurable) y su stock vuelve a estar disponible.
Los pedidos se gestionan en el panel → *Pedidos*.

## 10. SEO y vistas previas al compartir

Desde la versión con SEO, el backend arma las páginas de producto y de colegio con su propio título,
descripción e imagen (lo que muestran WhatsApp, Facebook y Google), y genera `sitemap.xml`.
Para eso nginx tiene que enviarle esas rutas. **`deploy.sh` no toca la configuración de nginx**, así que,
si tu servidor usa una configuración propia (por ejemplo, con Cloudflare), agregá estos bloques dentro del
`server { ... }` del sitio, **antes** de `location / { ... }` (están también en `deploy/nginx.conf`):

```nginx
location = /sitemap.xml {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ~ ^/(producto/[0-9]+|colegios/[0-9]+/productos)/?$ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_intercept_errors on;
    error_page 502 503 504 = @spa;
}

location @spa {
    try_files /index.html =404;
}
```

Y para que la vieja página `/egresados` lleve al sitio de egresados (redirección permanente):

```nginx
location ~ ^/egresados/?$ {
    return 301 https://egresados.paletta.com.ar/;
}
```

Después: `sudo nginx -t && sudo systemctl reload nginx`. Si el backend se cae, esas páginas siguen funcionando
con el `index.html` normal.

Verificación:

```bash
curl -s https://www.paletta.com.ar/sitemap.xml | head
curl -s https://www.paletta.com.ar/producto/1 | grep -E "<title>|og:image"
```

Recomendado: dar de alta el sitio en [Google Search Console](https://search.google.com/search-console),
enviar `https://www.paletta.com.ar/sitemap.xml` y probar un link de producto en el
[depurador de Facebook](https://developers.facebook.com/tools/debug/) (refresca la vista previa que también usa WhatsApp).

## 11. Portal de egresados (egresados.paletta.com.ar/mi-promo)

Las familias de cada promo cargan los datos del alumno, eligen prendas, talles y plan, y ven su cuponera.
Vos lo manejás desde el panel → *Egresados*. El portal es un build aparte (`frontend/dist-portal`, lo arma
`deploy.sh`) y lo sirve el nginx del sitio de egresados junto con `/api/egresados/`.

1. Actualizar la configuración de nginx de egresados con la del repo `paletta-egresados`
   (`deploy/nginx-egresados.conf`, bloques `/mi-promo/` y `/api/egresados/`), conservando tus rutas del certificado.
2. Para que los límites de intentos (DNI, login, contacto) cuenten por visitante y no por servidor de
   Cloudflare, generá la lista de IPs de Cloudflare para nginx (una vez, y cada tanto):

   ```bash
   sudo /var/www/paletta/deploy/cloudflare-real-ip.sh
   ```
3. En el panel → *Egresados*, cargá la cuenta para transferencias de egresados y creá la primera promo.
   El link que se copia ahí es el que la comisión comparte en el grupo del curso.

`EGRESADOS_URL` (opcional, por defecto `https://egresados.paletta.com.ar`) define los links del portal y el
origen permitido para su API.

**Entrada única:** familias y comisión entran por `egresados.paletta.com.ar/mi-promo/` (botón *Mi promo* del sitio)
con el **código de la promo** (el del contrato, ej. `EGR27-K7M2`; se genera solo o lo cargás vos en el panel).
Ahí eligen *Individual* (familia: se identifica con el DNI del alumno) o *Curso* (comisión: clave de 6 números).
El código y la clave están en el panel, en la promo, con botones para copiar el mensaje para cada uno. Si la clave
se filtra, *Generar clave nueva* cierra las sesiones abiertas de la comisión. Los links directos anteriores siguen andando.

**Tablero de la comisión:** muestra las etapas, el avance y qué le falta a cada alumno (sin DNI, contactos ni montos);
desde ahí la comisión manda recordatorios por WhatsApp y aprueba el diseño final.

**Recordatorios por mail:** la API manda sola, cada hora entre las 9 y las 21, avisos a las familias que cargaron
su email: 7 y 2 días antes del cierre de la carga (si les falta algo) y antes y después de cada vencimiento.
Nunca repite un aviso. Necesita el correo configurado (`MAIL_*`); para probarlo:

```bash
cd /var/www/paletta/backend && npm run mail:prueba
```

El comando muestra la configuración que lee, envía un mail de prueba a `CONTACT_TO` y, si falla, el motivo.

**Comprobantes de transferencia:** las familias los suben desde la cuponera (PDF o imagen, hasta 6 MB) y se
revisan en el panel → *Egresados* → *Comprobantes*. Se guardan en `backend/private/comprobantes`, que **no** se
sirve como archivo público: solo se ven desde el panel o por la familia dueña. `deploy/backup.sh` los incluye
(`privado_FECHA.tar.gz`). Para que entren archivos de hasta 6 MB, el bloque `/api/egresados/` del nginx de egresados
tiene que tener `client_max_body_size 7m;` (está en `deploy/nginx-egresados.conf` del repo de egresados).

**Avisos a las familias:** al pasar una promo a *En producción*, *Listo para entregar* o *Entregado*, y al confirmar
o rechazar un pago, las familias con email reciben un mail (uno por evento, sin repetir).

## Actualizaciones

```bash
sudo -iu paletta
cd /var/www/paletta && ./deploy/deploy.sh main
```

El script baja el código, instala dependencias, aplica migraciones, rearma el frontend y recarga la API sin cortes.
