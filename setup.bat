@echo off
setlocal enabledelayedexpansion

REM ===========================================
REM PMS Platform - One-Command Local Setup
REM Prerequisites: Docker Desktop + Node.js 18+
REM ===========================================

echo.
echo ==========================================
echo   PMS Platform - Local Setup
echo ==========================================
echo.

REM ---- Check Docker ----
echo [1/7] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Docker is not installed.
    echo   Install Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo   OK - Docker found.

REM ---- Check Node.js ----
echo [2/7] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js is not installed.
    echo   Install Node.js 18+: https://nodejs.org
    pause
    exit /b 1
)
echo   OK - Node.js found.

REM ---- Start database and Redis ----
echo [3/7] Starting PostgreSQL ^& Redis via Docker...
docker compose -f docker-compose.dev.yml up -d
if errorlevel 1 (
    echo   ERROR: Failed to start containers. Is Docker Desktop running?
    pause
    exit /b 1
)

REM ---- Wait for DB to be ready ----
echo [4/7] Waiting for database...
set retries=0
:waitloop
if !retries! geq 30 (
    echo   ERROR: Database failed to start after 60 seconds.
    pause
    exit /b 1
)
docker compose -f docker-compose.dev.yml exec -T db pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    set /a retries+=1
    timeout /t 2 /nobreak >nul
    goto waitloop
)
echo   OK - Database is ready.

REM ---- Setup environment ----
echo [5/7] Setting up environment...
if not exist "apps\api\.env" (
    copy .env.example apps\api\.env >nul
    echo   Created apps\api\.env
) else (
    echo   apps\api\.env already exists, skipping.
)

REM ---- Install dependencies ----
echo [6/7] Installing dependencies...
call npm ci
if errorlevel 1 (
    echo   ERROR: npm install failed.
    pause
    exit /b 1
)

REM ---- Setup database ----
echo [7/7] Setting up database...
cd packages\database
call npx prisma generate
call npx prisma migrate deploy 2>nul || call npx prisma db push
call npx prisma db seed 2>nul || echo   Note: Seed skipped or already done.
cd ..\..

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo   Start the app:
echo     npm run dev
echo.
echo   Then open:
echo     http://localhost:3002
echo.
echo   Stop database:
echo     docker compose -f docker-compose.dev.yml down
echo.
pause
