#!/bin/bash
# ===========================================
# PMS Platform Deployment Script
# Deploys to pms.xzashr.com with SSL
# ===========================================

set -e

DOMAIN="pms.xzashr.com"
EMAIL="aerofyta@gmail.com"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  PMS Platform Deployment"
echo "  Domain: $DOMAIN"
echo "=========================================="

# ---- Step 1: Check prerequisites ----
echo ""
echo "[1/6] Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please log out and back in, then re-run this script."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose not found. Installing..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

echo "  Docker: $(docker --version)"

# ---- Step 2: Generate secrets if needed ----
echo ""
echo "[2/6] Checking environment configuration..."

if [ ! -f "$PROJECT_DIR/.env.production" ]; then
    echo "ERROR: .env.production not found!"
    echo "Copy .env.production.example and fill in your values."
    exit 1
fi

# Check for placeholder values
if grep -q "CHANGE_ME" "$PROJECT_DIR/.env.production"; then
    echo ""
    echo "WARNING: .env.production contains placeholder values!"
    echo "Generating secure secrets..."

    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    DB_PASSWORD=$(openssl rand -hex 16)

    sed -i "s|CHANGE_ME_GENERATE_WITH_openssl_rand_hex_32|$JWT_SECRET|" "$PROJECT_DIR/.env.production"
    # Handle second occurrence (SESSION_SECRET)
    sed -i "0,/CHANGE_ME_GENERATE_WITH_openssl_rand_hex_32/s|CHANGE_ME_GENERATE_WITH_openssl_rand_hex_32|$SESSION_SECRET|" "$PROJECT_DIR/.env.production"
    sed -i "s|CHANGE_ME_32_CHARS_EXACTLY_HERE_|$ENCRYPTION_KEY|" "$PROJECT_DIR/.env.production"
    sed -i "s|CHANGE_ME_STRONG_DB_PASSWORD_HERE|$DB_PASSWORD|" "$PROJECT_DIR/.env.production"

    echo "  Secrets generated and saved to .env.production"
    echo "  IMPORTANT: Back up .env.production securely!"
fi

# ---- Step 3: Setup SSL with Certbot ----
echo ""
echo "[3/6] Setting up SSL certificate for $DOMAIN..."

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    if ! command -v certbot &> /dev/null; then
        echo "  Installing Certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot
    fi

    echo "  Requesting SSL certificate..."
    sudo certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        --preferred-challenges http

    echo "  SSL certificate obtained!"
else
    echo "  SSL certificate already exists."
fi

# ---- Step 4: Create SSL nginx config ----
echo ""
echo "[4/6] Configuring nginx with SSL..."

mkdir -p "$PROJECT_DIR/nginx"

cat > "$PROJECT_DIR/nginx/pms.conf" << 'NGINX_CONF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name pms.xzashr.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name pms.xzashr.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/pms.xzashr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pms.xzashr.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json image/svg+xml;

    # Max upload size
    client_max_body_size 50M;

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Uploads proxy
    location /uploads {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (static files from container)
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONF

echo "  Nginx SSL config created."

# ---- Step 5: Build and deploy ----
echo ""
echo "[5/6] Building and deploying containers..."

cd "$PROJECT_DIR"

# Load production environment
set -a
source .env.production
set +a

# Build images
docker compose --env-file .env.production build --no-cache

# Stop old containers if running
docker compose --env-file .env.production down || true

# Start all services
docker compose --env-file .env.production up -d

# Wait for health checks
echo "  Waiting for services to start..."
sleep 10

echo "  Checking service health..."
docker compose --env-file .env.production ps

# ---- Step 6: Setup host nginx (SSL termination) ----
echo ""
echo "[6/6] Configuring host nginx for SSL..."

if ! command -v nginx &> /dev/null; then
    echo "  Installing nginx on host..."
    sudo apt-get install -y nginx
fi

sudo cp "$PROJECT_DIR/nginx/pms.conf" /etc/nginx/sites-available/pms.xzashr.com
sudo ln -sf /etc/nginx/sites-available/pms.xzashr.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Setup auto-renewal for SSL
echo "0 12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo tee /etc/cron.d/certbot-renew

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Your PMS Platform is live at:"
echo "  https://pms.xzashr.com"
echo ""
echo "  Services:"
echo "    Frontend:  https://pms.xzashr.com"
echo "    API:       https://pms.xzashr.com/api/v1"
echo "    Database:  PostgreSQL (internal)"
echo "    Cache:     Redis (internal)"
echo ""
echo "  Useful commands:"
echo "    docker compose --env-file .env.production logs -f    # View logs"
echo "    docker compose --env-file .env.production ps         # Service status"
echo "    docker compose --env-file .env.production restart    # Restart all"
echo "    docker compose --env-file .env.production down       # Stop all"
echo ""
