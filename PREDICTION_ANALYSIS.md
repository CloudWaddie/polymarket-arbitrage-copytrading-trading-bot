# Prediction Analysis & P&L Tracking Guide

## 1. Understanding Your Prediction Logs

### Log Entry Breakdown

```
2026-03-10T09:01:07.790Z  INFO  🔮 Prediction: UP (conf: 0.66) | Actual: DOWN | ❌ WRONG | Time: 6259ms
2026-03-10T09:01:07.791Z  INFO  🔮 PREDICT [POLE]: 0.5238 (current: 0.5300) | Direction: DOWN | Confidence: 40.0% | Signal: HOLD | Momentum: -0.031 | Vol: 0.045 | Trend: -0.028
```

**Line 1 - Prediction Result:**
- `Prediction: UP` — Model predicted price would go UP
- `conf: 0.66` — 66% confidence in this prediction
- `Actual: DOWN` — Price actually went DOWN
- `❌ WRONG` — Prediction was incorrect
- `Time: 6259ms` — Took 6.2 seconds to compute

**Line 2 - Pole Detection Details:**
- `PREDICT [POLE]` — Prediction made at a "pole" (local peak/trough)
- `0.5238 (current: 0.5300)` — Predicted next price 0.5238 vs current 0.5300
- `Direction: DOWN` — Predicted direction is DOWN (contradicts line 1!)
- `Confidence: 40.0%` — Actual confidence is 40%, not 66%
- `Signal: HOLD` — Trading signal is HOLD (don't trade)
- `Momentum: -0.031` — Negative momentum (downward pressure)
- `Vol: 0.045` — Volatility at 4.5% (low)
- `Trend: -0.028` — Negative trend (downward)

### Why the Model is Struggling (32% Accuracy)

**Current accuracy: 8/25 = 32%** (worse than coin flip at 50%)

**Root causes:**

1. **Pole detection too aggressive**
   - Detecting poles on every small price swing
   - Should require 5+ consecutive points confirming trend, not 3
   - Should skip first 2 minutes of each 15m cycle (too noisy)

2. **Confidence calibration broken**
   - High confidence (0.66) on weak signals that fail
   - Model is overconfident in its predictions
   - Recent accuracy is 32%, but confidence caps at 92%

3. **Momentum/trend misalignment**
   - Momentum -0.031 contradicts UP prediction
   - When signals don't align, prediction is unreliable
   - Model should require BOTH momentum AND trend to agree

4. **Inherent noise in 15m markets**
   - 15-minute price movements are highly random
   - Thin order books = high slippage
   - No real edge without order book imbalance data

---

## 2. How to Improve Predictions

### Quick Wins (Easy to implement)

**A. Stricter Pole Detection**
```typescript
// Current: Detects poles too frequently
// Fix: Require larger swings and more confirmation

// In pricePredictor.ts, line 290:
// Change from: changeFromLastPole >= this.noiseThreshold (0.02)
// To: changeFromLastPole >= 0.05 (require 5 cent swings)

// Also require 5+ points confirming trend, not 3
const lookback = Math.min(5, centerIdx); // was 3
```

**B. Skip Early Predictions**
```typescript
// Skip predictions in first 2 minutes of each 15m cycle
const now = new Date();
const minuteInCycle = now.getMinutes() % 15;
if (minuteInCycle < 2) {
    return null; // Too noisy, skip
}
```

**C. Require Signal Alignment**
```typescript
// Only trade when momentum AND trend agree
const momentumAligned = (direction === "up" && features.momentum > 0.005) ||
                        (direction === "down" && features.momentum < -0.005);
const trendAligned = (direction === "up" && features.trend > 0.015) ||
                     (direction === "down" && features.trend < -0.015);

// Only generate BUY signal if BOTH align
if (!momentumAligned || !trendAligned) {
    return "HOLD";
}
```

### Medium Effort (Better accuracy)

**D. Add Order Book Imbalance**
```typescript
// Track bid/ask volume ratio
// High imbalance = strong directional signal
// Example: if UP bid volume >> UP ask volume, price likely to go UP

private calculateOrderBookImbalance(upBidVol: number, upAskVol: number, downBidVol: number, downAskVol: number): number {
    const upImbalance = (upBidVol - upAskVol) / (upBidVol + upAskVol + 0.0001);
    const downImbalance = (downBidVol - downAskVol) / (downBidVol + downAskVol + 0.0001);
    return upImbalance - downImbalance; // Positive = UP pressure
}
```

**E. Time-to-Expiry Boost**
```typescript
// Predictions are more reliable in last 2 minutes
const minuteInCycle = now.getMinutes() % 15;
const timeToExpiry = (15 - minuteInCycle) * 60; // seconds

if (timeToExpiry < 120) { // Last 2 minutes
    confidence *= 1.2; // 20% boost
}
```

**F. Per-Market Accuracy Tracking**
```typescript
// Track accuracy separately for BTC, ETH, SOL, etc.
// Some markets are more predictable than others

private marketAccuracy: Map<string, { correct: number; total: number }> = new Map();

// Use market-specific thresholds
const marketStats = this.marketAccuracy.get(market);
const marketAccuracy = marketStats ? marketStats.correct / marketStats.total : 0.5;

// Only trade if market accuracy >= 55%
if (marketAccuracy < 0.55) {
    return "HOLD";
}
```

### Advanced (Requires research)

**G. Ensemble Voting**
```typescript
// Combine multiple independent predictors
// Only trade when 2+ agree

const predictor1 = this.momentumPredictor.predict(); // Momentum-based
const predictor2 = this.trendPredictor.predict();    // Trend-based
const predictor3 = this.obPredictor.predict();       // Order book-based

const votes = [predictor1, predictor2, predictor3].filter(p => p !== null);
const upVotes = votes.filter(p => p.direction === "up").length;
const downVotes = votes.filter(p => p.direction === "down").length;

// Only trade if 2+ predictors agree
if (Math.max(upVotes, downVotes) < 2) {
    return "HOLD";
}
```

**H. Volatility Regime Detection**
```typescript
// High volatility = lower confidence
// Track 20-period rolling volatility

if (volatility > 0.10) {
    // Very high volatility - reduce confidence by 50%
    confidence *= 0.5;
    return "HOLD"; // Don't trade
}
```

---

## 3. Viewing Your P&L

### Commands

**View overall P&L summary:**
```bash
npm run pnl:summary
```

Output:
```
================================================================================
💰 P&L SUMMARY
================================================================================
Total Cost: 25.00 USDC
Total Redemption Value: 18.50 USDC
Total P&L: -6.50 USDC
Total P&L %: -26.00%
Win Rate: 33.33%
================================================================================

📊 PER-MARKET BREAKDOWN:

  BTC (btc-updown-15m-1710158400)
    Cost: 15.00 USDC
    Redemption: 10.00 USDC
    P&L: -5.00 USDC (-33.33%)
    Winner: DOWN
    Trades: 5

  ETH (eth-updown-15m-1710158400)
    Cost: 10.00 USDC
    Redemption: 8.50 USDC
    P&L: -1.50 USDC (-15.00%)
    Winner: UP
    Trades: 3
```

**Export P&L to CSV:**
```bash
npm run pnl:export
```

Creates `pnl-export.csv` with columns:
- Market, Slug, TokenType, Shares, BuyPrice, BuyCost
- RedemptionPrice, RedemptionValue, P&L, P&L%, Status

**View P&L for specific market:**
```bash
npm run pnl:market btc
```

### Understanding P&L Metrics

| Metric | Meaning | Good Value |
|--------|---------|-----------|
| **Total Cost** | Total USDC spent on all trades | Lower is better (less capital deployed) |
| **Total Redemption Value** | Total USDC received from redemptions | Higher is better |
| **Total P&L** | Profit/Loss in USDC | Positive is good |
| **Total P&L %** | Return on capital | >0% is profitable |
| **Win Rate** | % of trades that made money | >50% is good |

### Example Scenarios

**Scenario 1: Profitable**
```
Total Cost: 100 USDC
Total Redemption: 115 USDC
Total P&L: +15 USDC (+15%)
Win Rate: 60%
→ Good! Making money on 60% of trades
```

**Scenario 2: Breakeven**
```
Total Cost: 100 USDC
Total Redemption: 100 USDC
Total P&L: 0 USDC (0%)
Win Rate: 50%
→ Neutral. Need to improve prediction accuracy or reduce costs.
```

**Scenario 3: Losing**
```
Total Cost: 100 USDC
Total Redemption: 70 USDC
Total P&L: -30 USDC (-30%)
Win Rate: 30%
→ Bad. Model is worse than random. Stop trading until improved.
```

---

## 4. How P&L Tracking Works

### Trade Recording Flow

1. **When you buy tokens:**
   ```
   recordTrade(market, slug, conditionId, tokenId, tokenType, shares, buyPrice)
   → Stores: cost = shares × buyPrice
   ```

2. **When market resolves:**
   ```
   updateTradeRedemption(conditionId, tokenId, redemptionPrice)
   → redemptionPrice = 0 (lost) or 1 (won)
   → Calculates: value = shares × redemptionPrice
   → Calculates: P&L = value - cost
   ```

3. **View anytime:**
   ```
   getPnLSummary()
   → Aggregates all trades
   → Calculates totals and win rate
   ```

### Data Storage

P&L data stored in `src/data/pnl-tracker.json`:
```json
{
  "markets": [
    {
      "market": "btc",
      "slug": "btc-updown-15m-1710158400",
      "conditionId": "0x123...",
      "winner": "UP",
      "totalCost": 25.00,
      "totalRedemptionValue": 18.50,
      "totalPnL": -6.50,
      "totalPnLPercent": -26.00,
      "trades": [
        {
          "timestamp": 1710158400000,
          "tokenType": "UP",
          "shares": 5,
          "buyPrice": 0.62,
          "buyCost": 3.10,
          "redemptionPrice": 0,
          "redemptionValue": 0,
          "pnl": -3.10,
          "pnlPercent": -100.00,
          "status": "REDEEMED"
        }
      ]
    }
  ]
}
```

---

## 5. Next Steps

### Immediate (This week)
1. ✅ Understand current prediction accuracy (32%)
2. ✅ View P&L with `npm run pnl:summary`
3. Implement Quick Win A: Stricter pole detection (5 cent minimum)
4. Implement Quick Win B: Skip first 2 minutes

### Short-term (Next 2 weeks)
5. Add order book imbalance feature
6. Implement per-market accuracy tracking
7. Test with SIMULATION_MODE=true before going live

### Medium-term (Next month)
8. Build ensemble voting system
9. Add volatility regime detection
10. Backtest on historical data

### Metrics to Track
- **Prediction accuracy** (target: >55%)
- **Win rate** (target: >55%)
- **P&L %** (target: >0%)
- **Sharpe ratio** (target: >1.0)

---

## 6. Debugging Tips

**If accuracy is still low after improvements:**

1. Check if pole detection is working:
   ```bash
   grep "PREDICT \[POLE\]" logs/bot-*.log | head -20
   ```

2. Check if signals are being generated:
   ```bash
   grep "Signal: BUY" logs/bot-*.log | wc -l
   ```

3. Check if momentum/trend align:
   ```bash
   grep "Momentum:" logs/bot-*.log | awk '{print $NF}' | sort | uniq -c
   ```

4. Export P&L and analyze in Excel:
   ```bash
   npm run pnl:export
   # Open pnl-export.csv in Excel
   # Filter by Status=REDEEMED
   # Sort by P&L% to find patterns
   ```

---

## Summary

- **Current accuracy: 32%** (worse than random)
- **Root cause: Pole detection too aggressive + weak signal filtering**
- **Quick fix: Require 5 cent swings + skip first 2 minutes**
- **View P&L: `npm run pnl:summary`**
- **Target: >55% accuracy + >0% P&L**
