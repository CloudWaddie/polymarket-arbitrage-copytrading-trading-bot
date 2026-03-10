# Docker + Windscribe: How It Works

## Overview

The Docker setup connects to Windscribe VPN **before** starting the trading bot, ensuring all traffic routes through Hong Kong.

---

## Two Approaches

### Approach 1: Windscribe CLI (Dockerfile)
**Pros:** Simple, automatic login
**Cons:** Requires Debian-based image (larger), CLI can be flaky

### Approach 2: OpenVPN (Dockerfile.openvpn)
**Pros:** More reliable, works with free accounts
**Cons:** Requires manual config file download

---

## How Approach 1 Works (Windscribe CLI)

### Dockerfile Breakdown

```dockerfile
FROM node:18-slim
# Uses Debian-based Node.js (not Alpine)
# Alpine doesn't have Windscribe CLI in repos

# Install Windscribe CLI
RUN echo "deb https://repo.windscribe.com/ubuntu focal main" | tee /etc/apt/sources.list.d/windscribe-repo.list
# Adds Windscribe repository

RUN apt-get install -y windscribe-cli
# Installs Windscribe CLI from official repo
```

### Start Script (start.sh)

```bash
# 1. Login to Windscribe
windscribe login << EOF
$WINDSCRIBE_USERNAME
$WINDSCRIBE_PASSWORD
EOF

# 2. Connect to Hong Kong
windscribe connect HK

# 3. Verify connection
windscribe status
curl https://ipinfo.io  # Should show Hong Kong IP

# 4. Start trading bot
npm start
```

### Environment Variables (docker-compose.yml)

```yaml
environment:
  WINDSCRIBE_USERNAME: ${WINDSCRIBE_USERNAME}
  WINDSCRIBE_PASSWORD: ${WINDSCRIBE_PASSWORD}
```

These are passed from `.env.docker.local` to the container.

---

## How Approach 2 Works (OpenVPN)

### Why OpenVPN?

- More reliable than Windscribe CLI
- Works with free Windscribe accounts
- Standard VPN protocol
- Better for production

### Setup Steps

**1. Get Windscribe OpenVPN Config**

Since free accounts can't use the web config generator, you need to:

**Option A: Use Windscribe Desktop App**
```bash
# On your local machine (not Docker):
# 1. Install Windscribe desktop app
# 2. Connect to Hong Kong
# 3. Export config from app settings
# 4. Copy HongKong.ovpn to your project
```

**Option B: Use Windscribe Pro (if you upgrade)**
```bash
# Go to: https://windscribe.com/getconfig
# Login, select Hong Kong, download HongKong.ovpn
```

**Option C: Use Alternative VPN**
```bash
# ProtonVPN, Mullvad, or NordVPN
# All provide OpenVPN configs for free/paid tiers
```

**2. Place Config File**

```bash
# Copy to project root
cp ~/Downloads/HongKong.ovpn ./vpn-config/HongKong.ovpn
```

**3. Update docker-compose.yml**

```yaml
services:
  trading-bot:
    build:
      context: .
      dockerfile: Dockerfile.openvpn  # Use OpenVPN version
    volumes:
      - ./vpn-config/HongKong.ovpn:/etc/openvpn/HongKong.ovpn:ro
```

**4. Start Container**

```bash
docker-compose build
docker-compose up -d
```

### Start Script (OpenVPN version)

```bash
# 1. Check config exists
if [ ! -f /etc/openvpn/HongKong.ovpn ]; then
    echo "ERROR: VPN config not found"
    exit 1
fi

# 2. Start OpenVPN in background
openvpn --config /etc/openvpn/HongKong.ovpn --daemon

# 3. Wait for connection
sleep 10

# 4. Verify IP
curl https://ipinfo.io  # Should show Hong Kong

# 5. Start bot
npm start
```

---

## Comparison

| Feature | Windscribe CLI | OpenVPN |
|---------|---------------|---------|
| Setup Complexity | Easy | Medium |
| Reliability | Medium | High |
| Free Account | ✅ Yes | ✅ Yes (with manual config) |
| Image Size | 400MB | 300MB |
| Auto-reconnect | ✅ Yes | ⚠️ Manual |
| Production Ready | ⚠️ Maybe | ✅ Yes |

---

## Recommended: Use OpenVPN

For production, use **Dockerfile.openvpn** because:
- ✅ More reliable
- ✅ Standard protocol
- ✅ Better logging
- ✅ Works with any VPN provider

---

## Troubleshooting

### "Windscribe login failed"

**Windscribe CLI version:**
```bash
# Check logs
docker-compose logs trading-bot | grep -i windscribe

# Try manual login
docker-compose exec trading-bot windscribe login
```

**OpenVPN version:**
```bash
# Check if config is mounted
docker-compose exec trading-bot ls -la /etc/openvpn/

# Check OpenVPN logs
docker-compose exec trading-bot cat /var/log/openvpn.log
```

### "VPN connected but still geo-blocked"

```bash
# Check IP address
docker-compose exec trading-bot curl https://ipinfo.io

# Should show:
# "country": "HK"

# If not, VPN isn't working
# Check VPN status:
docker-compose exec trading-bot windscribe status  # CLI version
docker-compose exec trading-bot ps aux | grep openvpn  # OpenVPN version
```

### "Container keeps restarting"

```bash
# Check full logs
docker-compose logs trading-bot

# Common issues:
# 1. Missing VPN config
# 2. Wrong credentials
# 3. VPN connection timeout
```

---

## Which Dockerfile to Use?

### Use `Dockerfile` (Windscribe CLI) if:
- ✅ You want simple setup
- ✅ You're okay with Debian-based image
- ✅ You have Windscribe credentials

### Use `Dockerfile.openvpn` (OpenVPN) if:
- ✅ You want production reliability
- ✅ You can get OpenVPN config file
- ✅ You might switch VPN providers later

---

## Quick Start

### Windscribe CLI Version

```bash
# 1. Set up credentials
cp .env.docker .env.docker.local
nano .env.docker.local  # Add WINDSCRIBE_USERNAME and WINDSCRIBE_PASSWORD

# 2. Build and run
docker-compose build
docker-compose up -d

# 3. Check logs
docker-compose logs -f trading-bot
```

### OpenVPN Version

```bash
# 1. Get OpenVPN config
# Download HongKong.ovpn from Windscribe or other VPN

# 2. Place config
mkdir vpn-config
cp ~/Downloads/HongKong.ovpn vpn-config/

# 3. Update docker-compose.yml
# Change: dockerfile: Dockerfile.openvpn
# Add volume: - ./vpn-config/HongKong.ovpn:/etc/openvpn/HongKong.ovpn:ro

# 4. Build and run
docker-compose build
docker-compose up -d

# 5. Check logs
docker-compose logs -f trading-bot
```

---

## Security Notes

⚠️ **Never commit VPN credentials or configs to git!**

```bash
# Add to .gitignore
echo ".env.docker.local" >> .gitignore
echo "vpn-config/" >> .gitignore
```

---

## Next Steps

1. Choose your approach (CLI or OpenVPN)
2. Follow the Quick Start above
3. Verify VPN connection: `docker-compose exec trading-bot curl https://ipinfo.io`
4. Monitor bot: `docker-compose logs -f trading-bot`
5. Check P&L: `docker-compose exec trading-bot npm run pnl:summary`

---

**Recommended:** Start with Windscribe CLI (simpler), switch to OpenVPN if you have issues.
