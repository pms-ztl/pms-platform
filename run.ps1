#!/usr/bin/env pwsh
# ============================================
# PMS Platform Docker Launcher (PowerShell)
# ============================================
# One-command setup for Windows/PowerShell users
# Usage: .\run.ps1 [options]
#   Options:
#     -Build    Force rebuild images
#     -Seed     Run database seed after migrations
#     -Stop     Stop all containers
#     -Clean    Stop and remove all containers, volumes, networks
#     -Logs     Follow logs
#     -Help     Show this help

param(
    [switch]$Build,
    [switch]$Seed,
    [switch]$Stop,
    [switch]$Clean,
    [switch]$Logs,
    [switch]$Help
)

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Show help
if ($Help) {
    Write-Host @"
PMS Platform Docker Launcher

Usage: .\run.ps1 [options]

Options:
  -Build     Force rebuild Docker images
  -Seed      Run database seed after migrations
  -Stop      Stop all containers
  -Clean     Stop and remove all containers, volumes, and networks
  -Logs      Follow container logs
  -Help      Show this help message

Examples:
  .\run.ps1              # Start with existing images
  .\run.ps1 -Build       # Rebuild and start
  .\run.ps1 -Seed        # Start and seed database
  .\run.ps1 -Stop        # Stop all containers
  .\run.ps1 -Clean       # Full cleanup
  .\run.ps1 -Logs        # View logs

After starting:
  - Frontend: http://localhost:3002
  - Backend API: http://localhost:3001
  - Database: localhost:5432
  - Redis: localhost:6379
"@
    exit 0
}

# Stop containers
if ($Stop) {
    Write-Info "Stopping PMS Platform containers..."
    docker-compose down
    Write-Success "✓ Containers stopped"
    exit 0
}

# Clean everything
if ($Clean) {
    Write-Warning "This will remove all containers, volumes, and networks!"
    $confirm = Read-Host "Are you sure? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Info "Cleanup cancelled"
        exit 0
    }

    Write-Info "Cleaning up PMS Platform..."
    docker-compose down -v --remove-orphans
    docker volume rm pms_postgres_data pms_redis_data -f 2>$null
    docker network rm pms-network -f 2>$null
    Write-Success "✓ Cleanup complete"
    exit 0
}

# Follow logs
if ($Logs) {
    Write-Info "Following container logs (Ctrl+C to exit)..."
    docker-compose logs -f
    exit 0
}

Write-Info "==================================="
Write-Info "  PMS Platform Docker Setup"
Write-Info "==================================="
Write-Host ""

# Check Docker is installed
Write-Info "Checking Docker installation..."
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
    Write-Success "✓ Docker found: $dockerVersion"
} catch {
    Write-Error "✗ Docker is not installed or not running"
    Write-Error "  Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
}

# Check Docker is running
Write-Info "Checking Docker daemon..."
try {
    docker ps >$null 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker daemon not running"
    }
    Write-Success "✓ Docker daemon is running"
} catch {
    Write-Error "✗ Docker daemon is not running"
    Write-Error "  Please start Docker Desktop"
    exit 1
}

# Check Docker Compose
Write-Info "Checking Docker Compose..."
try {
    $composeVersion = docker-compose --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        # Try docker compose (new version)
        $composeVersion = docker compose version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Compose not found"
        }
    }
    Write-Success "✓ Docker Compose found: $composeVersion"
} catch {
    Write-Error "✗ Docker Compose is not installed"
    Write-Error "  Please install Docker Desktop which includes Docker Compose"
    exit 1
}

# Create .env from .env.docker if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Info "Creating .env from .env.docker..."
    if (Test-Path ".env.docker") {
        Copy-Item ".env.docker" ".env"
        Write-Success "✓ .env file created"
        Write-Warning "⚠ Please review .env and update secrets for production!"
    } else {
        Write-Error "✗ .env.docker template not found"
        exit 1
    }
} else {
    Write-Info ".env file already exists"
}

# Build or pull images
if ($Build) {
    Write-Info "Building Docker images (this may take several minutes)..."
    docker-compose build --no-cache
    if ($LASTEXITCODE -ne 0) {
        Write-Error "✗ Docker build failed"
        exit 1
    }
    Write-Success "✓ Images built successfully"
}

# Start containers
Write-Info "Starting PMS Platform containers..."
Write-Info "  - Database (PostgreSQL)"
Write-Info "  - Cache (Redis)"
Write-Info "  - Backend API"
Write-Info "  - Frontend Web App"
Write-Host ""

if ($Build) {
    docker-compose up -d --build
} else {
    docker-compose up -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "✗ Failed to start containers"
    Write-Info "Run with -Logs to see container logs"
    exit 1
}

Write-Success "✓ Containers started"
Write-Host ""

# Wait for services to be healthy
Write-Info "Waiting for services to be healthy..."
Write-Info "  This may take up to 60 seconds..."
Write-Host ""

$maxWait = 60
$waited = 0
$healthy = $false

while ($waited -lt $maxWait -and -not $healthy) {
    Start-Sleep -Seconds 5
    $waited += 5

    # Check backend health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $healthy = $true
        }
    } catch {
        Write-Host "." -NoNewline
    }
}

Write-Host ""

if ($healthy) {
    Write-Success "✓ Backend API is healthy"
} else {
    Write-Warning "⚠ Backend API health check timeout"
    Write-Info "  Containers are starting, this may take a few more moments"
    Write-Info "  Run: .\run.ps1 -Logs to check progress"
}

# Run seed if requested
if ($Seed) {
    Write-Info "Running database seed..."
    docker-compose exec backend npm run db:seed
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ Database seeded"
    } else {
        Write-Warning "⚠ Database seed failed (may not be configured)"
    }
}

# Success message
Write-Host ""
Write-Success "========================================="
Write-Success "  PMS Platform is running!"
Write-Success "========================================="
Write-Host ""
Write-Info "Access the application:"
Write-Host "  Frontend:    " -NoNewline
Write-Host "http://localhost:3002" -ForegroundColor Yellow
Write-Host "  Backend API: " -NoNewline
Write-Host "http://localhost:3001" -ForegroundColor Yellow
Write-Host "  Database:    " -NoNewline
Write-Host "localhost:5432" -ForegroundColor Yellow
Write-Host "  Redis:       " -NoNewline
Write-Host "localhost:6379" -ForegroundColor Yellow
Write-Host ""
Write-Info "Useful commands:"
Write-Host "  View logs:       .\run.ps1 -Logs"
Write-Host "  Stop:            .\run.ps1 -Stop"
Write-Host "  Rebuild:         .\run.ps1 -Build"
Write-Host "  Full cleanup:    .\run.ps1 -Clean"
Write-Host ""
Write-Info "Database migrations run automatically on backend startup"
Write-Host ""
