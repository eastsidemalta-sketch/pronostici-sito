#!/bin/bash
# Promuove il sito TEST → PRODUZIONE.
# Copia data/ da test a prod (bookmakers, config admin) e fa deploy prod.
# Eseguire sul droplet: bash scripts/deploy-promote-test-to-prod.sh
#
# Flusso: 1) backup data prod nel repo 2) pull 3) copia data da test 4) build + restart

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
    if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$port" 2>/dev/null | grep -qE "^(200|301|302|307)$"; then
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

# 1. Salva i dati di produzione nel repo PRIMA di sovrascrivere (così non perdiamo paesi/menu)
cd "$PROD_DIR"
if [ -d ".next/standalone/data" ]; then
  echo "1a. Salvo dati produzione nel repo (backup prima della promozione)..."
  mkdir -p data
  for f in .next/standalone/data/*; do
    [ -e "$f" ] && [ -f "$f" ] && cp -f "$f" data/ 2>/dev/null || true
  done
  git add data/ 2>/dev/null || true
  if ! git diff --staged --quiet 2>/dev/null; then
    git commit -m "Sync data da produzione (backup pre-promozione)" || true
    git push origin main 2>/dev/null || echo "   ATTENZIONE: push fallito"
  fi
fi

# 2. Aggiorna codice prod (reset locale se ci sono conflitti)
echo "1b. Aggiorno codice produzione..."
git fetch origin main
if ! git pull origin main 2>/dev/null; then
  echo "   Conflitti locali, ripristino a origin/main..."
  git reset --hard origin/main
  git clean -fd data/ 2>/dev/null || true
fi

# 3. Copia data da test a prod (test è la source of truth per la promozione)
if [ -d "$TEST_DIR/data" ]; then
  echo "3a. Normalizzo Netwin su test..."
  (cd "$TEST_DIR" && node scripts/remove-netwin-from-bookmakers.mjs) || true
  (cd "$TEST_DIR" && node scripts/add-netwin-it0002.mjs) || true
  echo ""
  echo "3b. Copio data/ da test a prod..."
  mkdir -p "$PROD_DIR/data"
  for f in "$TEST_DIR/data"/*; do
    [ -e "$f" ] && cp -f "$f" "$PROD_DIR/data/" 2>/dev/null || true
  done
  echo "3c. Normalizzo Netwin su prod (dopo copia)..."
  (cd "$PROD_DIR" && node scripts/remove-netwin-from-bookmakers.mjs) || true
  (cd "$PROD_DIR" && node scripts/add-netwin-it0002.mjs) || true
  pm2 restart pronostici-test 2>/dev/null || true
  echo "   OK"
else
  echo "3. Cartella data test non trovata"
fi

# 4. Build e restart produzione
echo ""
echo "4. Build e restart produzione..."
mkdir -p public/uploads
rm -rf .next
npm ci
npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r data .next/standalone/ 2>/dev/null || true
if [ -f .env.local ]; then cp .env.local .next/standalone/; elif [ -f .env ]; then cp .env .next/standalone/; fi
cp scripts/start-standalone.sh .next/standalone/ 2>/dev/null || true
chmod +x .next/standalone/start-standalone.sh 2>/dev/null || true
pm2 delete pronostici 2>/dev/null; pm2 start "$PROD_DIR/ecosystem.config.cjs" --only pronostici
wait_for_app "pronostici" 3000 || true
# Invalida cache Redis home
CRON_SECRET=$(grep -E "^CRON_SECRET=" "$PROD_DIR/.next/standalone/.env.local" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
if [ -n "$CRON_SECRET" ]; then
  curl -s -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3000/api/invalidate-cache" 2>/dev/null && echo "Cache Redis invalidata" || true
fi
if ! curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000" 2>/dev/null | grep -qE "^(200|301|302|307)$"; then
  echo ""
  echo "=== Ultimi log pronostici (diagnostica) ==="
  pm2 logs pronostici --lines 15 --nostream 2>/dev/null || true
fi

echo ""
echo "=== Promozione completata ==="
echo "Produzione aggiornata con codice e data dal sito test."
echo "Se vedi 502: bash scripts/debug-502.sh"
