#!/bin/bash

set -e

# Must be run with sudo
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run with sudo"
   exit 1
fi

echo "=================================================="
echo "🏃 GitHub Actions Runner Setup"
echo "=================================================="
echo ""

# Configuration
RUNNER_DIR="/opt/actions-runner"
RUNNER_USER="actions-runner"
REPO_URL="https://github.com/marcelobaez/eby-gde"
RUNNER_VERSION="2.311.0"  # Update this to latest version

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "❌ curl is not installed. Please install curl first."
    exit 1
fi

echo "✅ All prerequisites met"
echo ""

# Create runner user if doesn't exist
echo "👤 Setting up runner user..."
if ! id "$RUNNER_USER" &>/dev/null; then
    # Try adduser first (Debian/Ubuntu), then useradd (RHEL/CentOS)
    # Check both in PATH and common locations
    if command -v adduser &> /dev/null || [[ -x /usr/sbin/adduser ]]; then
        if command -v adduser &> /dev/null; then
            adduser --disabled-password --gecos "" "$RUNNER_USER"
        else
            /usr/sbin/adduser --disabled-password --gecos "" "$RUNNER_USER"
        fi
        echo "   Created user: $RUNNER_USER"
    elif command -v useradd &> /dev/null || [[ -x /usr/sbin/useradd ]]; then
        if command -v useradd &> /dev/null; then
            useradd -m -s /bin/bash "$RUNNER_USER"
        else
            /usr/sbin/useradd -m -s /bin/bash "$RUNNER_USER"
        fi
        echo "   Created user: $RUNNER_USER"
    else
        echo "   ❌ ERROR: Neither adduser nor useradd found."
        echo "   Searched in PATH and /usr/sbin/"
        echo "   Please install user management tools or create user manually:"
        echo "   sudo /usr/sbin/adduser --disabled-password --gecos \"\" $RUNNER_USER"
        exit 1
    fi
else
    echo "   User already exists: $RUNNER_USER"
fi

# Add runner user to docker group
if ! groups "$RUNNER_USER" | grep -q docker; then
    # Check both in PATH and common locations
    if command -v usermod &> /dev/null || [[ -x /usr/sbin/usermod ]]; then
        if command -v usermod &> /dev/null; then
            usermod -aG docker "$RUNNER_USER"
        else
            /usr/sbin/usermod -aG docker "$RUNNER_USER"
        fi
        echo "   ✅ Added $RUNNER_USER to docker group"
    elif command -v gpasswd &> /dev/null || [[ -x /usr/bin/gpasswd ]]; then
        if command -v gpasswd &> /dev/null; then
            gpasswd -a "$RUNNER_USER" docker
        else
            /usr/bin/gpasswd -a "$RUNNER_USER" docker
        fi
        echo "   ✅ Added $RUNNER_USER to docker group"
    else
        echo "   ❌ ERROR: Neither usermod nor gpasswd found."
        echo "   Please add user to docker group manually:"
        echo "   sudo /usr/sbin/usermod -aG docker $RUNNER_USER"
        exit 1
    fi
else
    echo "   User already in docker group"
fi

echo ""

# Create runner directory
echo "📁 Setting up runner directory..."
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Download runner
echo "📥 Downloading GitHub Actions runner..."
echo "   Version: $RUNNER_VERSION"

RUNNER_ARCH="x64"
RUNNER_FILE="actions-runner-linux-${RUNNER_ARCH}-${RUNNER_VERSION}.tar.gz"
DOWNLOAD_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_FILE}"

if [[ ! -f "$RUNNER_FILE" ]]; then
    curl -o "$RUNNER_FILE" -L "$DOWNLOAD_URL"
    echo "   ✅ Downloaded runner"
else
    echo "   Runner already downloaded"
fi

# Extract runner
echo "📦 Extracting runner..."
tar xzf "$RUNNER_FILE"
echo "   ✅ Extracted"
echo ""

# Prompt for GitHub PAT
echo "=================================================="
echo "🔑 GitHub Authentication Required"
echo "=================================================="
echo ""
echo "You need a GitHub Personal Access Token (PAT) with 'repo' scope."
echo ""
echo "To create one:"
echo "  1. Go to: https://github.com/settings/tokens"
echo "  2. Click 'Generate new token' → 'Generate new token (classic)'"
echo "  3. Give it a name: 'eby-runner'"
echo "  4. Check the 'repo' scope (full control of private repositories)"
echo "  5. Click 'Generate token'"
echo "  6. Copy the token (you won't see it again!)"
echo ""
read -p "Enter your GitHub PAT: " -s GITHUB_PAT
echo ""
echo ""

if [[ -z "$GITHUB_PAT" ]]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Get runner registration token from GitHub API
echo "🔐 Getting runner registration token from GitHub..."
REG_TOKEN=$(curl -s -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_PAT" \
    "https://api.github.com/repos/marcelobaez/eby-gde/actions/runners/registration-token" | grep -o '"token": "[^"]*' | cut -d'"' -f4)

if [[ -z "$REG_TOKEN" ]]; then
    echo "❌ Failed to get registration token. Please check your PAT and repository access."
    exit 1
fi

echo "   ✅ Got registration token"
echo ""

# Prompt for runner name
echo "📝 Runner Configuration"
read -p "Enter runner name [eby-production-runner]: " RUNNER_NAME
RUNNER_NAME=${RUNNER_NAME:-eby-production-runner}

echo ""
echo "🔧 Configuring runner..."
echo "   Repository: $REPO_URL"
echo "   Runner name: $RUNNER_NAME"
echo ""

# Configure runner as runner user
sudo -u "$RUNNER_USER" ./config.sh \
    --url "$REPO_URL" \
    --token "$REG_TOKEN" \
    --name "$RUNNER_NAME" \
    --work "_work" \
    --unattended \
    --replace

echo "   ✅ Runner configured"
echo ""

# Create backup directory with proper permissions
echo "📁 Creating backup directory..."
BACKUP_DIR="/var/backups/eby-gde"
mkdir -p "$BACKUP_DIR"
chown "$RUNNER_USER:$RUNNER_USER" "$BACKUP_DIR"
chmod 755 "$BACKUP_DIR"
echo "   ✅ Created $BACKUP_DIR"
echo ""

# Create log directory with proper permissions
echo "📁 Creating log directory..."
LOG_DIR="/var/log/eby-gde"
mkdir -p "$LOG_DIR"
chown "$RUNNER_USER:$RUNNER_USER" "$LOG_DIR"
chmod 755 "$LOG_DIR"
echo "   ✅ Created $LOG_DIR"
echo ""

# Install systemd service
echo "⚙️  Installing systemd service..."

cat > /etc/systemd/system/actions-runner.service << EOF
[Unit]
Description=GitHub Actions Runner for eby-gde
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$RUNNER_USER
WorkingDirectory=$RUNNER_DIR
ExecStart=$RUNNER_DIR/run.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "   ✅ Service file created"
echo ""

# Reload systemd and start service
echo "🚀 Starting runner service..."
systemctl daemon-reload
systemctl enable actions-runner
systemctl start actions-runner

echo "   ✅ Service started and enabled"
echo ""

# Show status
echo "=================================================="
echo "📊 Runner Status"
echo "=================================================="
systemctl status actions-runner --no-pager
echo ""

echo "=================================================="
echo "✅ SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "📋 Summary:"
echo "   Runner directory: $RUNNER_DIR"
echo "   Runner user: $RUNNER_USER"
echo "   Runner name: $RUNNER_NAME"
echo "   Backup directory: $BACKUP_DIR"
echo "   Service: actions-runner.service"
echo ""
echo "📝 Next steps:"
echo "   1. Verify runner appears in GitHub:"
echo "      https://github.com/marcelobaez/eby-gde/settings/actions/runners"
echo ""
echo "   2. Test deployment by pushing to main branch"
echo ""
echo "   3. View runner logs:"
echo "      sudo journalctl -u actions-runner -f"
echo ""
echo "   4. View deployment logs:"
echo "      tail -f /var/log/eby-gde/deployment-*.log"
echo ""
echo "=================================================="
