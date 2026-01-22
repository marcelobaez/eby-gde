#!/bin/bash

set -e  # Exit on any error (will trigger rollback)

# Configuration
REPO_ROOT="/home/sistemas/desarrollos/eby-gde"
BACKUP_ROOT="/var/backups/eby-gde"
LOG_DIR="$REPO_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/backup-$TIMESTAMP"
LOG_FILE="$LOG_DIR/deployment-$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Function to run health checks
health_check() {
    log "🏥 Running health checks..."
    
    local checks_passed=0
    local checks_failed=0
    
    # Wait for containers to initialize
    log "   Waiting 30 seconds for containers to start..."
    sleep 30
    
    # Check if containers are running
    log "   Checking container status..."
    
    if docker ps --filter "name=eby-exp-backend" --filter "status=running" --format "{{.Names}}" | grep -q "eby-exp-backend"; then
        log "   ✅ Backend container is running"
        ((checks_passed++))
    else
        log "   ❌ Backend container is NOT running"
        ((checks_failed++))
    fi
    
    if docker ps --filter "name=eby-exp-frontend" --filter "status=running" --format "{{.Names}}" | grep -q "eby-exp-frontend"; then
        log "   ✅ Frontend container is running"
        ((checks_passed++))
    else
        log "   ❌ Frontend container is NOT running"
        ((checks_failed++))
    fi
    
    if docker ps --filter "name=nginx" --filter "status=running" --format "{{.Names}}" | grep -q "nginx"; then
        log "   ✅ Nginx container is running"
        ((checks_passed++))
    else
        log "   ❌ Nginx container is NOT running"
        ((checks_failed++))
    fi
    
    # HTTP health checks
    log "   Checking HTTP endpoints..."
    
    # Backend health check
    if curl -f -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:1337 | grep -q "200\|404"; then
        log "   ✅ Backend HTTP responding"
        ((checks_passed++))
    else
        log "   ❌ Backend HTTP not responding"
        ((checks_failed++))
    fi
    
    # Frontend health check
    if curl -f -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000 | grep -q "200"; then
        log "   ✅ Frontend HTTP responding"
        ((checks_passed++))
    else
        log "   ❌ Frontend HTTP not responding"
        ((checks_failed++))
    fi
    
    # Nginx health check
    if curl -f -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:8080 | grep -q "200\|30[0-9]"; then
        log "   ✅ Nginx HTTP responding"
        ((checks_passed++))
    else
        log "   ❌ Nginx HTTP not responding"
        ((checks_failed++))
    fi
    
    log "   Health check results: $checks_passed passed, $checks_failed failed"
    
    if [[ $checks_failed -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

# Function to create backup
create_backup() {
    log "💾 Creating backup at $BACKUP_DIR"
    
    mkdir -p "$BACKUP_DIR"
    
    # Save current commit hash
    git rev-parse HEAD > "$BACKUP_DIR/commit-hash.txt"
    log "   Saved commit hash: $(cat $BACKUP_DIR/commit-hash.txt)"
    
    # Backup .env files
    if [[ -f "$REPO_ROOT/.env" ]]; then
        cp "$REPO_ROOT/.env" "$BACKUP_DIR/.env"
        log "   Backed up root .env"
    fi
    
    if [[ -f "$REPO_ROOT/backend/.env" ]]; then
        cp "$REPO_ROOT/backend/.env" "$BACKUP_DIR/backend.env"
        log "   Backed up backend .env"
    fi
    
    # Frontend: check for .env or .env.production
    if [[ -f "$REPO_ROOT/frontend/.env" ]]; then
        cp "$REPO_ROOT/frontend/.env" "$BACKUP_DIR/frontend.env"
        log "   Backed up frontend .env"
    elif [[ -f "$REPO_ROOT/frontend/.env.production" ]]; then
        cp "$REPO_ROOT/frontend/.env.production" "$BACKUP_DIR/frontend.env.production"
        log "   Backed up frontend .env.production"
    fi
    
    log "   ✅ Backup completed"
}

# Function to rollback deployment
rollback() {
    log "🔄 DEPLOYMENT FAILED - Initiating rollback..."
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "   ❌ ERROR: Backup directory not found! Cannot rollback."
        log "   Manual intervention required."
        exit 1
    fi
    
    # Restore .env files
    log "   Restoring .env files..."
    if [[ -f "$BACKUP_DIR/.env" ]]; then
        cp "$BACKUP_DIR/.env" "$REPO_ROOT/.env"
        log "   Restored root .env"
    fi
    
    if [[ -f "$BACKUP_DIR/backend.env" ]]; then
        cp "$BACKUP_DIR/backend.env" "$REPO_ROOT/backend/.env"
        log "   Restored backend .env"
    fi
    
    # Frontend: restore .env or .env.production based on what was backed up
    if [[ -f "$BACKUP_DIR/frontend.env" ]]; then
        cp "$BACKUP_DIR/frontend.env" "$REPO_ROOT/frontend/.env"
        log "   Restored frontend .env"
    elif [[ -f "$BACKUP_DIR/frontend.env.production" ]]; then
        cp "$BACKUP_DIR/frontend.env.production" "$REPO_ROOT/frontend/.env.production"
        log "   Restored frontend .env.production"
    fi
    
    # Checkout previous commit
    local previous_commit=$(cat "$BACKUP_DIR/commit-hash.txt")
    log "   Checking out previous commit: $previous_commit"
    git checkout "$previous_commit"
    
    # Rebuild with previous version
    log "   Rebuilding with previous version..."
    cd "$REPO_ROOT"
    docker-compose down
    docker-compose up --build -d
    
    log "   ✅ Rollback completed - reverted to commit $previous_commit"
    log "   ⚠️  Please check the logs and fix the issue before deploying again"
    
    exit 1
}

# Trap errors and rollback
trap 'rollback' ERR

# Main deployment process
log "=================================================="
log "🚀 Starting Deployment"
log "=================================================="
log "Repository: $REPO_ROOT"
log "Timestamp: $TIMESTAMP"
log "Log file: $LOG_FILE"
log ""

# Step 1: Create backup
create_backup

# Step 2: Pull latest code
log "📥 Pulling latest code from main branch..."
cd "$REPO_ROOT"
git pull origin main
log "   Current commit: $(git rev-parse HEAD)"
log "   ✅ Code updated"
log ""

# Step 3: Build and deploy
log "🔨 Building and starting containers..."
docker-compose up --build -d 2>&1 | tee -a "$LOG_FILE"
log "   ✅ Containers started"
log ""

# Step 4: Health checks
if ! health_check; then
    log "❌ Health checks failed!"
    rollback
fi

log ""
log "=================================================="
log "✅ DEPLOYMENT SUCCESSFUL"
log "=================================================="
log "Deployed commit: $(git rev-parse HEAD)"
log "Backup location: $BACKUP_DIR"
log "Log file: $LOG_FILE"
log ""

# Note: We keep all backups (no cleanup) per user preference
log "All deployment backups are retained in $BACKUP_ROOT"

exit 0
