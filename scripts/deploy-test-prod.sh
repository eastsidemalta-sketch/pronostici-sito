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

# 1. Salva i dati da test (modifiche admin) prima che git pull li sovrascriva
# Escludi teamAliasesByProvider.json: viene dal repo, non da modifiche admin
if [ -d ".next/standalone/data" ]; then
  echo "Sync data da test (preserva paesi, menu, bookmakers)..."
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
    git commit -m "Sync data da test" || true
    git push origin main 2>/dev/null || echo "  ATTENZIONE: push fallito. Esegui manualmente: git push"
  fi
fi

# 2. Pull ultimo codice (--rebase gestisce commit locale "Sync data" non pushato)
git pull --rebase origin main
mkdir -p public/uploads
mkdir -p data
# File runtime Netwin: Next.js trace li copia durante build; se mancano → ENOENT
touch data/.netwin-full.log 2>/dev/null || true

# 2b. BACKUP cache Netwin prima di rm .next (preserva quote tra deploy)
CACHE_BACKUP="/tmp/netwin-cache-$$.json"
if [ -f ".next/standalone/data/.netwin-cache.json" ] && [ -s ".next/standalone/data/.netwin-cache.json" ]; then
  cp -f ".next/standalone/data/.netwin-cache.json" "$CACHE_BACKUP"
  echo "Backup cache Netwin (preservata per ripristino)"
fi

rm -rf .next
npm ci
npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
# Assicura che i chunk server siano presenti (fix MODULE_NOT_FOUND chunks)
cp -r .next/server/chunks .next/standalone/.next/server/ 2>/dev/null || true
node scripts/add-netwin-it0002.mjs 2>/dev/null || true
cp -r data .next/standalone/ 2>/dev/null || true

# Ripristina cache Netwin dal backup se data non l'aveva (evita perdita quote)
if [ -f "$CACHE_BACKUP" ] && [ -s "$CACHE_BACKUP" ]; then
  STANDALONE_CACHE=".next/standalone/data/.netwin-cache.json"
  if [ ! -f "$STANDALONE_CACHE" ] || [ ! -s "$STANDALONE_CACHE" ]; then
    cp -f "$CACHE_BACKUP" "$STANDALONE_CACHE"
    echo "Ripristinata cache Netwin da backup"
  fi
  rm -f "$CACHE_BACKUP"
fi
# Env per standalone (API_FOOTBALL_KEY, ecc.): prima test, poi fallback da produzione
if [ -f .env.local ]; then cp .env.local .next/standalone/; elif [ -f .env ]; then cp .env .next/standalone/; fi
if [ ! -f .next/standalone/.env.local ] && [ ! -f .next/standalone/.env ]; then
  [ -f /var/www/pronostici-sito/.env.local ] && cp /var/www/pronostici-sito/.env.local .next/standalone/ || true
  [ -f /var/www/pronostici-sito/.env ] && cp /var/www/pronostici-sito/.env .next/standalone/ || true
fi
pm2 delete pronostici-test 2>/dev/null; pm2 start ecosystem.config.cjs --only pronostici-test
wait_for_app "pronostici-test" 3001 || true
# Invalida cache e pre-popola con dati freschi (chiama API Football + quote, evita vuoto al primo utente)
CRON_SECRET=$(grep -E "^CRON_SECRET=" .next/standalone/.env.local 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
if [ -n "$CRON_SECRET" ]; then
  echo "Warm cache IT+BR (API Football + quote)..."
  curl -s --max-time 120 -H "Authorization: Bearer $CRON_SECRET" "http://127.0.0.1:3001/api/debug-home?country=IT,BR&bypass=1" || true
  echo ""
else
  echo "ATTENZIONE: CRON_SECRET non impostato. Esegui manualmente per popolare la cache."
fi
echo ""
echo "=== Deploy TEST completato ==="
echo "Verifica il sito test. Poi promuovi a produzione:"
echo "  bash scripts/deploy-promote-test-to-prod.sh   (copia data da test + deploy prod)"
echo "  oppure: bash scripts/deploy-prod.sh           (solo deploy prod, senza copia data)"
echo "Se vedi 502: bash scripts/debug-502.sh"
