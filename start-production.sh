#!/bin/bash
echo "🚀 Starting CryptoCraze Production Server..."

# Load environment
source .env

# Start backend server
echo "🖥️  Starting backend server..."
NODE_ENV=production npm run start &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 10

# Start unified proxy
echo "🔄 Starting unified proxy..."
NODE_ENV=production npm run proxy &
PROXY_PID=$!

echo "✅ Production services started!"
echo "🌐 Application: $TUNNEL_URL"
echo "📡 API: $TUNNEL_URL/api"
echo "📚 API Docs: $TUNNEL_URL/api-docs"
echo ""
echo "Press Ctrl+C to stop services"

cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $SERVER_PID 2>/dev/null || true
    kill $PROXY_PID 2>/dev/null || true
    echo "✅ Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM
wait
