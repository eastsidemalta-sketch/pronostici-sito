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

echo "=== Deploy PRODUZIONE ==="
cd /var/www/pronostici-sito
git pull origin main
mkdir -p public/uploads
npm ci
npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
node scripts/apply-netwin-config.mjs 2>/dev/null || true
cp -r data .next/standalone/ 2>/dev/null || true
if [ -f .env.local ]; then cp .env.local .next/standalone/; elif [ -f .env ]; then cp .env .next/standalone/; fi
pm2 delete pronostici 2>/dev/null; pm2 start ecosystem.config.cjs --only pronostici
wait_for_app "pronostici" 3000 || true
echo ""
echo "=== Deploy produzione completato ==="
echo "Se vedi 502: bash scripts/debug-502.sh"
