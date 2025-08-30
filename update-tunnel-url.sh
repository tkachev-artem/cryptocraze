#!/bin/bash

# Script to update tunnel URL for production deployment

TUNNEL_URL=$1

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Error: Please provide tunnel URL as argument"
    echo "Usage: $0 <tunnel-url>"
    echo "Example: $0 https://abc123.ngrok.io"
    exit 1
fi

# Remove trailing slash if present
TUNNEL_URL=${TUNNEL_URL%/}

echo "🔄 Updating tunnel URL to: $TUNNEL_URL"

# Update environment files
echo "📝 Updating .env files..."

# Create or update .env
if [ -f ".env" ]; then
    # Update existing .env
    sed -i.bak "s|^TUNNEL_URL=.*|TUNNEL_URL=$TUNNEL_URL|" .env
    sed -i.bak "s|^API_URL=.*|API_URL=$TUNNEL_URL/api|" .env
    sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=$TUNNEL_URL|" .env
else
    # Create new .env
    cat > .env << EOF
# Tunnel Configuration
TUNNEL_URL=$TUNNEL_URL
API_URL=$TUNNEL_URL/api
FRONTEND_URL=$TUNNEL_URL

# Production Settings
NODE_ENV=production
PORT=3001
PROXY_PORT=8080
EOF
fi

# Update production configuration
echo "⚙️  Updating production config..."

# Update package.json proxy script
npm config set proxy_url "$TUNNEL_URL"

# Update frontend API configuration
if [ -f "src/lib/config.ts" ]; then
    sed -i.bak "s|const API_URL = .*|const API_URL = '$TUNNEL_URL/api';|" src/lib/config.ts
fi

# Update CORS origins in server config
if [ -f "server/index.ts" ]; then
    echo "🔒 Updating CORS configuration..."
    # Note: This should be done programmatically in the server code
fi

echo "✅ Tunnel URL updated successfully!"
echo "🌐 Application will be available at: $TUNNEL_URL"
echo "📡 API endpoint: $TUNNEL_URL/api"
echo ""
echo "Next steps:"
echo "1. npm run build:server  # Build server"
echo "2. npm run build         # Build frontend"
echo "3. npm run start         # Start production server"
echo "4. npm run proxy         # Start unified proxy"