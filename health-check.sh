#!/bin/bash
source .env 2>/dev/null || true

TUNNEL_URL=${TUNNEL_URL:-http://localhost:8080}
API_URL="$TUNNEL_URL/api/health"

echo "🏥 CryptoCraze Health Check"
echo "=========================="

# Check API health
echo "Checking API at: $API_URL"
if curl -s -f "$API_URL" > /dev/null 2>&1; then
    echo "✅ API is healthy"
    curl -s "$API_URL" | jq . 2>/dev/null || curl -s "$API_URL"
else
    echo "❌ API is not responding"
fi

# Check main app
echo ""
echo "Checking main application at: $TUNNEL_URL"
if curl -s -f "$TUNNEL_URL" > /dev/null 2>&1; then
    echo "✅ Application is accessible"
else
    echo "❌ Application is not responding"
fi
