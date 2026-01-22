#!/bin/bash

echo "=========================================="
echo "Health Check Diagnostics"
echo "=========================================="
echo ""

echo "1. Checking Docker Containers"
echo "-------------------------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2. Checking Container Logs (Last 20 lines each)"
echo "-------------------------------------------"

echo ""
echo "Backend Logs:"
docker logs --tail 20 eby-exp-backend 2>&1 | tail -20

echo ""
echo "Frontend Logs:"
docker logs --tail 20 eby-exp-frontend 2>&1 | tail -20

echo ""
echo "Nginx Logs:"
docker logs --tail 20 nginx 2>&1 | tail -20

echo ""
echo "3. Testing HTTP Endpoints"
echo "-------------------------------------------"

echo "Backend (localhost:1337):"
curl -I -s --max-time 5 http://localhost:1337 2>&1 | head -5 || echo "❌ Failed to connect"

echo ""
echo "Frontend (localhost:3000):"
curl -I -s --max-time 5 http://localhost:3000 2>&1 | head -5 || echo "❌ Failed to connect"

echo ""
echo "Nginx (localhost:8080):"
curl -I -s --max-time 5 http://localhost:8080 2>&1 | head -5 || echo "❌ Failed to connect"

echo ""
echo "4. Checking Port Bindings"
echo "-------------------------------------------"
netstat -tlnp 2>/dev/null | grep -E ":(1337|3000|8080|443)" || ss -tlnp | grep -E ":(1337|3000|8080|443)"

echo ""
echo "5. Checking Docker Networks"
echo "-------------------------------------------"
docker network ls
echo ""
docker network inspect eby-gde_default 2>&1 | grep -A 10 "Containers" || echo "Network not found or no containers"

echo ""
echo "6. Latest Deployment Log"
echo "-------------------------------------------"
if [ -d "/var/log/eby-gde" ]; then
    LATEST_LOG=$(ls -t /var/log/eby-gde/deployment-*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "Log file: $LATEST_LOG"
        echo ""
        tail -50 "$LATEST_LOG"
    else
        echo "No deployment logs found"
    fi
else
    echo "Log directory /var/log/eby-gde does not exist"
fi

echo ""
echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
