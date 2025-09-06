#!/bin/bash
# Hotfix script to disable WebSocket in running container

# Copy updated client config
docker cp src/lib/socket.ts cryptocraze-app-1:/app/src/lib/socket.ts

# Copy updated server config  
docker cp server/routes.ts cryptocraze-app-1:/app/server/routes.ts

# Rebuild frontend inside container
docker exec cryptocraze-app-1 npm run build

# Restart the server
docker-compose restart app

echo "✅ Hotfix applied!"