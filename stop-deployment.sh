#!/bin/bash

echo "🛑 Stopping CryptoCraze deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop application
if [ -f "app.pid" ]; then
    APP_PID=$(cat app.pid)
    echo -e "${YELLOW}🛑 Stopping application (PID: $APP_PID)...${NC}"
    kill $APP_PID 2>/dev/null || echo -e "${YELLOW}⚠️ App process already stopped${NC}"
    rm -f app.pid
else
    echo -e "${YELLOW}🛑 Stopping any running server processes...${NC}"
    pkill -f "start-server.cjs" || true
    pkill -f "node.*server-dist" || true
    pkill -f "node.*3001" || true
fi

# Stop tunnel
if [ -f "tunnel.pid" ]; then
    TUNNEL_PID=$(cat tunnel.pid)
    echo -e "${YELLOW}🛑 Stopping tunnel (PID: $TUNNEL_PID)...${NC}"
    kill $TUNNEL_PID 2>/dev/null || echo -e "${YELLOW}⚠️ Tunnel process already stopped${NC}"
    rm -f tunnel.pid
else
    echo -e "${YELLOW}🛑 Stopping any running tunnel processes...${NC}"
    pkill -f cloudflared || true
fi

# Clean up log files (optional)
echo -e "${YELLOW}📋 Log files preserved: app.log, tunnel.log${NC}"
echo -e "${GREEN}✅ Deployment stopped${NC}"