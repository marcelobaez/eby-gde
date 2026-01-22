#!/bin/bash

echo "=========================================="
echo "Deployment Diagnostics"
echo "=========================================="
echo ""

echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo "Home directory: $HOME"
echo ""

echo "=========================================="
echo "Repository Location"
echo "=========================================="
REPO_ROOT="/home/sistemas/desarrollos/eby-gde"
if [[ -d "$REPO_ROOT" ]]; then
    echo "✅ Repository exists at: $REPO_ROOT"
    ls -la "$REPO_ROOT" | head -20
else
    echo "❌ Repository NOT found at: $REPO_ROOT"
fi
echo ""

echo "=========================================="
echo "Environment Files Check"
echo "=========================================="

check_env() {
    local file=$1
    if [[ -f "$file" ]]; then
        echo "✅ $file exists"
        echo "   Size: $(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null) bytes"
        echo "   Permissions: $(ls -l "$file" | awk '{print $1}')"
    else
        echo "❌ $file NOT found"
    fi
}

check_env "$REPO_ROOT/.env"
check_env "$REPO_ROOT/backend/.env"
check_env "$REPO_ROOT/frontend/.env"
echo ""

echo "=========================================="
echo "Example Files Check"
echo "=========================================="
check_env "$REPO_ROOT/.env.example"
check_env "$REPO_ROOT/backend/.env.example"
check_env "$REPO_ROOT/frontend/.env.example"
echo ""

echo "=========================================="
echo "Deployment Scripts Check"
echo "=========================================="
check_script() {
    local file=$1
    if [[ -f "$file" ]]; then
        echo "✅ $file exists"
        if [[ -x "$file" ]]; then
            echo "   ✅ Executable"
        else
            echo "   ❌ NOT executable"
        fi
    else
        echo "❌ $file NOT found"
    fi
}

check_script "$REPO_ROOT/scripts/validate-env.sh"
check_script "$REPO_ROOT/scripts/deploy.sh"
echo ""

echo "=========================================="
echo "Docker Check"
echo "=========================================="
if command -v docker &> /dev/null; then
    echo "✅ Docker found: $(docker --version)"
    if docker ps &> /dev/null; then
        echo "✅ Can run docker commands"
        echo "Running containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "❌ Cannot run docker commands (permission issue?)"
    fi
else
    echo "❌ Docker NOT found"
fi
echo ""

if command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose found: $(docker-compose --version)"
else
    echo "❌ docker-compose NOT found"
fi
echo ""

echo "=========================================="
echo "Backup Directory Check"
echo "=========================================="
BACKUP_DIR="/var/backups/eby-gde"
if [[ -d "$BACKUP_DIR" ]]; then
    echo "✅ Backup directory exists: $BACKUP_DIR"
    echo "   Permissions: $(ls -ld "$BACKUP_DIR" | awk '{print $1, $3, $4}')"
    echo "   Backups:"
    ls -lth "$BACKUP_DIR" | head -5
else
    echo "❌ Backup directory NOT found: $BACKUP_DIR"
fi
echo ""

echo "=========================================="
echo "Logs Directory Check"
echo "=========================================="
LOG_DIR="$REPO_ROOT/logs"
if [[ -d "$LOG_DIR" ]]; then
    echo "✅ Logs directory exists: $LOG_DIR"
    echo "   Recent logs:"
    ls -lth "$LOG_DIR" | head -5
else
    echo "❌ Logs directory NOT found: $LOG_DIR"
    echo "   Will be created automatically on first deployment"
fi
echo ""

echo "=========================================="
echo "Git Status"
echo "=========================================="
if [[ -d "$REPO_ROOT/.git" ]]; then
    cd "$REPO_ROOT"
    echo "Current branch: $(git branch --show-current)"
    echo "Latest commit: $(git log -1 --oneline)"
    echo ""
    echo "Git status:"
    git status --short
else
    echo "❌ Not a git repository"
fi
echo ""

echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
