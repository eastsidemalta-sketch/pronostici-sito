# Backup giornalieri PlaySignal su iDrive

Guida per configurare i backup automatici del droplet DigitalOcean su iDrive.

---

## Parte 1: Scaricare e installare iDrive sul droplet

### Step 1. Connettiti al droplet

```bash
ssh root@46.101.115.42
```

### Step 2. Scarica il pacchetto iDrive

```bash
cd /root
wget https://www.idrivedownloads.com/downloads/linux/download-for-linux/linux-bin/idriveforlinux.bin
chmod a+x idriveforlinux.bin
```

### Step 3. Installa iDrive

```bash
./idriveforlinux.bin --install
```

Segui le istruzioni a schermo. L'installazione può richiedere alcuni minuti.

### Step 4. Configura l'account iDrive

```bash
cd /opt/IDriveForLinux/bin
./idrive --account-setting
```

oppure:

```bash
./idrive -a
```

Inserisci:
- **Email** del tuo account iDrive
- **Password**
- Se hai 2FA attivo, inserisci il codice ricevuto via email

Scegli **"Create new Backup Location"** se è la prima volta (es. "playsignal-droplet").

---

## Parte 2: Configurare cosa includere nel backup

### Step 5. Modifica il backup set

```bash
cd /opt/IDriveForLinux/bin
./idrive --edit-job-sets
```

oppure:

```bash
./idrive -e
```

Seleziona **"1"** (Edit backup set).

Si aprirà un editor. **Sostituisci tutto** con:

```
/var/www/pronostici-sito
```

Salva ed esci (in nano: Ctrl+O, Invio, Ctrl+X).

### Step 6. Escludi node_modules e .next (opzionale ma consigliato)

Risparmia spazio e tempo escludendo cartelle che si possono ricreare:

```bash
./idrive -e
```

Seleziona **"View/Edit your Exclude List"** (opzione per exclude).

Aggiungi queste righe:

```
node_modules
.next
```

Salva ed esci.

---

## Parte 3: Pianificare il backup giornaliero

### Step 7. Configura lo scheduler

```bash
cd /opt/IDriveForLinux/bin
./idrive --scheduler
```

oppure:

```bash
./idrive -s
```

Seleziona **"Schedule backup"** (o l'opzione per backup online).

Configura:
- **Frequency:** Daily (giornaliero)
- **Scheduled time:** es. 03:00 (di notte, poco traffico)
- **Email notifications:** opzionale (inserisci la tua email per ricevere notifiche)
- **Status:** Enabled

Salva.

---

## Parte 4: Verificare

### Step 8. Esegui un backup manuale di prova

```bash
cd /opt/IDriveForLinux/bin
./idrive --backup
```

oppure:

```bash
./idrive -b
```

Attendi il completamento. Vedrai una barra di progresso.

### Step 9. Controlla i log

```bash
./idrive --logs
```

### Step 10. Verifica su iDrive

Accedi a [idrive.com](https://www.idrive.com) e controlla che i file siano presenti nel backup.

---

## Comandi utili

| Comando | Descrizione |
|--------|-------------|
| `./idrive -b` | Backup immediato |
| `./idrive -j` | Stato dei job in corso |
| `./idrive -l` | Visualizza log |
| `./idrive -s` | Gestisci pianificazione |
| `./idrive -t` | Interrompi job in corso |

---

## Cosa viene salvato

- **Incluso:** `/var/www/pronostici-sito` (solo sito produzione)
  - Codice sorgente
  - `.env.local` (chiavi API, secret)
  - `package.json`, configurazioni

- **Escluso:** `node_modules`, `.next` (si ricreano con `npm ci` e `npm run build`)

---

## Ripristino in caso di disastro

1. Crea un nuovo droplet
2. Installa Node.js, nginx, PM2 (come nella guida iniziale)
3. Installa iDrive sul nuovo droplet
4. Esegui `./idrive -r` (Restore)
5. Ripristina in `/var/www/`
6. Esegui `npm ci`, `npm run build`, `pm2 start` nella cartella del sito
