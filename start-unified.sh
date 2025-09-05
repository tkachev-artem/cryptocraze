#!/bin/bash

# CryptoCraze Unified Deployment Script
echo "Starting CryptoCraze unified deployment..."

# Build the application
echo "Building application..."
npm run build:all

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down

# Start the full stack
echo "Starting services (PostgreSQL, Redis, ClickHouse, App)..."
docker-compose up --build -d

# Wait for services to be ready
echo "Waiting for services to be healthy..."
sleep 30

# Check service status
echo "Checking service status..."
docker-compose ps

# Show logs
echo "Recent logs:"
docker-compose logs --tail=20

echo "Deployment complete!"
echo "Application available at: http://localhost:1111"
echo "Admin dashboard: http://localhost:1111/admin/dashboard"
echo "Ngrok tunnel: ngrok http 1111 --domain=relieved-magpie-pleasing.ngrok-free.app"

# Optional: Start ngrok automatically
read -p "Start ngrok tunnel automatically? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting ngrok tunnel..."
    ngrok http 1111 --domain=relieved-magpie-pleasing.ngrok-free.app
fi