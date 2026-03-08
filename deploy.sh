#!/bin/bash
# OpenClassTools VPS Deployment Script
# Deploys to: play.berkaybilge.space

set -e

echo "🚀 Starting deployment to play.berkaybilge.space..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="openclasstools"
APP_DIR="/var/www/play.berkaybilge.space"
DOMAIN="play.berkaybilge.space"
PORT=8090

# Check if running as root for initial setup
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please run this script as a regular user with sudo privileges, not root${NC}"
   exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"

# Update system
sudo apt-get update

# Install Node.js (v18 LTS) if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt-get install -y nginx
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "${YELLOW}Step 2: Setting up application directory...${NC}"

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

echo -e "${GREEN}✓ Application directory ready${NC}"

echo -e "${YELLOW}Step 3: Copying application files...${NC}"

# Copy all project files (excluding node_modules)
rsync -av --exclude='node_modules' --exclude='.git' --exclude='deploy.tar.gz' ./ $APP_DIR/

echo -e "${GREEN}✓ Files copied${NC}"

echo -e "${YELLOW}Step 4: Installing npm dependencies...${NC}"

cd $APP_DIR
npm install --production

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "${YELLOW}Step 5: Setting up environment...${NC}"

# Create .env if it doesn't exist
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f ".env" ]; then
        cp .env $APP_DIR/.env
        echo -e "${GREEN}✓ Environment file copied${NC}"
    else
        echo -e "${RED}⚠️  Warning: No .env file found. Please create one manually at $APP_DIR/.env${NC}"
        echo "Required variables:"
        echo "  GEMINI_API_KEY=your_api_key_here"
        echo "  PORT=8090"
    fi
fi

echo -e "${YELLOW}Step 6: Setting up Nginx configuration...${NC}"

# Create nginx config
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << 'EOF'
server {
    listen 80;
    server_name play.berkaybilge.space;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo -e "${GREEN}✓ Nginx configured${NC}"

echo -e "${YELLOW}Step 7: Setting up PM2 process manager...${NC}"

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Create ecosystem file
cat > $APP_DIR/ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './server.js',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    log_file: '/var/log/pm2/$APP_NAME.log',
    error_file: '/var/log/pm2/$APP_NAME-error.log',
    out_file: '/var/log/pm2/$APP_NAME-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Stop existing process if running
pm2 delete $APP_NAME 2>/dev/null || true

# Start with PM2
pm2 start $APP_DIR/ecosystem.config.cjs

# Save PM2 config
pm2 save

echo -e "${GREEN}✓ PM2 process configured${NC}"

echo -e "${YELLOW}Step 8: Setting up firewall...${NC}"

# Configure UFW
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo -e "${GREEN}✓ Firewall configured${NC}"

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo "Your app is now running at: http://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check app status"
echo "  pm2 logs $APP_NAME      - View logs"
echo "  pm2 restart $APP_NAME   - Restart app"
echo "  pm2 stop $APP_NAME      - Stop app"
echo ""
echo "To setup SSL with Let's Encrypt:"
echo "  sudo apt install certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
