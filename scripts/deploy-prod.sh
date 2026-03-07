#!/bin/bash
# Deploy PRODUZIONE. Eseguire solo dopo aver verificato che tutto funziona su test.
# Sul droplet: bash scripts/deploy-prod.sh

set -e

wait_for_app() {
  local name=$1
  local port=$2
  local max=30
  local n=0
  echo -n "Attendo avvio $name sulla porta $port..."
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

echo "=== Deploy PRODUZIONE ==="
cd /var/www/pronostici-sito

# 1. Salva i dati da produzione (admin edits) prima che git pull li sovrascriva
# Escludi teamAliasesByProvider.json: viene dal repo, non da modifiche admin
if [ -d ".next/standalone/data" ]; then
  echo "Sync data da produzione..."
  mkdir -p data
  for f in .next/standalone/data/*; do
    [ -e "$f" ] && [ -f "$f" ] || continue
    case "$(basename "$f")" in
      teamAliasesByProvider.json) continue ;;
    esac
    cp -f "$f" data/ 2>/dev/null || true
  done
  git add data/ 2>/dev/null || true
  if ! git diff --staged --quiet 2>/dev/null; then
    git commit -m "Sync data da produzione" || true
    git push origin main 2>/dev/null || echo "  ATTENZIONE: push fallito. Sul Mac: scp -r user@server:$PWD/data ./data && git add data && git commit -m 'Sync data' && git push"
  fi
fi

# 2. Pull ultimo codice
git pull origin main
mkdir -p public/uploads
mkdir -p data
touch data/.netwin-full.log 2>/dev/null || true

# 2b. BACKUP cache Netwin prima di rm .next
CACHE_BACKUP="/tmp/netwin-cache-$$.json"
if [ -f ".next/standalone/data/.netwin-cache.json" ] && [ -s ".next/standalone/data/.netwin-cache.json" ]; then
  cp -f ".next/standalone/data/.netwin-cache.json" "$CACHE_BACKUP"
  echo "Backup cache Netwin"
fi

rm -rf .next
npm ci
npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r .next/server/chunks .next/standalone/.next/server/ 2>/dev/null || true
node scripts/remove-netwin-from-bookmakers.mjs 2>/dev/null || true
node scripts/add-netwin-it0002.mjs 2>/dev/null || true
cp -r data .next/standalone/ 2>/dev/null || true

# Ripristina cache Netwin dal backup
if [ -f "$CACHE_BACKUP" ] && [ -s "$CACHE_BACKUP" ]; then
  STANDALONE_CACHE=".next/standalone/data/.netwin-cache.json"
  if [ ! -f "$STANDALONE_CACHE" ] || [ ! -s "$STANDALONE_CACHE" ]; then
    cp -f "$CACHE_BACKUP" "$STANDALONE_CACHE"
    echo "Ripristinata cache Netwin"
  fi
  rm -f "$CACHE_BACKUP"
fi

if [ -f .env.local ]; then cp .env.local .next/standalone/; elif [ -f .env ]; then cp .env .next/standalone/; fi
# Produzione: sospende FULL e DELTA Netwin (solo test fa richieste, evita hash_lock)
ENV_FILE=".next/standalone/.env.local"
[ ! -f "$ENV_FILE" ] && ENV_FILE=".next/standalone/.env"
if [ -f "$ENV_FILE" ] && ! grep -q "NETWIN_DISABLE_FULL" "$ENV_FILE"; then
  echo "NETWIN_DISABLE_FULL=1" >> "$ENV_FILE"
  echo "Aggiunto NETWIN_DISABLE_FULL=1 (prod usa solo cache Netwin)"
fi
cp scripts/start-standalone.sh .next/standalone/ 2>/dev/null || true
chmod +x .next/standalone/start-standalone.sh 2>/dev/null || true
pm2 delete pronostici 2>/dev/null; pm2 start /var/www/pronostici-sito/ecosystem.config.cjs --only pronostici
wait_for_app "pronostici" 3000 || true
# Invalida cache e pre-popola con dati freschi (chiama API Football + quote, evita vuoto al primo utente)
CRON_SECRET=$(grep -E "^CRON_SECRET=" .next/standalone/.env.local 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
if [ -n "$CRON_SECRET" ]; then
  echo "Warm cache IT+BR (API Football + quote)..."
  curl -s --max-time 120 -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3000/api/debug-home?country=IT,BR&bypass=1" || true
  echo ""
else
  echo "ATTENZIONE: CRON_SECRET non impostato. Esegui manualmente per popolare la cache:"
  echo "  curl -H 'Authorization: Bearer TUO_CRON_SECRET' 'https://tuo-dominio/api/debug-home?country=IT,BR&bypass=1'"
fi
echo ""
echo "=== Deploy produzione completato ==="
echo "Se vedi 502: bash scripts/debug-502.sh"
