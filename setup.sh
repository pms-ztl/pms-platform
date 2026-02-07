#!/bin/bash
# ===========================================
# PMS Platform - One-Command Local Setup
# Prerequisites: Docker + Node.js 18+
# Usage: chmod +x setup.sh && ./setup.sh
# ===========================================

set -e

echo ""
echo "=========================================="
echo "  PMS Platform - Local Setup"
echo "=========================================="
echo ""

# ---- Check Docker ----
echo "[1/7] Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "  ERROR: Docker is not installed."
    echo "  macOS: brew install --cask docker"
    echo "  Linux: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo "  OK - Docker found."

# ---- Check Node.js ----
echo "[2/7] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "  ERROR: Node.js is not installed."
    echo "  Install from: https://nodejs.org"
    exit 1
fi
NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 18 ]; then
    echo "  ERROR: Node.js 18+ required (found v$NODE_VER)"
    exit 1
fi
echo "  OK - Node.js $(node -v) found."

# ---- Start database and Redis ----
echo "[3/7] Starting PostgreSQL & Redis via Docker..."
docker compose -f docker-compose.dev.yml up -d

# ---- Wait for DB ----
echo "[4/7] Waiting for database..."
RETRIES=0
until docker compose -f docker-compose.dev.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -ge 30 ]; then
        echo "  ERROR: Database failed to start after 60 seconds."
        exit 1
    fi
    sleep 2
done
echo "  OK - Database is ready."

# ---- Setup environment ----
echo "[5/7] Setting up environment..."
if [ ! -f "apps/api/.env" ]; then
    cp .env.example apps/api/.env
    echo "  Created apps/api/.env"
else
    echo "  apps/api/.env already exists, skipping."
fi

# ---- Install dependencies ----
echo "[6/7] Installing dependencies..."
npm ci

# ---- Setup database ----
echo "[7/7] Setting up database..."
cd packages/database
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push
npx prisma db seed 2>/dev/null || echo "  Note: Seed skipped or already done."
cd ../..

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "  Start the app:"
echo "    npm run dev"
echo ""
echo "  Then open:"
echo "    http://localhost:3002"
echo ""
echo "  Stop database:"
echo "    docker compose -f docker-compose.dev.yml down"
echo ""
