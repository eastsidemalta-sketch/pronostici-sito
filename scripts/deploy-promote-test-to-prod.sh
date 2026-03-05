#!/bin/bash
# Promuove il sito TEST → PRODUZIONE.
# Copia data/ da test a prod (bookmakers, config admin) e fa deploy prod.
# Eseguire sul droplet: bash scripts/deploy-promote-test-to-prod.sh
#
# Flusso: 1) copia data da test 2) pull + build + restart prod

set -e

TEST_DIR="/var/www/pronostici-sito-test"
PROD_DIR="/var/www/pronostici-sito"

wait_for_app() {
  local name=$1
  local port=$2
  local max=30
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

echo "=== Promozione TEST → PRODUZIONE ==="

# 1. Copia data da test a prod (bookmakers.json, config admin, ecc.)
if [ -d "$TEST_DIR/data" ]; then
  echo "1. Copio data/ da test a prod..."
  mkdir -p "$PROD_DIR/data"
  for f in "$TEST_DIR/data"/*; do
    [ -e "$f" ] && cp -f "$f" "$PROD_DIR/data/" 2>/dev/null || true
  done
  echo "   OK"
else
  echo "1. Cartella data test non trovata, proseguo senza copia"
fi

# 2. Deploy produzione (pull, build, restart)
echo ""
echo "2. Deploy produzione..."
cd "$PROD_DIR"
git pull origin main
mkdir -p public/uploads
npm ci
npm run build
node scripts/apply-netwin-config.mjs 2>/dev/null || true
pm2 restart pronostici || pm2 start npm --name pronostici -- start
wait_for_app "pronostici" 3000 || true

echo ""
echo "=== Promozione completata ==="
echo "Produzione aggiornata con codice e data dal sito test."
echo "Se vedi 502: bash scripts/debug-502.sh"
