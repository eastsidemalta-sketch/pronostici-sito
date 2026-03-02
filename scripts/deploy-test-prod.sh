#!/bin/bash
# Deploy test + produzione in un colpo solo
# Eseguire sul droplet: bash scripts/deploy-test-prod.sh

set -e

echo "=== Deploy TEST ==="
cd /var/www/pronostici-sito-test
git pull origin main
mkdir -p public/uploads
npm ci
npm run build
pm2 restart pronostici-test
echo "Test OK"
echo ""

echo "=== Deploy PRODUZIONE ==="
cd /var/www/pronostici-sito
git pull origin main
mkdir -p public/uploads
npm ci
npm run build
pm2 restart pronostici
echo "Produzione OK"
echo ""

echo "=== Deploy completato ==="
