#!/usr/bin/env bash
# Actualiza Paletta en la VPS a la última versión de la rama indicada.
# Uso: ./deploy/deploy.sh [rama]     (por defecto: main)
set -euo pipefail

RAMA="${1:-main}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

echo "==> Actualizando código ($RAMA)"
git fetch origin "$RAMA"
git checkout "$RAMA"
git pull --ff-only origin "$RAMA"

echo "==> Backend: dependencias y migraciones"
(cd backend && npm ci --omit=dev && npm run db:migrate)

echo "==> Frontend: build"
(cd frontend && npm ci && npm run build)

echo "==> Reiniciando API"
if pm2 describe paletta-api >/dev/null 2>&1; then
  pm2 reload paletta-api
else
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
fi

echo "==> Verificando"
sleep 2
curl -fsS http://127.0.0.1:3000/api/health && echo " API OK"
