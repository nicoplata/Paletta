#!/usr/bin/env bash
# Hace que nginx (y la API) vean la IP real de cada visitante detrás de Cloudflare.
# Sin esto, todos los pedidos parecen venir de unas pocas IPs de Cloudflare y los límites
# de intentos (login, DNI del portal de egresados, contacto) se comparten entre muchas personas.
#
# Uso (con tu usuario administrador):  sudo ./deploy/cloudflare-real-ip.sh
# Conviene volver a correrlo cada tanto (Cloudflare cambia sus rangos muy de vez en cuando).
set -euo pipefail

DEST=/etc/nginx/conf.d/cloudflare-real-ip.conf
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

{
  echo "# Generado por deploy/cloudflare-real-ip.sh el $(date -I). No editar a mano."
  for v in 4 6; do
    curl -fsS "https://www.cloudflare.com/ips-v$v"
    echo
  done | grep -E '^[0-9a-fA-F:.]+/[0-9]+$' | sed 's/^/set_real_ip_from /; s/$/;/'
  echo "real_ip_header CF-Connecting-IP;"
} > "$TMP"

if [ "$(grep -c set_real_ip_from "$TMP")" -lt 10 ]; then
  echo "No se pudo bajar la lista de IPs de Cloudflare. No se cambió nada." >&2
  exit 1
fi

install -m 644 "$TMP" "$DEST"
nginx -t
systemctl reload nginx
echo "Listo: $(grep -c set_real_ip_from "$DEST") rangos de Cloudflare en $DEST"
