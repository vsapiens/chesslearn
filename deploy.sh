#!/usr/bin/env bash
# =============================================================================
# ChessLearn — EC2 Production Deployment Script
# =============================================================================
# Run this on a fresh EC2 instance (Amazon Linux 2023 or Ubuntu 22.04)
# Usage: chmod +x deploy.sh && ./deploy.sh
# =============================================================================
set -euo pipefail

REPO_DIR="/opt/chesslearn"

echo "=== ChessLearn Production Deployment ==="
echo ""

# ── 1. Install Docker ───────────────────────────────────────────────────────

if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            amzn)
                sudo yum update -y
                sudo yum install -y docker git
                sudo systemctl enable docker
                sudo systemctl start docker
                sudo usermod -aG docker "$USER"
                ;;
            ubuntu|debian)
                sudo apt-get update
                sudo apt-get install -y docker.io docker-compose-plugin git
                sudo systemctl enable docker
                sudo systemctl start docker
                sudo usermod -aG docker "$USER"
                ;;
            *)
                echo "Unsupported OS: $ID. Install Docker manually."
                exit 1
                ;;
        esac
    fi
    echo "Docker installed."
else
    echo "Docker already installed."
fi

# Install Docker Compose plugin if not present
if ! docker compose version &>/dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
    sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    echo "Docker Compose installed."
fi

# ── 2. Set up environment ───────────────────────────────────────────────────

cd "$REPO_DIR" 2>/dev/null || {
    echo ""
    echo "Repository not found at $REPO_DIR."
    echo "Clone your repo first:"
    echo "  sudo git clone <your-repo-url> $REPO_DIR"
    echo "  cd $REPO_DIR"
    echo "Then re-run this script."
    exit 1
}

if [ ! -f .env.production ]; then
    echo ""
    echo "Creating .env.production from template..."
    cp .env.production.example .env.production

    read -rp "Enter your domain (e.g., chess.example.com): " DOMAIN
    sed -i "s/chess.yourdomain.com/$DOMAIN/g" .env.production

    echo ""
    echo "Environment file created. Review it:"
    echo "  cat .env.production"
    echo ""
fi

# Load domain from env
DOMAIN=$(grep "^DOMAIN=" .env.production | cut -d'=' -f2)

# ── 3. Update nginx config with actual domain ──────────────────────────────

if grep -q "YOUR_DOMAIN" nginx/nginx.prod.conf; then
    echo "Updating nginx config with domain: $DOMAIN"
    sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/nginx.prod.conf
fi

# ── 4. Get SSL certificates ────────────────────────────────────────────────

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ] && [ ! -d "$(docker volume inspect certbot-conf --format '{{.Mountpoint}}' 2>/dev/null)/live/$DOMAIN" ]; then
    echo ""
    echo "Obtaining SSL certificate for $DOMAIN..."
    echo "Make sure your domain's A record points to this server's IP."
    echo ""
    read -rp "Email for Let's Encrypt notifications: " EMAIL

    # Use standalone certbot for initial cert (nginx not running yet)
    docker run --rm \
        -v chesslearn_certbot-conf:/etc/letsencrypt \
        -v chesslearn_certbot-www:/var/www/certbot \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"

    echo "SSL certificate obtained."
fi

# ── 5. Build and start ─────────────────────────────────────────────────────

echo ""
echo "Building and starting ChessLearn..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your app should be available at: https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  make prod-logs    # View logs"
echo "  make prod-down    # Stop services"
echo "  make prod-up      # Start services"
echo ""
