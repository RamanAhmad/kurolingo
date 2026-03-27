#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Kurdolingo — Produktions-Deploy-Script
#
#  Verwendung:   bash deploy.sh
#  Voraussetzungen:
#    - Node.js 20+        (node -v)
#    - npm 9+             (npm -v)
#    - PM2                (npm i -g pm2)
#    - nginx (optional)   (nginx -v)
#
#  Was dieses Script tut:
#    1. Umgebungsvariablen prüfen
#    2. Backend-Abhängigkeiten installieren
#    3. Datenbank migrieren (falls bessere-sqlite3 Upgrade)
#    4. Frontend bauen (Vite)
#    5. PM2-Prozess starten oder neu starten
#    6. Health-Check
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'
TEAL='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${TEAL}▶  $1${NC}"; }
ok()   { echo -e "${GREEN}✓  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
fail() { echo -e "${RED}✗  $1${NC}"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${TEAL}🦅  Kurdolingo — Produktions-Deploy${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Voraussetzungen prüfen ─────────────────────────────────────────────────
step "Voraussetzungen prüfen"

command -v node >/dev/null 2>&1 || fail "Node.js nicht gefunden. Installieren: https://nodejs.org"
NODE_VER=$(node -v | grep -oP '\d+' | head -1)
[ "$NODE_VER" -ge 20 ] || fail "Node.js 20+ erforderlich. Aktuell: $(node -v)"
ok "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || fail "npm nicht gefunden"
ok "npm $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  warn "PM2 nicht gefunden. Installiere global..."
  npm install -g pm2 || fail "PM2-Installation fehlgeschlagen"
fi
ok "PM2 $(pm2 -v)"

# ── 2. .env prüfen ────────────────────────────────────────────────────────────
step ".env prüfen"

if [ ! -f "backend/.env" ]; then
  warn "backend/.env fehlt — erstelle aus .env.example"
  cp backend/.env.example backend/.env
  echo ""
  echo -e "${RED}  ⚠️  WICHTIG: Bearbeite backend/.env und setze:"
  echo -e "     JWT_SECRET=<64 zufällige Hex-Zeichen>"
  echo -e "     ALLOWED_ORIGINS=https://deine-domain.de"
  echo -e "     NODE_ENV=production${NC}"
  echo ""
  read -p "  Drücke Enter sobald .env konfiguriert ist..."
fi

# Prüfe kritische Variablen
source backend/.env 2>/dev/null || true

if [ "${NODE_ENV:-}" != "production" ]; then
  warn "NODE_ENV ist nicht 'production' — Rate Limiting ist deaktiviert!"
fi

if [ "${JWT_SECRET:-}" = "change-this-in-production-use-64-random-hex-chars" ] || \
   [ "${JWT_SECRET:-}" = "change-this-in-production" ] || \
   [ -z "${JWT_SECRET:-}" ]; then
  fail "JWT_SECRET ist nicht gesetzt oder ist der Standard-Beispielwert."
fi
ok ".env ist konfiguriert"

# ── 3. Backend-Abhängigkeiten ─────────────────────────────────────────────────
step "Backend-Abhängigkeiten installieren (production only)"
cd backend
npm ci --omit=dev
ok "Backend node_modules aktuell"

# ── 4. Datenbank migrieren ────────────────────────────────────────────────────
step "Datenbank migrieren"
if [ -f "kurdolingo.db" ]; then
  node src/migrate.js
  ok "Datenbank migriert"
else
  warn "Keine Datenbank gefunden — wird beim ersten Start erstellt"
  warn "Danach: node src/seed.js  (einmalig für Demo-Daten)"
fi
cd ..

# ── 5. Frontend bauen ─────────────────────────────────────────────────────────
step "Frontend bauen (Vite)"
cd frontend
npm ci
npm run build
ok "Frontend gebaut → frontend/dist/"
cd ..

# ── 6. Logs-Verzeichnis ───────────────────────────────────────────────────────
mkdir -p logs
ok "logs/ Verzeichnis bereit"

# ── 7. PM2 starten / neu starten ─────────────────────────────────────────────
step "PM2 Prozess starten"

if pm2 list | grep -q "kurdolingo-api"; then
  pm2 reload ecosystem.config.js --env production
  ok "Prozess neu geladen (zero-downtime)"
else
  pm2 start ecosystem.config.js --env production
  ok "Prozess gestartet"
fi

# PM2 beim Systemstart aktivieren
pm2 save >/dev/null 2>&1
ok "PM2 State gespeichert"

# ── 8. Health-Check ───────────────────────────────────────────────────────────
step "Health-Check"
sleep 2  # kurz warten bis Server hochgefahren ist

PORT="${PORT:-4000}"
HEALTH_URL="http://localhost:${PORT}/api/health"

for i in 1 2 3 4 5; do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    RESPONSE=$(curl -sf "$HEALTH_URL")
    ok "API antwortet: $RESPONSE"
    break
  fi
  if [ $i -eq 5 ]; then
    fail "Health-Check fehlgeschlagen nach 5 Versuchen. Logs: pm2 logs kurdolingo-api"
  fi
  warn "Versuch $i/5 — warte 2 Sekunden..."
  sleep 2
done

# ── Zusammenfassung ───────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🚀  Deploy erfolgreich!${NC}"
echo ""
echo "   API läuft auf:   http://localhost:${PORT}"
echo "   Logs anzeigen:   pm2 logs kurdolingo-api"
echo "   Status:          pm2 status"
echo "   Live-Monitor:    pm2 monit"
echo ""
if command -v nginx >/dev/null 2>&1; then
  echo "   nginx vorhanden — stelle sicher dass nginx.conf konfiguriert ist"
  echo "   und nginx neu gestartet wurde: sudo systemctl reload nginx"
else
  warn "nginx nicht gefunden — App ist nur auf Port ${PORT} erreichbar (kein HTTPS)"
  warn "Installieren: sudo apt install nginx certbot python3-certbot-nginx"
fi
echo ""
