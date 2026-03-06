#!/bin/bash
# Allinea il repository locale (Mac) con GitHub (= versione produzione dopo deploy).
# Eseguire sul Mac, nella cartella del progetto: bash scripts/sync-local.sh
#
# Usa dopo aver fatto deploy su produzione: così Mac, GitHub, prod e test sono tutti allineati.

set -e

cd "$(dirname "$0")/.."
echo "=== Sync locale con GitHub ==="
git fetch origin main
git pull origin main
echo ""
echo "OK: repository locale allineato con GitHub (e con produzione/test)."
