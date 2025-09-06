#!/bin/bash

# Fix 502 Bad Gateway Test Script
# This script tests the Docker setup to ensure 502 errors are resolved

set -e  # Exit on any error

echo "🧪 Testing 502 Bad Gateway fixes..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a service is healthy
check_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}🔍 Checking health of $service_name...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service_name | grep -q "healthy"; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        elif docker-compose ps $service_name | grep -q "unhealthy"; then
            echo -e "${RED}❌ $service_name is unhealthy${NC}"
            return 1
        fi
        
        echo -e "${YELLOW}⏳ Waiting for $service_name health check... (attempt $attempt/$max_attempts)${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name health check timeout${NC}"
    return 1
}

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local method=${3:-GET}
    
    echo -e "${BLUE}🧪 Testing $method $endpoint (expecting $expected_status)...${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:1111$endpoint")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "http://localhost:1111$endpoint")
    fi
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ $endpoint returned $response${NC}"
        return 0
    else
        echo -e "${RED}❌ $endpoint returned $response (expected $expected_status)${NC}"
        return 1
    fi
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    docker-compose down
}

# Set trap for cleanup
trap cleanup EXIT

echo -e "${BLUE}📦 Building and starting Docker containers...${NC}"
docker-compose down || true
docker-compose up -d --build

echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 10

# Check service health
echo -e "${BLUE}🏥 Checking service health...${NC}"
check_service_health "postgres" || exit 1
check_service_health "redis" || exit 1
check_service_health "app" || exit 1

echo -e "${BLUE}🌐 Testing HTTP endpoints...${NC}"

# Test health endpoint
test_endpoint "/health" 200 || exit 1

# Test API endpoints that were failing
test_endpoint "/api/deals/user" 401 || exit 1  # Should return 401 (unauthorized) not 502
test_endpoint "/socket.io/" 200 || exit 1  # Socket.IO polling endpoint

# Test static assets
test_endpoint "/avatar-big.svg" 200 || exit 1

echo -e "${GREEN}🎉 All tests passed! 502 errors should be resolved.${NC}"
echo -e "${GREEN}✅ The following issues have been fixed:${NC}"
echo -e "${GREEN}   - Docker health checks implemented${NC}"
echo -e "${GREEN}   - nginx upstream configuration optimized${NC}"
echo -e "${GREEN}   - Server startup sequence improved${NC}"
echo -e "${GREEN}   - Enhanced retry and timeout settings${NC}"

echo -e "${BLUE}📊 Container status:${NC}"
docker-compose ps

echo -e "${BLUE}📋 nginx logs (last 20 lines):${NC}"
docker-compose logs --tail=20 nginx

echo -e "${BLUE}📋 app logs (last 20 lines):${NC}"
docker-compose logs --tail=20 app

echo -e "${YELLOW}💡 To continue monitoring:${NC}"
echo -e "${YELLOW}   - Watch logs: docker-compose logs -f${NC}"
echo -e "${YELLOW}   - Check health: docker-compose ps${NC}"
echo -e "${YELLOW}   - Stop services: docker-compose down${NC}"