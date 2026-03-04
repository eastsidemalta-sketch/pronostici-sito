#!/bin/bash
# Diagnostica 502 Bad Gateway - eseguire sul droplet
# ssh root@46.101.115.42 "bash /var/www/pronostici-sito/scripts/debug-502.sh"

echo "=== 1. Stato PM2 ==="
pm2 list

echo ""
echo "=== 2. Log ultimi errori PM2 (produzione) ==="
pm2 logs pronostici --lines 30 --nostream 2>/dev/null || echo "Nessun log o processo non trovato"

echo ""
echo "=== 3. Processo in ascolto sulla porta 3000? ==="
ss -tlnp | grep 3000 || netstat -tlnp 2>/dev/null | grep 3000 || echo "Nessun processo sulla 3000"

echo ""
echo "=== 4. Test locale Next.js ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 2>/dev/null || echo "curl fallito"
echo " (200 = OK)"

echo ""
echo "=== 5. Memoria disponibile (MB) ==="
free -m | head -2

echo ""
echo "=== 6. Build .next esiste? ==="
ls -la /var/www/pronostici-sito/.next/BUILD_ID 2>/dev/null && echo "Build OK" || echo "Build mancante - eseguire: npm run build"
