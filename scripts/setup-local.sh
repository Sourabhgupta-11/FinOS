#!/usr/bin/env bash
# setup-local.sh — Full local dev setup from scratch
# Usage: ./scripts/setup-local.sh
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

header() { echo -e "\n${BLUE}━━ $1 ━━${NC}"; }
ok()     { echo -e "${GREEN}✓ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "  ₹ Financial OS — Local Setup"
echo "  ─────────────────────────────"

# ── Check prerequisites ────────────────────────────────────────────────────────
header "Checking prerequisites"
command -v node  >/dev/null 2>&1 && ok "Node.js $(node -v)" || { echo "✗ Node.js not found. Install from nodejs.org"; exit 1; }
command -v npm   >/dev/null 2>&1 && ok "npm $(npm -v)"     || { echo "✗ npm not found"; exit 1; }
command -v docker >/dev/null 2>&1 && ok "Docker found"     || warn "Docker not found — you'll need PostgreSQL running manually"

# ── Environment files ──────────────────────────────────────────────────────────
header "Setting up environment files"

if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  ok "Created root .env"
else
  ok "Root .env already exists"
fi

if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  ok "Created backend/.env"
else
  ok "Backend .env already exists"
fi

if [ ! -f "$ROOT/frontend/.env" ]; then
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
  ok "Created frontend/.env"
else
  ok "Frontend .env already exists"
fi

# ── Check for Anthropic API key ────────────────────────────────────────────────
if grep -q "gsk_your_key_here" "$ROOT/backend/.env" 2>/dev/null; then
  echo ""
  warn "You need to add your Groq API key!"
  warn "Edit backend/.env and set: GROQ_API_KEY=gsk_..."
  warn "Get a FREE key at: https://console.groq.com"
  echo ""
fi

# ── Install dependencies ───────────────────────────────────────────────────────
header "Installing dependencies"
cd "$ROOT/backend" && npm install && ok "Backend dependencies installed"
cd "$ROOT/frontend" && npm install && ok "Frontend dependencies installed"

# ── Start database ─────────────────────────────────────────────────────────────
header "Starting database"
if command -v docker >/dev/null 2>&1; then
  cd "$ROOT"
  docker compose up -d postgres && ok "PostgreSQL started via Docker"
  echo "   Waiting for DB to be ready..."
  sleep 4
else
  warn "Docker not found. Make sure PostgreSQL is running on localhost:5432"
  warn "DB: financialos | User: postgres | Password: password"
fi

# ── Run migrations ─────────────────────────────────────────────────────────────
header "Running database migrations"
cd "$ROOT/backend"
npm run migrate && ok "Migrations complete"

# ── Seed demo data ─────────────────────────────────────────────────────────────
header "Seeding demo data"
npm run seed && ok "Demo data seeded"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Setup complete!"
echo ""
echo "  Start the app:"
echo "    Terminal 1:  cd backend  && npm run dev"
echo "    Terminal 2:  cd frontend && npm run dev"
echo ""
echo "  Or with Docker Compose:"
echo "    docker compose up --build"
echo ""
echo "  Demo login:  demo@financialos.in / demo1234"
echo "  Frontend:    http://localhost:5173"
echo "  Backend API: http://localhost:3001"
echo "  pgAdmin:     http://localhost:5050"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
