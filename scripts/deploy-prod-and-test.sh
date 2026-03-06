#!/bin/bash
# Deploy PRODUZIONE + TEST: entrambi con la stessa versione da GitHub.
# Eseguire sul droplet: bash scripts/deploy-prod-and-test.sh
#
# Flusso: 1) deploy prod 2) deploy test
# Risultato: prod, test e GitHub hanno la stessa versione.
# Sul Mac: bash scripts/sync-local.sh per allineare il repo locale.

set -e

PROD_DIR="/var/www/pronostici-sito"
TEST_DIR="/var/www/pronostici-sito-test"

echo "=== Deploy PRODUZIONE + TEST (stessa versione) ==="
echo ""

echo "1. Deploy produzione..."
cd "$PROD_DIR" && bash scripts/deploy-prod.sh
echo ""

echo "2. Deploy test..."
cd "$TEST_DIR" && bash scripts/deploy-test-prod.sh
echo ""

echo "=== Completato ==="
echo "Produzione e test ora hanno la stessa versione (da GitHub)."
echo "Sul Mac: bash scripts/sync-local.sh  per allineare il repo locale."
