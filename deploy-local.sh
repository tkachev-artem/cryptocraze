#!/bin/bash

set -e

echo "🚀 Deploying CryptoCraze Locally"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build
npm run build:server

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Start the application locally
echo -e "${YELLOW}🚀 Starting CryptoCraze application...${NC}"
node start-server.cjs &
APP_PID=$!

# Wait for application to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 3

# Check if application is running
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application started successfully!${NC}"
    echo -e "${GREEN}🌐 Local URL: http://localhost:3001${NC}"
    echo -e "${GREEN}📊 Health check: http://localhost:3001/health${NC}"
    
    # Save process ID
    echo $APP_PID > app.pid
    
    echo -e "${YELLOW}📋 Management commands:${NC}"
    echo -e "${YELLOW}  - Stop app: kill \$(cat app.pid)${NC}"
    echo -e "${YELLOW}  - View logs: check the terminal output${NC}"
else
    echo -e "${RED}❌ Application failed to start.${NC}"
    kill $APP_PID 2>/dev/null || true
    exit 1
fi