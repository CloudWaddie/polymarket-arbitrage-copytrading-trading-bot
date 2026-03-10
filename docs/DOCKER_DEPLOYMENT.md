# Docker Deployment Guide

## Quick Start

### Step 1: Set Up Environment Variables
```bash
# Copy the template
cp .env.docker .env.docker.local

# Edit with your credentials
nano .env.docker.local
```

Add:
```
WINDSCRIBE_USERNAME=your_email@example.com
WINDSCRIBE_PASSWORD=your_password
PRIVATE_KEY=your_wallet_private_key
```

### Step 2: Build Docker Image
```bash
docker-compose build
```

### Step 3: Run the Bot
```bash
# Run in foreground (see logs)
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f trading-bot
```

### Step 4: Stop the Bot
```bash
docker-compose down
```

---

## Commands

### View Logs
```bash
# Real-time logs
docker-compose logs -f trading-bot

# Last 100 lines
docker-compose logs --tail=100 trading-bot

# Logs from specific time
docker-compose logs --since 10m trading-bot
```

### Check Status
```bash
# Container status
docker-compose ps

# Check if VPN is connected
docker-compose exec trading-bot windscribe status

# Check IP address
docker-compose exec trading-bot curl https://ipinfo.io
```

### View P&L
```bash
# Inside container
docker-compose exec trading-bot npm run pnl:summary

# Or access the file directly
docker-compose exec trading-bot cat src/data/pnl-tracker.json
```

### Restart Bot
```bash
docker-compose restart trading-bot
```

### Rebuild After Code Changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

---

## Environment Variables

### Required
- `WINDSCRIBE_USERNAME` — Your Windscribe email
- `WINDSCRIBE_PASSWORD` — Your Windscribe password
- `PRIVATE_KEY` — Your wallet private key

### Optional
- `COPYTRADE_MARKETS` — Markets to trade (default: btc)
- `COPYTRADE_SHARES` — Shares per trade (default: 5)
- `COPYTRADE_MAX_BUY_COUNTS_PER_SIDE` — Max trades per side (default: 5)
- `SIMULATION_MODE` — Test without real trades (default: false)

---

## Troubleshooting

### "Windscribe login failed"
```bash
# Check credentials
docker-compose logs trading-bot | grep -i windscribe

# Verify credentials are correct in .env.docker.local
cat .env.docker.local
```

### "Still getting geo-blocked"
```bash
# Check IP address
docker-compose exec trading-bot curl https://ipinfo.io

# Should show Hong Kong IP
# If not, check VPN status:
docker-compose exec trading-bot windscribe status
```

### "Container keeps restarting"
```bash
# Check logs for errors
docker-compose logs trading-bot

# Rebuild without cache
docker-compose build --no-cache
docker-compose up
```

### "Out of memory"
Edit `docker-compose.yml` and increase memory:
```yaml
deploy:
  resources:
    limits:
      memory: 1G  # Increase from 512M
```

---

## Production Deployment

### On Linux Server

```bash
# 1. Clone repo
git clone <your-repo>
cd polymarket-arbitrage-copytrading-trading-bot

# 2. Create .env.docker.local with credentials
nano .env.docker.local

# 3. Build image
docker-compose build

# 4. Run in background
docker-compose up -d

# 5. Monitor logs
docker-compose logs -f trading-bot

# 6. Check P&L periodically
docker-compose exec trading-bot npm run pnl:summary
```

### Auto-Restart on Reboot
```bash
# Enable auto-start
docker-compose up -d --restart-policy unless-stopped

# Or use systemd service
sudo nano /etc/systemd/system/trading-bot.service
```

Add:
```ini
[Unit]
Description=Polymarket Trading Bot
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/path/to/bot
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable trading-bot
sudo systemctl start trading-bot
```

---

## Monitoring

### Check Container Health
```bash
docker-compose ps
# STATUS should show "Up (healthy)"
```

### View Resource Usage
```bash
docker stats trading-bot
```

### Export Logs
```bash
# Export all logs
docker-compose logs trading-bot > bot-logs.txt

# Export P&L data
docker-compose exec trading-bot npm run pnl:export
docker cp polymarket-trading-bot:/app/pnl-export.csv ./pnl-export.csv
```

---

## Security Notes

⚠️ **Never commit .env.docker.local to git!**

```bash
# Add to .gitignore
echo ".env.docker.local" >> .gitignore
```

⚠️ **Use secrets management for production:**
```bash
# Use Docker secrets instead of environment variables
docker secret create windscribe_password -
docker secret create private_key -
```

---

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove images
docker-compose down --rmi all

# Remove volumes (WARNING: deletes data!)
docker-compose down -v
```

---

## Next Steps

1. ✅ Set up `.env.docker.local` with credentials
2. ✅ Build image: `docker-compose build`
3. ✅ Run bot: `docker-compose up`
4. ✅ Monitor logs: `docker-compose logs -f`
5. ✅ Check P&L: `docker-compose exec trading-bot npm run pnl:summary`

**The bot will:**
- Connect to Windscribe Hong Kong automatically
- Start trading with your configured settings
- Log all activity to `logs/` directory
- Track P&L in `src/data/pnl-tracker.json`
