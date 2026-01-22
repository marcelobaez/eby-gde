# Deployment Documentation - eby-gde

This document provides complete instructions for setting up and maintaining the automated deployment system for the eby-gde project.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [One-Time Setup](#one-time-setup)
- [How It Works](#how-it-works)
- [Adding New Environment Variables](#adding-new-environment-variables)
- [Monitoring Deployments](#monitoring-deployments)
- [Manual Rollback](#manual-rollback)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)
- [Branch Protection](#branch-protection)

---

## Overview

The eby-gde project uses a self-hosted GitHub Actions runner for automated deployments:

- **Trigger:** Any push to the `main` branch
- **Server:** Ubuntu server at `/home/sistemas/desarrollos/eby-gde`
- **Runner:** Self-hosted at `/opt/actions-runner`
- **Deployment:** `docker-compose up --build -d`
- **Safety:** Automatic rollback on failure
- **Notifications:** GitHub emails (success/failure)

---

## Prerequisites

Before setting up the runner, ensure your Ubuntu server has:

- ✅ Docker installed and running
- ✅ `docker-compose` binary (old version) installed
- ✅ Git installed
- ✅ curl installed
- ✅ Repository cloned to: `/home/sistemas/desarrollos/eby-gde`
- ✅ All `.env` files created and populated (root, backend, frontend)
- ✅ Sudo access for initial setup

---

## One-Time Setup

### Step 1: Generate GitHub Personal Access Token (PAT)

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a descriptive name: `eby-runner`
4. Select scopes:
   - ✅ **repo** (Full control of private repositories)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again!)

### Step 2: Clone Repository (if not already done)

```bash
cd /home/sistemas/desarrollos
git clone https://github.com/marcelobaez/eby-gde.git
cd eby-gde
```

### Step 3: Create Environment Files

Create and populate all required `.env` files:

```bash
# Root .env
cp .env.example .env
nano .env  # Fill in all values

# Backend .env
cp backend/.env.example backend/.env
nano backend/.env  # Fill in all values

# Frontend .env (or .env.production on server)
cp frontend/.env.example frontend/.env
nano frontend/.env  # Fill in all values
```

**Important:** Make sure to set the nginx server names in root `.env`:
- `BACKEND_SERVER_NAME` - Domain for backend API (e.g., `gdeapi.eby.org.ar` or `gdeapi-dev.eby.org.ar`)
- `FRONTEND_SERVER_NAME` - Domain(s) for frontend (e.g., `expedientes.eby.org.ar` or `expedientes-dev.eby.org.ar`)

These allow nginx to work in different environments without manual config changes.

### Step 4: Pull Latest Code with Scripts

```bash
cd /home/sistemas/desarrollos/eby-gde
git pull origin main
```

This will pull the new deployment scripts.

### Step 5: Run Runner Setup Script

```bash
sudo bash scripts/setup-runner.sh
```

The script will:
- Check prerequisites
- Create `actions-runner` user and add to docker group
- Download GitHub Actions runner
- Prompt for your GitHub PAT (paste the token you created)
- Prompt for runner name (press Enter for default: `eby-production-runner`)
- Configure and start the runner as a systemd service
- Create `/var/backups/eby-gde/` directory

### Step 6: Verify Runner Registration

1. Go to: https://github.com/marcelobaez/eby-gde/settings/actions/runners
2. You should see your runner listed with a **green "Idle"** status

✅ **Setup complete!** The runner is now listening for deployments.

---

## How It Works

### Deployment Flow

```
Developer pushes to main
         ↓
GitHub triggers workflow (.github/workflows/deploy.yml)
         ↓
Self-hosted runner picks up job
         ↓
[STEP 1] Validate environment variables (scripts/validate-env.sh)
         ↓
    Valid? → No → ❌ Fail & email notification
         ↓
       Yes
         ↓
[STEP 2] Create backup
         - Save current commit hash
         - Copy .env files to /var/backups/eby-gde/
         ↓
[STEP 3] Pull latest code from main
         ↓
[STEP 4] Run docker-compose up --build -d
         ↓
[STEP 5] Wait 30 seconds for containers to start
         ↓
[STEP 6] Health checks:
         - Verify 3 containers running
         - HTTP check: localhost:1337 (backend)
         - HTTP check: localhost:3000 (frontend)
         - HTTP check: localhost:8080 (nginx)
         ↓
    Healthy? → No → 🔄 Rollback & email notification
         ↓
       Yes
         ↓
✅ Deployment successful & email notification
```

### What Happens on Rollback

If **any** step fails or health checks don't pass:

1. Restore `.env` files from backup
2. Checkout previous git commit
3. Run `docker-compose down`
4. Run `docker-compose up --build -d` with old version
5. Log rollback details
6. Send failure email via GitHub

---

## Adding New Environment Variables

When you add a new feature that requires new environment variables:

### Step-by-Step Process

1. **In your code:** Add the new variable to `.env.example` (and/or `backend/.env.example`, `frontend/.env.example`)

2. **Commit and push:**
   ```bash
   git add .env.example
   git commit -m "Add new environment variable for feature X"
   git push origin main
   ```

3. **Deployment will fail** with a clear message:
   ```
   ❌ VALIDATION FAILED
   
   Missing variables in ./.env:
     - NEW_VARIABLE_NAME
   
   ACTION REQUIRED:
     1. SSH to the server
     2. Add the missing variables to the respective .env files
     3. Re-run the deployment from GitHub Actions UI
   ```

4. **SSH to the server:**
   ```bash
   ssh sistemas@your-server-ip
   cd /home/sistemas/desarrollos/eby-gde
   ```

5. **Add the new variable:**
   ```bash
   nano .env  # Add: NEW_VARIABLE_NAME=your_value
   ```

6. **Re-run the deployment:**
   - Go to: https://github.com/marcelobaez/eby-gde/actions
   - Click the failed workflow run
   - Click **"Re-run failed jobs"**

7. **Deployment succeeds** with the new variable!

---

## Monitoring Deployments

### View Deployment Status

**GitHub UI (Recommended):**
1. Go to: https://github.com/marcelobaez/eby-gde/actions
2. See all workflow runs with status (✅ success / ❌ failed)
3. Click any run to see detailed logs

**Email Notifications:**
- Configure in: https://github.com/settings/notifications
- Or repository: https://github.com/marcelobaez/eby-gde/settings
- You'll receive emails on deployment success/failure

### View Logs on Server

**Deployment logs:**
```bash
# Latest deployment
ls -lt /var/log/eby-gde/ | head -1

# View specific log
tail -f /var/log/eby-gde/deployment-20260122-143022.log

# View all logs
ls -lh /var/log/eby-gde/
```

**Runner logs:**
```bash
# Follow runner activity
sudo journalctl -u actions-runner -f

# View recent runner logs
sudo journalctl -u actions-runner -n 100

# View runner logs for specific time
sudo journalctl -u actions-runner --since "1 hour ago"
```

**Container logs:**
```bash
cd /home/sistemas/desarrollos/eby-gde

# All containers
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

---

## Manual Rollback

If you need to manually rollback to a previous version:

### Option 1: Use Backup Directory

```bash
cd /home/sistemas/desarrollos/eby-gde

# List available backups
ls -lt /var/backups/eby-gde/

# Choose a backup (e.g., backup-20260122-140000)
cd /var/backups/eby-gde/backup-20260122-140000

# View commit hash
cat commit-hash.txt

# Restore
COMMIT=$(cat commit-hash.txt)
cd /home/sistemas/desarrollos/eby-gde
git checkout $COMMIT
cp /var/backups/eby-gde/backup-20260122-140000/.env .
cp /var/backups/eby-gde/backup-20260122-140000/backend.env backend/.env
cp /var/backups/eby-gde/backup-20260122-140000/frontend.env frontend/.env
docker-compose down
docker-compose up --build -d
```

### Option 2: Rollback to Specific Commit

```bash
cd /home/sistemas/desarrollos/eby-gde

# View commit history
git log --oneline -10

# Checkout specific commit
git checkout <commit-hash>

# Rebuild
docker-compose down
docker-compose up --build -d
```

### Option 3: Return to Latest Main

```bash
cd /home/sistemas/desarrollos/eby-gde

# Return to main branch
git checkout main
git pull origin main

# Rebuild
docker-compose down
docker-compose up --build -d
```

---

## Troubleshooting

### Runner Not Picking Up Jobs

**Check runner status:**
```bash
sudo systemctl status actions-runner
```

**If stopped:**
```bash
sudo systemctl start actions-runner
sudo systemctl status actions-runner
```

**Check GitHub:**
- Go to: https://github.com/marcelobaez/eby-gde/settings/actions/runners
- Runner should show **green "Idle"** status
- If offline, restart the service:
  ```bash
  sudo systemctl restart actions-runner
  ```

### Deployment Fails During Build

**Check docker-compose logs:**
```bash
cd /home/sistemas/desarrollos/eby-gde
docker-compose logs
```

**Common issues:**
- Port conflicts: `docker ps` to see what's using ports 1337, 3000, 8080
- Disk space: `df -h` to check available space
- Docker errors: `docker system prune -a` to clean up (⚠️ careful!)

### Deployment Fails Health Checks

**Manually run health checks:**
```bash
# Check containers
docker ps

# Check HTTP endpoints
curl -I http://localhost:1337
curl -I http://localhost:3000
curl -I http://localhost:8080

# Check specific container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
```

### Environment Validation Fails

**Manually run validation:**
```bash
cd /home/sistemas/desarrollos/eby-gde
bash scripts/validate-env.sh
```

**Fix missing variables:**
```bash
nano .env  # or backend/.env or frontend/.env
```

### Rollback Failed

**Check backup directory:**
```bash
ls -la /var/backups/eby-gde/
```

**If no backups:**
- You'll need to manually identify a working commit
- Use `git log` to find recent commits
- Checkout and rebuild manually

**Check permissions:**
```bash
ls -ld /var/backups/eby-gde/
# Should be owned by actions-runner user
```

### Permission Denied Errors

**Check runner user permissions:**
```bash
# Check if actions-runner is in docker group
groups actions-runner

# If not, add:
sudo usermod -aG docker actions-runner
sudo systemctl restart actions-runner
```

**Check directory permissions:**
```bash
# Repository directory
ls -ld /home/sistemas/desarrollos/eby-gde

# Backup directory
ls -ld /var/backups/eby-gde

# Should be accessible by actions-runner user
```

---

## Maintenance

### Update Runner

When GitHub releases new runner versions:

```bash
cd /opt/actions-runner
sudo systemctl stop actions-runner

# Download new version (check GitHub for latest)
wget https://github.com/actions/runner/releases/download/v2.XXX.X/actions-runner-linux-x64-2.XXX.X.tar.gz

# Backup old version
sudo -u actions-runner mv run.sh run.sh.old

# Extract new version
sudo -u actions-runner tar xzf actions-runner-linux-x64-2.XXX.X.tar.gz

# Start runner
sudo systemctl start actions-runner
sudo systemctl status actions-runner
```

### Clean Old Backups

Backups are kept indefinitely. To clean old backups:

```bash
# List backups by size
du -sh /var/backups/eby-gde/* | sort -h

# Remove specific old backup
rm -rf /var/backups/eby-gde/backup-20250101-120000

# Keep only last 10 backups (adjust number as needed)
cd /var/backups/eby-gde
ls -t | tail -n +11 | xargs rm -rf
```

### Clean Old Logs

Logs are kept indefinitely. To clean old logs:

```bash
cd /var/log/eby-gde

# List logs by size
ls -lh

# Remove logs older than 30 days
find . -name "deployment-*.log" -mtime +30 -delete

# Keep only last 20 logs
ls -t deployment-*.log | tail -n +21 | xargs rm -f
```

### Restart Runner

```bash
sudo systemctl restart actions-runner
sudo systemctl status actions-runner
```

### View Runner Configuration

```bash
cat /opt/actions-runner/.runner
```

### Re-configure Runner

If you need to change runner settings:

```bash
cd /opt/actions-runner
sudo systemctl stop actions-runner
sudo -u actions-runner ./config.sh remove  # Removes current config
sudo -u actions-runner ./config.sh --url https://github.com/marcelobaez/eby-gde --token <NEW_TOKEN>
sudo systemctl start actions-runner
```

---

## Security Best Practices

1. **Keep `.env` files secure:**
   - Never commit to Git
   - Restrict file permissions: `chmod 600 .env`
   - Back up separately (encrypted)

2. **Rotate GitHub PAT periodically:**
   - Generate new PAT every 90 days
   - Re-configure runner with new token
   - Revoke old token

3. **Monitor runner activity:**
   - Check logs regularly: `sudo journalctl -u actions-runner`
   - Review deployment history in GitHub Actions

4. **Keep system updated:**
   - Update Ubuntu: `sudo apt update && sudo apt upgrade`
   - Update Docker: Follow Docker's upgrade guide
   - Update runner: See "Update Runner" section above

5. **Limit direct pushes to main:**
   - Use branch protection (requires PRs)
   - Require approval before merge
   - See "Branch Protection" section

---

## Branch Protection

To prevent accidental deployments and require code review:

### Setup (via GitHub UI)

1. Go to: https://github.com/marcelobaez/eby-gde/settings/branches
2. Click **"Add branch protection rule"**
3. Branch name pattern: `main`
4. Enable these settings:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: **1**
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - Select: **deploy** (the deployment workflow)
   - ⚠️ **Allow administrators to bypass** (for emergency hotfixes)
5. Click **"Create"**

### How It Works

**Before branch protection:**
```bash
git push origin main  # Direct push → Immediate deployment
```

**After branch protection:**
```bash
# Create feature branch
git checkout -b feature/new-feature
git push origin feature/new-feature

# Create PR on GitHub
# Get 1 approval
# Deployment workflow runs as status check
# Merge PR → Deployment happens
```

**Emergency hotfix (admins only):**
```bash
# You (admin) can still push directly if needed
git push origin main  # Bypasses protection
```

### Benefits

- ✅ Code review required before production
- ✅ Deployment tested BEFORE merge (via status check)
- ✅ Prevents accidental broken deployments
- ✅ Better collaboration and code quality
- ✅ Audit trail of who approved what

---

## Support

For issues or questions:

1. **Check logs:** Deployment logs, runner logs, container logs
2. **Review troubleshooting:** See Troubleshooting section above
3. **GitHub Issues:** Create issue at https://github.com/marcelobaez/eby-gde/issues
4. **GitHub Actions Documentation:** https://docs.github.com/en/actions

---

## Appendix: File Locations Reference

```
Server Paths:
├─ /opt/actions-runner/              # Runner installation
│  ├─ run.sh                          # Runner executable
│  ├─ config.sh                       # Configuration script
│  └─ .runner                         # Runner config file
│
├─ /home/sistemas/desarrollos/eby-gde/   # Repository
│  ├─ .github/workflows/deploy.yml   # Workflow definition
│  ├─ scripts/                        # Deployment scripts
│  │  ├─ deploy.sh                    # Main deployment
│  │  ├─ validate-env.sh              # Environment validation
│  │  └─ setup-runner.sh              # Setup script
│  ├─ .env                            # Environment variables
│  ├─ backend/.env                    # Backend environment
│  └─ frontend/.env                   # Frontend environment
│
├─ /var/log/eby-gde/                  # Deployment logs (outside repo)
│  └─ deployment-*.log                # Timestamped log files
│
└─ /var/backups/eby-gde/              # Backups (outside repo)
   └─ backup-YYYYMMDD-HHMMSS/         # Timestamped backups
      ├─ commit-hash.txt              # Git commit hash
      ├─ .env                         # Root env backup
      ├─ backend.env                  # Backend env backup
      └─ frontend.env                 # Frontend env backup

Systemd:
└─ /etc/systemd/system/actions-runner.service  # Service configuration
```

---

**Last updated:** 2026-01-22
