#!/bin/bash
# Deploy SOLO sito TEST. Produzione non viene toccata.
# Eseguire sul droplet: bash scripts/deploy-test-prod.sh
# Per produzione (quando tutto è verificato): bash scripts/deploy-prod.sh

set -e

wait_for_app() {
  local name=$1
  local port=$2
  local max=60
  local n=0
  echo -n "Attendo avvio $name sulla porta $port..."
  while [ $n -lt $max ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$port" 2>/dev/null | grep -q "200\|301\|302"; then
      echo " OK"
      return 0
    fi
    sleep 2
    n=$((n + 1))
    echo -n "."
  done
  echo " TIMEOUT - controlla: pm2 logs $name"
  return 1
}

echo "=== Deploy TEST (produzione non toccata) ==="
cd /var/www/pronostici-sito-test
git pull origin main
mkdir -p public/uploads
npm ci
npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r data .next/standalone/ 2>/dev/null || true
node scripts/apply-netwin-config.mjs 2>/dev/null || true
pm2 delete pronostici-test 2>/dev/null; pm2 start ecosystem.config.cjs --only pronostici-test
wait_for_app "pronostici-test" 3001 || true
echo ""
echo "=== Deploy TEST completato ==="
echo "Verifica il sito test. Quando tutto ok: bash scripts/deploy-prod.sh"
echo "Se vedi 502: bash scripts/debug-502.sh"
