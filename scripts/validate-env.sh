#!/bin/bash

set -e

REPO_ROOT="/home/sistemas/desarrollos/eby-gde"
MISSING_VARS=0

echo "=================================================="
echo "🔍 Validating Environment Variables"
echo "=================================================="

# Function to check env file against example
check_env_file() {
    local env_example="$1"
    local env_file="$2"
    local location="$3"
    
    if [[ ! -f "$env_example" ]]; then
        echo "⚠️  Warning: $env_example not found, skipping..."
        return 0
    fi
    
    if [[ ! -f "$env_file" ]]; then
        echo "❌ ERROR: $env_file does not exist!"
        echo "   Create it based on $env_example"
        return 1
    fi
    
    echo ""
    echo "Checking: $location"
    echo "  Example: $env_example"
    echo "  Actual:  $env_file"
    
    local missing=()
    
    # Read variable names from .env.example (left side of =)
    while IFS='=' read -r var_name _; do
        # Skip empty lines and comments
        [[ -z "$var_name" || "$var_name" =~ ^[[:space:]]*# ]] && continue
        
        # Trim whitespace
        var_name=$(echo "$var_name" | xargs)
        
        # Check if variable exists in actual .env
        if ! grep -q "^${var_name}=" "$env_file"; then
            missing+=("$var_name")
        fi
    done < "$env_example"
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "  ❌ Missing variables:"
        for var in "${missing[@]}"; do
            echo "     - $var"
        done
        return 1
    else
        echo "  ✅ All variables present"
        return 0
    fi
}

# Check root .env
if ! check_env_file \
    "$REPO_ROOT/.env.example" \
    "$REPO_ROOT/.env" \
    "Root .env"; then
    MISSING_VARS=1
fi

# Check backend .env
if ! check_env_file \
    "$REPO_ROOT/backend/.env.example" \
    "$REPO_ROOT/backend/.env" \
    "Backend .env"; then
    MISSING_VARS=1
fi

# Check frontend .env (or .env.production as fallback)
FRONTEND_ENV="$REPO_ROOT/frontend/.env"
if [[ ! -f "$FRONTEND_ENV" ]] && [[ -f "$REPO_ROOT/frontend/.env.production" ]]; then
    FRONTEND_ENV="$REPO_ROOT/frontend/.env.production"
    echo ""
    echo "ℹ️  Using .env.production for frontend (instead of .env)"
fi

if ! check_env_file \
    "$REPO_ROOT/frontend/.env.example" \
    "$FRONTEND_ENV" \
    "Frontend .env"; then
    MISSING_VARS=1
fi

echo ""
echo "=================================================="

if [[ $MISSING_VARS -eq 1 ]]; then
    echo "❌ VALIDATION FAILED"
    echo ""
    echo "📝 ACTION REQUIRED:"
    echo "   1. SSH to the server"
    echo "   2. Add the missing variables to the respective .env files"
    echo "   3. Re-run the deployment from GitHub Actions UI"
    echo ""
    echo "=================================================="
    exit 1
else
    echo "✅ VALIDATION PASSED - All environment variables present"
    echo "=================================================="
    exit 0
fi
