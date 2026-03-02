#!/bin/bash
# Abilita upload fino a 10MB su nginx (test + produzione)
# Sul droplet: bash scripts/nginx-upload-limit.sh

set -e

LIMIT="client_max_body_size 10M"
processed=""

for dir in /etc/nginx/sites-available /etc/nginx/conf.d; do
  [ ! -d "$dir" ] && continue
  for f in "$dir"/*; do
    [ -f "$f" ] || continue
    [[ "$processed" == *"$f"* ]] && continue
    if grep -q "client_max_body_size" "$f"; then
      echo "  $f: già presente"
    else
      sudo sed -i "/server {/a \\    $LIMIT;" "$f"
      echo "  $f: aggiunto"
    fi
    processed="$processed $f"
  done
done

echo ""
sudo nginx -t && sudo systemctl reload nginx
echo "Fatto. Upload 10MB abilitato."
