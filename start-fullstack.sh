#!/bin/bash

echo "🚀 Starting CryptoCraze Full Stack Application..."

# Set environment variables
export NODE_ENV=development
export PORT=3001
export FRONTEND_PORT=5173

# Kill any existing processes on required ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start Redis if not running
echo "🔴 Starting Redis..."
npm run redis:up

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
sleep 5

# Start backend server
echo "🖥️  Starting backend server on port 3001..."
npm run dev:server &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 10

# Start frontend development server
echo "🎨 Starting frontend development server on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Full stack application started!"
echo "🌐 Frontend: http://localhost:5173"
echo "🔗 Backend API: http://localhost:3001"
echo "📚 API Documentation: http://localhost:3001/api-docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    npm run redis:down
    echo "✅ All services stopped"
    exit 0
}

# Set trap to catch Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for user interrupt
wait