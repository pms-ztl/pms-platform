#!/usr/bin/env bash
# ============================================
# PMS Platform Docker Launcher (Bash)
# ============================================
# One-command setup for Linux/macOS/WSL users
# Usage: ./run.sh [options]
#   Options:
#     --build    Force rebuild images
#     --seed     Run database seed after migrations
#     --stop     Stop all containers
#     --clean    Stop and remove all containers, volumes, networks
#     --logs     Follow logs
#     --help     Show this help

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_success() { echo -e "${GREEN}$1${NC}"; }
print_info() { echo -e "${CYAN}$1${NC}"; }
print_warning() { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }

# Parse arguments
BUILD=false
SEED=false
STOP=false
CLEAN=false
LOGS=false
HELP=false

for arg in "$@"; do
    case $arg in
        --build) BUILD=true ;;
        --seed) SEED=true ;;
        --stop) STOP=true ;;
        --clean) CLEAN=true ;;
        --logs) LOGS=true ;;
        --help) HELP=true ;;
        *)
            print_error "Unknown option: $arg"
            print_info "Run ./run.sh --help for usage"
            exit 1
            ;;
    esac
done

# Show help
if [ "$HELP" = true ]; then
    cat << EOF
PMS Platform Docker Launcher

Usage: ./run.sh [options]

Options:
  --build     Force rebuild Docker images
  --seed      Run database seed after migrations
  --stop      Stop all containers
  --clean     Stop and remove all containers, volumes, and networks
  --logs      Follow container logs
  --help      Show this help message

Examples:
  ./run.sh              # Start with existing images
  ./run.sh --build      # Rebuild and start
  ./run.sh --seed       # Start and seed database
  ./run.sh --stop       # Stop all containers
  ./run.sh --clean      # Full cleanup
  ./run.sh --logs       # View logs

After starting:
  - Frontend: http://localhost:3002
  - Backend API: http://localhost:3001
  - Database: localhost:5432
  - Redis: localhost:6379
EOF
    exit 0
fi

# Stop containers
if [ "$STOP" = true ]; then
    print_info "Stopping PMS Platform containers..."
    docker-compose down
    print_success "✓ Containers stopped"
    exit 0
fi

# Clean everything
if [ "$CLEAN" = true ]; then
    print_warning "This will remove all containers, volumes, and networks!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Cleanup cancelled"
        exit 0
    fi

    print_info "Cleaning up PMS Platform..."
    docker-compose down -v --remove-orphans
    docker volume rm pms_postgres_data pms_redis_data 2>/dev/null || true
    docker network rm pms-network 2>/dev/null || true
    print_success "✓ Cleanup complete"
    exit 0
fi

# Follow logs
if [ "$LOGS" = true ]; then
    print_info "Following container logs (Ctrl+C to exit)..."
    docker-compose logs -f
    exit 0
fi

print_info "==================================="
print_info "  PMS Platform Docker Setup"
print_info "==================================="
echo ""

# Check Docker is installed
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "✗ Docker is not installed"
    print_error "  Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi
DOCKER_VERSION=$(docker --version)
print_success "✓ Docker found: $DOCKER_VERSION"

# Check Docker is running
print_info "Checking Docker daemon..."
if ! docker ps &> /dev/null; then
    print_error "✗ Docker daemon is not running"
    print_error "  Please start Docker"
    exit 1
fi
print_success "✓ Docker daemon is running"

# Check Docker Compose
print_info "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "✗ Docker Compose is not installed"
    print_error "  Please install Docker Compose"
    exit 1
fi
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
else
    COMPOSE_VERSION=$(docker compose version)
fi
print_success "✓ Docker Compose found: $COMPOSE_VERSION"

# Create .env from .env.docker if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env from .env.docker..."
    if [ -f ".env.docker" ]; then
        cp ".env.docker" ".env"
        print_success "✓ .env file created"
        print_warning "⚠ Please review .env and update secrets for production!"
    else
        print_error "✗ .env.docker template not found"
        exit 1
    fi
else
    print_info ".env file already exists"
fi

# Build or pull images
if [ "$BUILD" = true ]; then
    print_info "Building Docker images (this may take several minutes)..."
    docker-compose build --no-cache
    print_success "✓ Images built successfully"
fi

# Start containers
print_info "Starting PMS Platform containers..."
print_info "  - Database (PostgreSQL)"
print_info "  - Cache (Redis)"
print_info "  - Backend API"
print_info "  - Frontend Web App"
echo ""

if [ "$BUILD" = true ]; then
    docker-compose up -d --build
else
    docker-compose up -d
fi

print_success "✓ Containers started"
echo ""

# Wait for services to be healthy
print_info "Waiting for services to be healthy..."
print_info "  This may take up to 60 seconds..."
echo ""

MAX_WAIT=60
WAITED=0
HEALTHY=false

while [ $WAITED -lt $MAX_WAIT ] && [ "$HEALTHY" = false ]; do
    sleep 5
    WAITED=$((WAITED + 5))

    # Check backend health
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        HEALTHY=true
    else
        echo -n "."
    fi
done

echo ""

if [ "$HEALTHY" = true ]; then
    print_success "✓ Backend API is healthy"
else
    print_warning "⚠ Backend API health check timeout"
    print_info "  Containers are starting, this may take a few more moments"
    print_info "  Run: ./run.sh --logs to check progress"
fi

# Run seed if requested
if [ "$SEED" = true ]; then
    print_info "Running database seed..."
    if docker-compose exec backend npm run db:seed; then
        print_success "✓ Database seeded"
    else
        print_warning "⚠ Database seed failed (may not be configured)"
    fi
fi

# Success message
echo ""
print_success "========================================="
print_success "  PMS Platform is running!"
print_success "========================================="
echo ""
print_info "Access the application:"
echo -e "  Frontend:    ${YELLOW}http://localhost:3002${NC}"
echo -e "  Backend API: ${YELLOW}http://localhost:3001${NC}"
echo -e "  Database:    ${YELLOW}localhost:5432${NC}"
echo -e "  Redis:       ${YELLOW}localhost:6379${NC}"
echo ""
print_info "Useful commands:"
echo "  View logs:       ./run.sh --logs"
echo "  Stop:            ./run.sh --stop"
echo "  Rebuild:         ./run.sh --build"
echo "  Full cleanup:    ./run.sh --clean"
echo ""
print_info "Database migrations run automatically on backend startup"
echo ""
