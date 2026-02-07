@echo off
setlocal enabledelayedexpansion

echo ========================================
echo PMS PLATFORM - MANUAL SETUP (No Docker)
echo ========================================
echo.
echo This script assumes you have PostgreSQL installed natively
echo Download from: https://www.postgresql.org/download/windows/
echo.

echo Step 1: Checking PostgreSQL...
echo ----------------------------------------
sc query postgresql-x64-15 | findstr RUNNING >nul
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL is running
) else (
    echo [WARNING] PostgreSQL service not detected
    echo.
    echo Please ensure PostgreSQL is installed and running
    echo Service name might be different (postgresql-x64-14, etc.)
    echo.
    echo You can check with: sc query ^| findstr postgresql
    echo.
    choice /C YN /M "Continue anyway"
    if errorlevel 2 exit /b 1
)
echo.

echo Step 2: Generating Prisma Client...
echo ----------------------------------------
cd packages\database

echo Cleaning old Prisma files...
if exist "..\..\node_modules\.prisma" (
    rmdir /s /q "..\..\node_modules\.prisma" 2>nul
)

echo Generating Prisma Client (this may take a moment)...
call npx prisma generate

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Prisma generate failed!
    echo.
    echo Common fixes:
    echo 1. Run this script as Administrator (Right-click -^> Run as administrator)
    echo 2. Close any programs that might lock .dll files (IDEs, antivirus)
    echo 3. Try: npm install --force
    echo.
    pause
    exit /b 1
)
echo [OK] Prisma Client generated
echo.

echo Step 3: Running migrations...
echo ----------------------------------------
echo This will create all 116 database tables
echo.

call npx prisma migrate deploy

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Migration failed!
    echo.
    echo Troubleshooting steps:
    echo 1. Make sure PostgreSQL is running
    echo 2. Check database exists: CREATE DATABASE pms_development;
    echo 3. Verify connection string in .env file
    echo.
    echo To create database manually:
    echo   psql -U postgres -c "CREATE DATABASE pms_development;"
    echo.
    pause
    exit /b 1
)
echo [OK] Migrations completed successfully
echo.

echo Step 4: Seeding database with demo data...
echo ----------------------------------------
call npx prisma db seed

if %errorlevel% neq 0 (
    echo [WARNING] Seeding failed!
    echo Database is ready but demo data may be missing
    echo You can continue and create users manually
    echo.
) else (
    echo [OK] Database seeded successfully
    echo.
)

cd ..\..

echo.
echo ========================================
echo SETUP COMPLETE!
echo ========================================
echo.
echo Database: PostgreSQL at localhost:5432
echo Database Name: pms_development
echo Tables Created: 116
echo.
echo Demo Credentials:
echo   Email:    admin@demo.pms-platform.local
echo   Password: demo123
echo   Tenant:   demo-company (optional)
echo.
echo Next Steps:
echo.
echo   1. Start Backend API:
echo      cd apps\api
echo      npm run dev
echo.
echo   2. Start Frontend (in new terminal):
echo      cd apps\web
echo      npm run dev
echo.
echo   3. Open Browser:
echo      http://localhost:3002
echo.
echo Documentation: TROUBLESHOOTING.md
echo.
pause
