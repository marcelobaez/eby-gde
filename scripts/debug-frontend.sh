#!/bin/bash

echo "=========================================="
echo "Frontend Debug - Detailed Analysis"
echo "=========================================="
echo ""

echo "1. Container Status"
echo "-------------------------------------------"
docker ps -a --filter "name=eby-exp-frontend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2. Full Container Logs"
echo "-------------------------------------------"
docker logs eby-exp-frontend 2>&1
echo ""

echo "3. Check if Process is Running Inside Container"
echo "-------------------------------------------"
docker exec eby-exp-frontend ps aux 2>&1 || echo "Cannot exec into container (might be stopped)"
echo ""

echo "4. Check Port 3000 Binding"
echo "-------------------------------------------"
echo "From host:"
netstat -tlnp 2>/dev/null | grep 3000 || ss -tlnp | grep 3000
echo ""
echo "From container:"
docker exec eby-exp-frontend netstat -tlnp 2>/dev/null | grep 3000 || docker exec eby-exp-frontend ss -tlnp | grep 3000 || echo "Cannot check inside container"
echo ""

echo "5. Try Accessing Frontend"
echo "-------------------------------------------"
echo "HTTP request with verbose output:"
curl -v --max-time 5 http://localhost:3000 2>&1 | head -30
echo ""

echo "6. Check Environment Variables Inside Container"
echo "-------------------------------------------"
docker exec eby-exp-frontend env | grep -E "(NODE|NEXT|AZURE|ORACLE|PG_)" | sort || echo "Cannot check env vars"
echo ""

echo "7. Check if Next.js Build Exists"
echo "-------------------------------------------"
docker exec eby-exp-frontend ls -la /app/.next 2>&1 | head -20 || echo "Cannot check .next directory"
echo ""

echo "8. Check Node.js Version"
echo "-------------------------------------------"
docker exec eby-exp-frontend node --version 2>&1 || echo "Cannot check node version"
echo ""

echo "9. Recent Docker Events for Frontend"
echo "-------------------------------------------"
docker events --filter "container=eby-exp-frontend" --since 10m --until 0s 2>&1 | tail -20
echo ""

echo "=========================================="
echo "Debug Complete"
echo "=========================================="
echo ""
echo "Common Issues:"
echo "  - If container keeps restarting: App is crashing on startup"
echo "  - If no .next directory: Build failed during docker build"
echo "  - If process not running: CMD in Dockerfile failed"
echo "  - If port not bound: App didn't start listening on port 3000"
echo ""
