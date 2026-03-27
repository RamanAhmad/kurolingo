#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Kurdolingo – Lokales Start-Skript
#  Verwendung:  bash start.sh
# ─────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'
TEAL='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${TEAL}🦅  Kurdolingo – Lokaler Start${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js nicht gefunden. Bitte installieren: https://nodejs.org${NC}"
  exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VER${NC}"

# Backend setup
echo ""
echo "📦 Backend-Abhängigkeiten installieren…"
cd backend
if [ ! -d "node_modules" ]; then
  npm install
fi

# Copy .env if not exists
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ .env erstellt aus .env.example${NC}"
fi

# Seed database if not exists
if [ ! -f "kurdolingo.db" ]; then
  echo ""
  echo "🌱 Datenbank wird befüllt…"
  npm run seed
fi

cd ../

# Frontend setup
echo ""
echo "📦 Frontend-Abhängigkeiten installieren…"
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
cd ../

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🚀 Starte Backend + Frontend…${NC}"
echo ""
echo -e "   Backend  →  ${TEAL}http://localhost:4000${NC}"
echo -e "   Frontend →  ${TEAL}http://localhost:3000${NC}"
echo ""
echo -e "   📧 Admin:  admin@kurdolingo.de  /  admin123"
echo -e "   📧 Demo:   demo@kurdolingo.de   /  demo123"
echo ""
echo "   [Ctrl+C zum Beenden]"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start both servers
(cd backend && node src/index.js) &
BACKEND_PID=$!

(cd frontend && npm run dev -- --host) &
FRONTEND_PID=$!

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Server gestoppt.'" EXIT

wait
