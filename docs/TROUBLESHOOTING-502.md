# Risoluzione 502 Bad Gateway su Digital Ocean

## Diagnostica rapida

Sul droplet esegui:

```bash
ssh root@46.101.115.42
cd /var/www/pronostici-sito
bash scripts/debug-502.sh
```

## Cause comuni e soluzioni

### 1. App non in esecuzione
```bash
pm2 list
pm2 logs pronostici --lines 50
```
Se il processo è "errored" o "stopped":
```bash
cd /var/www/pronostici-sito
pm2 restart pronostici
# oppure se non esiste:
pm2 start npm --name pronostici -- start
pm2 save
```

### 2. Build fallita
```bash
cd /var/www/pronostici-sito
npm run build
```
Se fallisce per memoria: `export NODE_OPTIONS=--max-old-space-size=4096` e riprova.

### 3. Porta non in ascolto
```bash
curl -I http://127.0.0.1:3000
```
Se non risponde, l'app non è partita. Controlla i log: `pm2 logs pronostici`.

### 4. Nginx non raggiunge l'app
Verifica che nginx faccia proxy a `127.0.0.1:3000`:
```bash
grep -r "proxy_pass\|3000" /etc/nginx/
```

### 5. Memoria insufficiente
```bash
free -m
```
Se la RAM è piena, il build o l'app possono crashare. Aumenta lo swap o la RAM del droplet.
