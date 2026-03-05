#!/bin/bash
# Promuove il sito TEST → PRODUZIONE.
# Copia data/ da test a prod (bookmakers, config admin) e fa deploy prod.
# Eseguire sul droplet: bash scripts/deploy-promote-test-to-prod.sh
#
# Flusso: 1) pull prod (reset locale se conflitti) 2) copia data da test 3) build + restart

set -e

TEST_DIR="/var/www/pronostici-sito-test"
PROD_DIR="/var/www/pronostici-sito"

wait_for_app() {
  local name=$1
  local port=$2
  local max=45
  local n=0
  echo -n "Attendo avvio $name sulla porta $port..."
  sleep 5
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

# 1. Aggiorna codice prod (reset locale se ci sono conflitti)
echo "1. Aggiorno codice produzione..."
cd "$PROD_DIR"
git fetch origin main
if ! git pull origin main 2>/dev/null; then
  echo "   Conflitti locali, ripristino a origin/main..."
  git reset --hard origin/main
  git clean -fd data/ 2>/dev/null || true
fi

# 2. Copia data da test a prod (bookmakers, config admin)
if [ -d "$TEST_DIR/data" ]; then
  echo ""
  echo "2. Copio data/ da test a prod..."
  mkdir -p "$PROD_DIR/data"
  for f in "$TEST_DIR/data"/*; do
    [ -e "$f" ] && cp -f "$f" "$PROD_DIR/data/" 2>/dev/null || true
  done
  echo "   OK"
else
  echo "2. Cartella data test non trovata"
fi

# 3. Build e restart (standalone come test)
echo ""
echo "3. Build e restart produzione..."
mkdir -p public/uploads
rm -rf .next
npm ci
npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
node scripts/apply-netwin-config.mjs 2>/dev/null || true
cp -r data .next/standalone/ 2>/dev/null || true
if [ -f .env.local ]; then cp .env.local .next/standalone/; elif [ -f .env ]; then cp .env .next/standalone/; fi
cp scripts/start-standalone.sh .next/standalone/ 2>/dev/null || true
chmod +x .next/standalone/start-standalone.sh 2>/dev/null || true
pm2 delete pronostici 2>/dev/null; pm2 start "$PROD_DIR/ecosystem.config.cjs" --only pronostici
wait_for_app "pronostici" 3000 || true
if ! curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000" 2>/dev/null | grep -q "200\|301\|302"; then
  echo ""
  echo "=== Ultimi log pronostici (diagnostica) ==="
  pm2 logs pronostici --lines 15 --nostream 2>/dev/null || true
fi

echo ""
echo "=== Promozione completata ==="
echo "Produzione aggiornata con codice e data dal sito test."
echo "Se vedi 502: bash scripts/debug-502.sh"
