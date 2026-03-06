#!/bin/bash
# Deploy SOLO sito TEST. Produzione non viene toccata.
# Eseguire sul droplet: bash scripts/deploy-test-prod.sh
# Per produzione (quando tutto è verificato): bash scripts/deploy-prod.sh

set -e

wait_for_app() {
  local name=$1
  local port=$2
  echo -n "Attendo avvio $name (max 30s)..."
  sleep 3
  for n in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$port/" 2>/dev/null || echo "000")
    if echo "$code" | grep -qE "^(200|301|302|307)$"; then
      echo " OK ($code)"
      return 0
    fi
    sleep 2
    echo -n "."
  done
  echo " (app avviata, verifica: curl http://127.0.0.1:$port)"
  return 0
}

echo "=== Deploy TEST (produzione non toccata) ==="
cd /var/www/pronostici-sito-test
git pull origin main
mkdir -p public/uploads
rm -rf .next
npm ci
npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
# Assicura che i chunk server siano presenti (fix MODULE_NOT_FOUND chunks)
cp -r .next/server/chunks .next/standalone/.next/server/ 2>/dev/null || true
node scripts/remove-netwin-from-bookmakers.mjs 2>/dev/null || true
node scripts/add-netwin-it0002.mjs 2>/dev/null || true
cp -r data .next/standalone/ 2>/dev/null || true
# Env per standalone (API_FOOTBALL_KEY, ecc.): prima test, poi fallback da produzione
if [ -f .env.local ]; then cp .env.local .next/standalone/; elif [ -f .env ]; then cp .env .next/standalone/; fi
if [ ! -f .next/standalone/.env.local ] && [ ! -f .next/standalone/.env ]; then
  [ -f /var/www/pronostici-sito/.env.local ] && cp /var/www/pronostici-sito/.env.local .next/standalone/ || true
  [ -f /var/www/pronostici-sito/.env ] && cp /var/www/pronostici-sito/.env .next/standalone/ || true
fi
pm2 delete pronostici-test 2>/dev/null; pm2 start ecosystem.config.cjs --only pronostici-test
wait_for_app "pronostici-test" 3001 || true
echo ""
echo "=== Deploy TEST completato ==="
echo "Verifica il sito test. Poi promuovi a produzione:"
echo "  bash scripts/deploy-promote-test-to-prod.sh   (copia data da test + deploy prod)"
echo "  oppure: bash scripts/deploy-prod.sh           (solo deploy prod, senza copia data)"
echo "Se vedi 502: bash scripts/debug-502.sh"
