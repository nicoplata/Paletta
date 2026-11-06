#!/usr/bin/env bash
# Backup diario de la base, de las imágenes subidas y de los comprobantes de pago. Conserva los últimos 14 días.
# Cron sugerido (crontab -e del usuario que corre la app):
#   15 3 * * * /var/www/paletta/deploy/backup.sh >> /var/log/paletta-backup.log 2>&1
# Lee las credenciales de backend/.env. Copiá además /var/backups/paletta FUERA de la VPS
# (por ejemplo con rclone a Google Drive/S3): un backup en el mismo disco no protege de perderlo.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="${BACKUP_DIR:-/var/backups/paletta}"
DIAS="${BACKUP_DIAS:-14}"
FECHA="$(date +%F_%H%M)"

set -a
# shellcheck disable=SC1091
source "$RAIZ/backend/.env"
set +a

mkdir -p "$DESTINO"

PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
  -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-paletta}" \
  --format=custom "${DB_NAME:-paletta}" > "$DESTINO/db_$FECHA.dump"

tar -czf "$DESTINO/uploads_$FECHA.tar.gz" -C "$RAIZ/backend/public" uploads

# Comprobantes de pago de egresados (carpeta privada, fuera de lo público)
if [ -d "$RAIZ/backend/private" ]; then
  tar -czf "$DESTINO/privado_$FECHA.tar.gz" -C "$RAIZ/backend" private
fi

find "$DESTINO" -type f -mtime +"$DIAS" -delete

echo "$(date -Is) backup OK: $DESTINO (db_$FECHA.dump, uploads_$FECHA.tar.gz, privado_$FECHA.tar.gz)"
# Restaurar la base: pg_restore --clean --if-exists -d paletta db_FECHA.dump
