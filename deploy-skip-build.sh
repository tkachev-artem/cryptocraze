#!/bin/bash

set -e

echo "🚀 Deploying CryptoCraze to Yandex Cloud (skip build)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo -e "${GREEN}✅ Skipping build - using existing dist files${NC}"

# Install production dependencies
echo -e "${YELLOW}📦 Installing production dependencies...${NC}"
npm ci --omit=dev

# Run database migrations (if needed)
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
npm run db:migrate || echo -e "${YELLOW}⚠️ Migrations skipped or failed${NC}"

# Stop any existing processes on port 3001
echo -e "${YELLOW}🛑 Stopping existing processes...${NC}"
pkill -f "node.*server-dist" || true
pkill -f "node.*3001" || true
pkill -f "cloudflared" || true

# Start Redis if not running
echo -e "${YELLOW}🔄 Starting Redis...${NC}"
if ! pgrep -x "redis-server" > /dev/null; then
    redis-server --daemonize yes --port 6379 || {
        echo -e "${YELLOW}📥 Installing Redis...${NC}"
        sudo apt update
        sudo apt install -y redis-server
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
    }
fi

# Start the application
echo -e "${YELLOW}🚀 Starting CryptoCraze application...${NC}"
nohup node start-server.cjs > app.log 2>&1 &
APP_PID=$!

# Wait for application to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 5

# Check if application is running
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application started successfully!${NC}"
else
    echo -e "${RED}❌ Application failed to start. Check app.log for details.${NC}"
    tail -n 50 app.log
    exit 1
fi

# Install Cloudflare Tunnel if not exists
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}📥 Installing Cloudflare Tunnel...${NC}"
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb || {
        echo -e "${YELLOW}📥 Trying alternative installation method...${NC}"
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        chmod +x cloudflared-linux-amd64
        sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
    }
fi

# Start Cloudflare tunnel
echo -e "${YELLOW}🌐 Starting Cloudflare tunnel...${NC}"
nohup cloudflared tunnel --url http://localhost:3001 > tunnel.log 2>&1 &
TUNNEL_PID=$!

# Wait and get tunnel URL with better error handling
sleep 15
TUNNEL_URL=""
for i in {1..30}; do
    TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com' tunnel.log 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    echo -e "${YELLOW}⏳ Waiting for tunnel URL... (attempt $i/30)${NC}"
    sleep 2
done

if [ -n "$TUNNEL_URL" ]; then
    echo -e "${GREEN}🌍 Application deployed successfully!${NC}"
    echo -e "${GREEN}🌐 Local URL: http://localhost:3001${NC}"
    echo -e "${GREEN}🌍 Public URL: $TUNNEL_URL${NC}"
    echo -e "${GREEN}📊 Health check: $TUNNEL_URL/health${NC}"
    
    # Save process IDs for later management
    echo $APP_PID > app.pid
    echo $TUNNEL_PID > tunnel.pid
    
    echo -e "${YELLOW}📋 Management commands:${NC}"
    echo -e "${YELLOW}  - View app logs: tail -f app.log${NC}"
    echo -e "${YELLOW}  - View tunnel logs: tail -f tunnel.log${NC}"
    echo -e "${YELLOW}  - Stop app: kill \$(cat app.pid)${NC}"
    echo -e "${YELLOW}  - Stop tunnel: kill \$(cat tunnel.pid)${NC}"
    
    # Update .env.production with new tunnel URL and restart app
    OLD_TUNNEL_URL=$(grep TUNNEL_URL .env.production | cut -d'=' -f2 2>/dev/null || echo "")
    if [ "$TUNNEL_URL" != "$OLD_TUNNEL_URL" ]; then
        echo -e "${YELLOW}📝 Updating .env.production with new tunnel URL...${NC}"
        sed -i "s|TUNNEL_URL=.*|TUNNEL_URL=$TUNNEL_URL|g" .env.production
        sed -i "s|API_URL=.*|API_URL=$TUNNEL_URL/api|g" .env.production
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=$TUNNEL_URL|g" .env.production
        sed -i "s|GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=$TUNNEL_URL/api/auth/google/callback|g" .env.production
        
        echo -e "${GREEN}✅ Updated .env.production with new URLs${NC}"
        echo -e "${YELLOW}🔄 Restarting application with new configuration...${NC}"
        
        # Stop and restart the app with new environment
        kill $APP_PID 2>/dev/null || true
        sleep 3
        
        # Reload environment variables
        export $(cat .env.production | grep -v '^#' | xargs)
        
        # Start app again with new environment
        nohup node start-server.cjs > app.log 2>&1 &
        APP_PID=$!
        echo $APP_PID > app.pid
        
        sleep 5
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Application restarted successfully with new tunnel URL!${NC}"
            echo -e "${GREEN}🎉 FINAL URL: $TUNNEL_URL${NC}"
        else
            echo -e "${RED}❌ Application failed to restart. Check app.log for details.${NC}"
            tail -n 20 app.log
        fi
    fi
    
else
    echo -e "${RED}❌ Failed to get tunnel URL. Check tunnel.log for details.${NC}"
    tail -n 20 tunnel.log
    exit 1
fi