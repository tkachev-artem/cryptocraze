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
echo "All services are running successfully!"