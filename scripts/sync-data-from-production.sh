#!/bin/bash
# Copia i dati dalla produzione (standalone) al repo, così gli aggiornamenti
# fatti via admin non vanno persi al prossimo deploy.
# Eseguire sul server PRIMA del deploy, oppure integrato in deploy-prod.sh
#
# Flusso: standalone/data/ → data/ (progetto)
# Poi: git add data && git commit && git push (opzionale, richiede credenziali)

set -e

PROD_DIR="/var/www/pronostici-sito"
STANDALONE_DATA="$PROD_DIR/.next/standalone/data"
PROJECT_DATA="$PROD_DIR/data"

cd "$PROD_DIR"

if [ ! -d "$STANDALONE_DATA" ]; then
  echo "Standalone data non trovato (primo deploy?). Skip sync."
  exit 0
fi

echo "=== Sync data da produzione (standalone → repo) ==="
mkdir -p "$PROJECT_DATA"
for f in "$STANDALONE_DATA"/*; do
  [ -e "$f" ] && [ -f "$f" ] && cp -f "$f" "$PROJECT_DATA/" 2>/dev/null && echo "  Copiato $(basename "$f")" || true
done
echo "OK: data/ aggiornato con le modifiche da produzione."
echo ""
echo "Per salvare su GitHub, sul server esegui:"
echo "  cd $PROD_DIR && git add data/ && git status"
echo "  git commit -m 'Sync data da produzione' && git push origin main"
echo ""
echo "Oppure sul Mac (dopo aver copiato data dal server):"
echo "  scp -r user@server:$PROD_DIR/data ./data"
echo "  git add data/ && git commit -m 'Sync data da produzione' && git push"
