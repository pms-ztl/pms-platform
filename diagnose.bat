@echo off
echo ========================================
echo PMS PLATFORM - DIAGNOSTIC TOOL
echo ========================================
echo.
echo Collecting system information...
echo.

echo [1/8] Docker Status
echo ----------------------------------------
docker --version 2>nul
if %errorlevel% equ 0 (
    echo Docker installed: YES
    docker ps 2>nul
    if %errorlevel% equ 0 (
        echo Docker running: YES
        docker ps | findstr pms-postgres >nul
        if %errorlevel% equ 0 (
            echo PMS container exists: YES
        ) else (
            echo PMS container exists: NO
        )
    ) else (
        echo Docker running: NO
        echo ^! Docker Desktop is not running
    )
) else (
    echo Docker installed: NO
)
echo.

echo [2/8] PostgreSQL Native Installation
echo ----------------------------------------
sc query | findstr postgresql >nul
if %errorlevel% equ 0 (
    echo PostgreSQL service found: YES
    sc query | findstr postgresql
) else (
    echo PostgreSQL service found: NO
)
echo.

echo [3/8] Port 5432 Status
echo ----------------------------------------
netstat -ano | findstr :5432 >nul
if %errorlevel% equ 0 (
    echo Port 5432 in use: YES
    netstat -ano | findstr :5432
) else (
    echo Port 5432 in use: NO
    echo ^! PostgreSQL might not be running
)
echo.

echo [4/8] Node.js Version
echo ----------------------------------------
node --version
echo.

echo [5/8] NPM Version
echo ----------------------------------------
npm --version
echo.

echo [6/8] Prisma Client Status
echo ----------------------------------------
if exist "node_modules\.prisma\client" (
    echo Prisma Client: GENERATED
) else (
    echo Prisma Client: NOT GENERATED
    echo ^! Run: npx prisma generate
)
echo.

echo [7/8] Environment Files
echo ----------------------------------------
if exist "apps\api\.env" (
    echo Backend .env: EXISTS
) else (
    echo Backend .env: MISSING
    echo ^! Copy from .env.example
)

if exist "packages\database\.env" (
    echo Database .env: EXISTS
) else (
    echo Database .env: MISSING
)
echo.

echo [8/8] Database Connection Test
echo ----------------------------------------
cd packages\database
echo Testing connection to PostgreSQL...
npx prisma db execute --stdin < nul 2>&1 | findstr "Error:" >nul
if %errorlevel% equ 0 (
    echo Database connection: FAILED
    echo ^! PostgreSQL not accessible at localhost:5432
) else (
    echo Database connection: Checking...
    npx ts-node -e "console.log('Node works')" 2>nul
)
cd ..\..
echo.

echo ========================================
echo DIAGNOSTIC COMPLETE
echo ========================================
echo.
echo Recommendations:
echo.

docker ps >nul 2>&1
if %errorlevel% neq 0 (
    sc query | findstr postgresql >nul
    if %errorlevel% neq 0 (
        echo ^! NO DATABASE FOUND
        echo.
        echo   Option A: Install Docker Desktop and run setup.bat
        echo   Option B: Install PostgreSQL native and run setup-no-docker.bat
        echo.
        echo   PostgreSQL Download: https://www.postgresql.org/download/windows/
    ) else (
        echo ^! PostgreSQL native detected
        echo   Run: setup-no-docker.bat
    )
) else (
    docker ps | findstr pms-postgres >nul
    if %errorlevel% neq 0 (
        echo ^! Docker running but no PMS container
        echo   Run: setup.bat
    ) else (
        echo ✓ Docker container exists
        echo   Database should be accessible
        echo.
        echo   If setup still fails, check:
        echo   1. Container is running: docker ps
        echo   2. Port not blocked: netstat -ano ^| findstr :5432
        echo   3. Connection string in .env file
    )
)
echo.
echo For detailed help: see TROUBLESHOOTING.md
echo.
pause
