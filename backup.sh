#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Kurdolingo — Datenbank-Backup-Script
#
#  Erstellt tägliche SQLite-Backups mit 30-Tage-Rotation.
#  SQLite WAL-Modus ist laufzeit-sicher: das Backup ist konsistent
#  auch wenn der Server gleichzeitig schreibt (.backup ist atomic).
#
#  Cron-Setup (als root oder kurdolingo-User):
#    crontab -e
#    # Täglich um 03:00 Uhr:
#    0 3 * * * /path/to/kurdolingo/backup.sh >> /path/to/kurdolingo/logs/backup.log 2>&1
#
#  Manuell testen: bash backup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="$SCRIPT_DIR/backend/kurdolingo.db"
BACKUP_DIR="$SCRIPT_DIR/backups"
KEEP_DAYS=30

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
BACKUP_FILE="$BACKUP_DIR/kurdolingo_${TIMESTAMP}.db"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] BACKUP"

mkdir -p "$BACKUP_DIR"

# ── Prüfen ob DB existiert ────────────────────────────────────────────────────
if [ ! -f "$DB_PATH" ]; then
  echo "$LOG_PREFIX SKIP — keine Datenbank gefunden: $DB_PATH"
  exit 0
fi

# ── SQLite Hot-Backup (WAL-sicher) ────────────────────────────────────────────
# .backup ist der korrekte Weg bei WAL-Mode — es flushd den WAL und kopiert
# atomar. Einfaches cp würde bei einem laufenden Write eine inkonsistente DB erzeugen.
node -e "
const Database = require('better-sqlite3');
const db = new Database('$DB_PATH', { readonly: true });
db.backup('$BACKUP_FILE').then(() => {
  const fs = require('fs');
  const size = fs.statSync('$BACKUP_FILE').size;
  console.log('$LOG_PREFIX OK — $BACKUP_FILE (' + Math.round(size/1024) + ' KB)');
  db.close();
}).catch(err => {
  console.error('$LOG_PREFIX FAIL —', err.message);
  process.exit(1);
});
" 2>&1

# ── Alte Backups aufräumen ────────────────────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "kurdolingo_*.db" -mtime "+$KEEP_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "$LOG_PREFIX CLEANUP — $DELETED alte Backups gelöscht (älter als ${KEEP_DAYS} Tage)"
fi

# ── Statistik ─────────────────────────────────────────────────────────────────
TOTAL=$(find "$BACKUP_DIR" -name "kurdolingo_*.db" | wc -l)
echo "$LOG_PREFIX STATUS — $TOTAL Backups in $BACKUP_DIR"
