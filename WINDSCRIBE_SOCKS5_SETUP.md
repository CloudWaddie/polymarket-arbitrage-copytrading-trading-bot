# Setting Up Windscribe Hong Kong VPN with SOCKS5 Proxy

## Option 1: Windscribe Desktop App (Easiest)

### Step 1: Install Windscribe
```bash
# Download from: https://windscribe.com/download
# Install the desktop app
```

### Step 2: Connect to Hong Kong
1. Open Windscribe app
2. Select **Hong Kong** from server list
3. Click **Connect**

### Step 3: Enable SOCKS5 Proxy
Windscribe desktop app doesn't expose SOCKS5 directly. You need to use **Option 2** below.

---

## Option 2: Windscribe CLI + SSH Tunnel (Recommended)

### Step 1: Install Windscribe CLI
```bash
# Windows (PowerShell as Admin)
# Download from: https://windscribe.com/download
# Or use Chocolatey:
choco install windscribe

# Linux
sudo apt-add-repository ppa:windscribe/windscribe-repo
sudo apt-get update
sudo apt-get install windscribe-cli

# macOS
brew install windscribe
```

### Step 2: Login and Connect
```bash
# Login
windscribe login

# List available locations
windscribe locations

# Connect to Hong Kong
windscribe connect HK

# Verify connection
windscribe status
```

### Step 3: Create SOCKS5 Proxy with SSH
```bash
# Install SSH server (if not already installed)
# Windows: Install OpenSSH Server via Settings > Apps > Optional Features
# Linux: sudo apt-get install openssh-server

# Start SSH tunnel (creates SOCKS5 proxy on port 1080)
ssh -D 1080 -C -N localhost
```

This creates a SOCKS5 proxy at `localhost:1080` that routes through Windscribe.

---

## Option 3: Use Windscribe Browser Extension + Proxy Tool (Quick)

### Step 1: Install Windscribe Browser Extension
1. Install from Chrome/Firefox store
2. Login and connect to Hong Kong

### Step 2: Use a Proxy Tool
```bash
# Install proxy tool
npm install -g local-ssl-proxy

# Create SOCKS5 proxy from browser extension
# This won't work directly - browser extensions don't expose SOCKS5
```

**This option doesn't work well. Use Option 4 instead.**

---

## Option 4: Windscribe Config + OpenVPN + SOCKS5 (Best for Free Account)

### Step 1: Get Windscribe OpenVPN Config
1. Go to: https://windscribe.com/getconfig
2. Login with your account
3. Select **Hong Kong** server
4. Download `.ovpn` config file

### Step 2: Install OpenVPN
```bash
# Windows
choco install openvpn

# Linux
sudo apt-get install openvpn

# macOS
brew install openvpn
```

### Step 3: Connect with OpenVPN
```bash
# Windows (PowerShell as Admin)
cd "C:\Program Files\OpenVPN\bin"
.\openvpn.exe --config "C:\path\to\HongKong.ovpn"

# Linux/macOS
sudo openvpn --config ~/Downloads/HongKong.ovpn
```

### Step 4: Create SOCKS5 Proxy
Once connected, install a SOCKS5 proxy server:

```bash
# Install dante-server (SOCKS5 server)
# Windows: Use WSL or download from https://www.inet.no/dante/
# Linux:
sudo apt-get install dante-server

# Or use a simpler tool: microsocks
git clone https://github.com/rofl0r/microsocks
cd microsocks
make
./microsocks -i 127.0.0.1 -p 1080
```

Now you have SOCKS5 proxy at `localhost:1080`.

---

## Option 5: Use Windscribe's Built-in SOCKS5 (Pro Only)

Windscribe Pro accounts get direct SOCKS5 access:
- Server: `proxy-hk.windscribe.com`
- Port: `1080`
- Username: Your Windscribe username
- Password: Your Windscribe password

**This requires a paid account.**

---

## Recommended Solution for Free Account

### Use Windscribe CLI + microsocks

```bash
# Step 1: Install Windscribe CLI
# Download from: https://windscribe.com/download

# Step 2: Connect to Hong Kong
windscribe login
windscribe connect HK

# Step 3: Install microsocks (lightweight SOCKS5 server)
# Windows (WSL):
git clone https://github.com/rofl0r/microsocks
cd microsocks
make
./microsocks -i 127.0.0.1 -p 1080

# Linux:
sudo apt-get install microsocks
microsocks -i 127.0.0.1 -p 1080

# macOS:
brew install microsocks
microsocks -i 127.0.0.1 -p 1080
```

Now you have:
- ✅ Windscribe connected to Hong Kong
- ✅ SOCKS5 proxy at `localhost:1080`

---

## Configure Your Trading Bot to Use SOCKS5

### Option A: Use Environment Variables
```bash
# Add to .env
HTTP_PROXY=socks5://localhost:1080
HTTPS_PROXY=socks5://localhost:1080
```

### Option B: Use Node.js SOCKS Proxy
```bash
npm install socks-proxy-agent
```

Then in your code:
```typescript
import { SocksProxyAgent } from 'socks-proxy-agent';

const agent = new SocksProxyAgent('socks5://localhost:1080');

// Use with fetch
fetch('https://clob.polymarket.com/...', { agent });

// Use with axios
axios.get('https://clob.polymarket.com/...', {
  httpsAgent: agent
});
```

### Option C: Configure at System Level (Windows)
```bash
# PowerShell (as Admin)
netsh winhttp set proxy proxy-server="socks=localhost:1080" bypass-list="localhost"

# To remove:
netsh winhttp reset proxy
```

---

## Quick Start (Recommended)

```bash
# 1. Install Windscribe CLI
# Download from: https://windscribe.com/download

# 2. Connect to Hong Kong
windscribe login
windscribe connect HK

# 3. Install microsocks (SOCKS5 server)
# Windows: Use WSL or download binary
# Linux: sudo apt-get install microsocks
# macOS: brew install microsocks

# 4. Start SOCKS5 proxy
microsocks -i 127.0.0.1 -p 1080

# 5. Configure your bot
# Add to .env:
HTTP_PROXY=socks5://localhost:1080
HTTPS_PROXY=socks5://localhost:1080

# 6. Run your bot
npm start
```

---

## Verify It's Working

```bash
# Test SOCKS5 proxy
curl --socks5 localhost:1080 https://ipinfo.io

# Should show Hong Kong IP
```

---

## Troubleshooting

### "Connection refused" on port 1080
- Make sure microsocks is running
- Check firewall settings

### "Windscribe not connected"
```bash
windscribe status
windscribe connect HK
```

### "Still getting geo-blocked"
- Verify IP is from Hong Kong: `curl --socks5 localhost:1080 https://ipinfo.io`
- Try different Hong Kong server: `windscribe connect HK-2`

---

## Alternative: Use a Different VPN with Built-in SOCKS5

If Windscribe free doesn't work well, consider:
- **ProtonVPN** (free, has Hong Kong servers)
- **Mullvad** (paid, has SOCKS5 built-in)
- **NordVPN** (paid, has SOCKS5 built-in)

---

Let me know which option you want to try and I can help you set it up!
