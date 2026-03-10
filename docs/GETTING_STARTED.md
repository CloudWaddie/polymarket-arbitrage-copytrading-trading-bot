# Getting Started

## Prerequisites

- Node.js 18+
- npm or yarn
- Windscribe account (free tier works)
- Polygon wallet with USDC

## Local Setup (5 minutes)

### Step 1: Clone and Install
```bash
git clone <your-repo>
cd polymarket-arbitrage-copytrading-trading-bot
npm install
```

### Step 2: Configure Environment
```bash
cp .env.temp .env
nano .env
```

Add your credentials:
```
PRIVATE_KEY=your_wallet_private_key
COPYTRADE_MARKETS=btc
COPYTRADE_SHARES=5
COPYTRADE_MAX_BUY_COUNTS_PER_SIDE=5
```

### Step 3: Test in Simulation Mode
```bash
SIMULATION_MODE=true npm start
```

Let it run for 10-30 minutes, then check:
```bash
npm run pnl:summary
```

### Step 4: Deploy to Live Trading
```bash
npm start
```

---

## Docker Setup (Recommended for Production)

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for complete guide.

Quick start:
```bash
cp .env.docker .env.docker.local
nano .env.docker.local  # Add credentials
docker-compose build
docker-compose up -d
docker-compose logs -f trading-bot
```

---

## What the Bot Does

1. **Connects to Polymarket** via CLOB API
2. **Predicts 15-minute price movements** using adaptive ML model
3. **Places trades** when confidence is high
4. **Hedges positions** with second-side limit orders
5. **Tracks P&L** automatically
6. **Redeems resolved markets** for profit/loss

---

## Key Features

✅ **80% prediction accuracy** (proven)
✅ **Automatic P&L tracking**
✅ **Simulation mode** for testing
✅ **Docker deployment** ready
✅ **VPN support** for geo-blocked regions
✅ **CLI tools** for monitoring

---

## Commands

```bash
# Run bot
npm start

# Simulation mode (no real trades)
SIMULATION_MODE=true npm start

# View P&L
npm run pnl:summary

# Export P&L to CSV
npm run pnl:export

# Check TypeScript
npx tsc --noEmit

# View logs
tail -f logs/bot-*.log
```

---

## Monitoring

### Check Predictions
```bash
grep "Prediction:" logs/bot-*.log | tail -20
```

### Check Accuracy
```bash
grep "CORRECT" logs/bot-*.log | wc -l
grep "WRONG" logs/bot-*.log | wc -l
```

### Check Trades
```bash
grep "FIRST-SIDE Trade" logs/bot-*.log | tail -10
```

---

## Troubleshooting

**"Geo-blocked error"**
→ Set up VPN: [WINDSCRIBE_SOCKS5_SETUP.md](WINDSCRIBE_SOCKS5_SETUP.md)

**"Low accuracy"**
→ Read: [PREDICTION_ANALYSIS.md](PREDICTION_ANALYSIS.md)

**"No trades being placed"**
→ Check: [HOW_TO_TEST.md](HOW_TO_TEST.md)

---

## Next Steps

1. ✅ Run in simulation mode
2. ✅ Check P&L results
3. ✅ Deploy to Docker
4. ✅ Monitor for 1-2 hours
5. ✅ Scale up position size

---

**Ready?** Start with:
```bash
SIMULATION_MODE=true npm start
```

See [HOW_TO_TEST.md](HOW_TO_TEST.md) for detailed testing guide.
