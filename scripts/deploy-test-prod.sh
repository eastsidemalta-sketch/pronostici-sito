#!/bin/bash
# Deploy test + produzione in un colpo solo
# Eseguire sul droplet: bash scripts/deploy-test-prod.sh

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

echo "=== Deploy TEST ==="
cd /var/www/pronostici-sito-test
git pull origin main
mkdir -p public/uploads
npm ci
npm run build
node scripts/apply-netwin-config.mjs 2>/dev/null || true
pm2 restart pronostici-test 2>/dev/null || (cd /var/www/pronostici-sito-test && pm2 start npm --name pronostici-test -- start)
wait_for_app "pronostici-test" 3001 || true
echo "Test OK"
echo ""

echo "=== Deploy PRODUZIONE ==="
cd /var/www/pronostici-sito
git pull origin main
mkdir -p public/uploads
npm ci
npm run build
node scripts/apply-netwin-config.mjs 2>/dev/null || true
pm2 restart pronostici || pm2 start npm --name pronostici -- start
wait_for_app "pronostici" 3000 || true
echo "Produzione OK"
echo ""

echo "=== Deploy completato ==="
echo "Se vedi 502, esegui: bash scripts/debug-502.sh"
