# Backup PlaySignal su iDrive e2 (bucket S3)

iDrive e2 è storage S3-compatible. Puoi creare un bucket e caricare i backup dal droplet con AWS CLI.

---

## Parte 1: Configurare iDrive e2 (nel browser)

### Step 1. Accedi a iDrive e2

Vai su [app.idrivee2.com](https://app.idrivee2.com) e accedi (o registrati se è la prima volta).

**Nota:** iDrive e2 può essere un account separato da iDrive backup. Controlla se puoi usare le stesse credenziali.

### Step 2. Crea un bucket

1. Nel dashboard, clicca **Create Bucket** (o **Buckets** → **Create**)
2. Nome bucket: `playsignal-backup`
3. Scegli la regione (es. **eu-central** per Europa, vicino a Frankfurt)
4. Salva

### Step 3. Ottieni le credenziali

1. Vai in **Access Keys** (o **Settings** → **Access Keys**)
2. Clicca **Create Access Key**
3. Copia **Access Key ID** e **Secret Access Key** (il secret si vede solo una volta, salvalo subito)

### Step 4. Ottieni l'endpoint

Nella sezione **Enabled regions** o **Bucket** del dashboard trovi l'endpoint, ad esempio:
- `https://xyz1.ch11.idrivee2-2.com` (sostituisci con il tuo)

---

## Parte 2: Configurare il droplet

### Step 5. Installa AWS CLI sul droplet

```bash
ssh root@46.101.115.42
apt update
apt install -y awscli
```

### Step 6. Configura le credenziali

```bash
mkdir -p ~/.aws
nano ~/.aws/credentials
```

Incolla (sostituisci con i tuoi valori):

```
[default]
aws_access_key_id = TUA_ACCESS_KEY
aws_secret_access_key = TUA_SECRET_KEY
```

Salva (Ctrl+O, Invio, Ctrl+X).

```bash
nano ~/.aws/config
```

Incolla:

```
[default]
region = us-east-1
```

Salva.

### Step 7. Imposta i permessi

```bash
chmod 600 ~/.aws/credentials
```

---

## Parte 3: Script di backup

### Step 8. Crea lo script di backup

```bash
cat > /root/backup-to-idrive-e2.sh << 'SCRIPT'
#!/bin/bash
# Backup PlaySignal su iDrive e2
# Sostituisci ENDPOINT e BUCKET con i tuoi valori

ENDPOINT="https://TUO_ENDPOINT.idrivee2-2.com"
BUCKET="playsignal-backup"
DATE=$(date +%Y%m%d-%H%M)
BACKUP_FILE="/root/backups/playsignal-${DATE}.tar.gz"

mkdir -p /root/backups

# Crea archivio (escludi node_modules e .next)
tar -czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='.next' \
  -C /var/www pronostici-sito

# Carica su iDrive e2
aws s3 cp "$BACKUP_FILE" "s3://${BUCKET}/playsignal-${DATE}.tar.gz" \
  --endpoint-url "$ENDPOINT"

# Rimuovi backup locale per risparmiare spazio (opzionale)
rm -f "$BACKUP_FILE"

# Mantieni solo ultimi 7 backup su e2 (opzionale)
# aws s3 ls s3://$BUCKET/ --endpoint-url $ENDPOINT | tail -n +8 | ...
echo "Backup completato: playsignal-${DATE}.tar.gz"
SCRIPT

chmod +x /root/backup-to-idrive-e2.sh
```

**Importante:** Modifica lo script e sostituisci:
- `TUO_ENDPOINT` con l'endpoint del tuo bucket (es. `xyz1.ch11`)
- `playsignal-backup` se hai usato un altro nome bucket

### Step 9. Modifica endpoint e bucket

```bash
nano /root/backup-to-idrive-e2.sh
```

Sostituisci `TUO_ENDPOINT` e verifica `BUCKET`.

---

## Parte 4: Esecuzione e pianificazione

### Step 10. Test manuale

```bash
/root/backup-to-idrive-e2.sh
```

Controlla su [app.idrivee2.com](https://app.idrivee2.com) che il file sia nel bucket.

### Step 11. Cron giornaliero (es. alle 3:00)

```bash
(crontab -l 2>/dev/null; echo '0 3 * * * /root/backup-to-idrive-e2.sh >> /var/log/backup-idrive.log 2>&1') | crontab -
```

---

## Riepilogo

| Cosa | Dove |
|------|------|
| Bucket | iDrive e2 dashboard |
| Access Key | iDrive e2 → Access Keys |
| Endpoint | iDrive e2 → Enabled regions |
| Script | `/root/backup-to-idrive-e2.sh` |
| Cron | Ogni giorno alle 3:00 |

---

## Ripristino

Per scaricare un backup dal bucket:

```bash
aws s3 cp s3://playsignal-backup/playsignal-20260301-0300.tar.gz . --endpoint-url https://TUO_ENDPOINT.idrivee2-2.com
tar -xzf playsignal-20260301-0300.tar.gz -C /var/www/
```
