# How to Test the Quick Wins

## Step 1: Run in Simulation Mode (No Real Trades)

```bash
SIMULATION_MODE=true npm start
```

This runs the bot WITHOUT placing real orders. Perfect for testing.

**What you'll see:**
```
2026-03-10T09:13:15.655Z  INFO  Starting the bot...
2026-03-10T09:13:15.656Z  INFO  SIMULATION_MODE enabled - skipping allowances and balance check
2026-03-10T09:13:16.123Z  INFO  WebSocket orderbook initialized
2026-03-10T09:13:16.234Z  INFO  Initializing market btc with slug btc-updown-15m-1710158400
2026-03-10T09:13:17.456Z  INFO  📊 Up Ask ==========> 0.6200
2026-03-10T09:13:17.456Z  INFO  📊 Down Ask 0.3890
```

## Step 2: Watch for Predictions (5-10 minutes)

Look for these patterns in the logs:

**Before Quick Wins (old behavior):**
```
09:00:30 - 🔮 Prediction: UP (conf: 0.66) | Actual: DOWN | ❌ WRONG
09:00:45 - 🔮 Prediction: DOWN (conf: 0.40) | Actual: UP | ❌ WRONG
09:01:15 - 🔮 Prediction: UP (conf: 0.52) | Actual: DOWN | ❌ WRONG
```
→ Lots of predictions, many wrong

**After Quick Wins (new behavior):**
```
09:00:30 - (no prediction - first 2 minutes skipped)
09:00:45 - (no prediction - first 2 minutes skipped)
09:02:15 - 🔮 Prediction: UP (conf: 0.68) | Actual: UP | ✅ CORRECT
09:02:45 - (no prediction - momentum/trend don't align)
09:03:30 - 🔮 Prediction: DOWN (conf: 0.55) | Actual: DOWN | ✅ CORRECT
```
→ Fewer predictions, more correct

## Step 3: Check Accuracy After 10 Minutes

Stop the bot (Ctrl+C) and run:

```bash
npm run pnl:summary
```

**Expected output:**
```
================================================================================
💰 P&L SUMMARY
================================================================================
Total Cost: 15.00 USDC
Total Redemption Value: 12.50 USDC
Total P&L: -2.50 USDC (-16.67%)
Win Rate: 60.00%
================================================================================
```

**What to look for:**
- Win Rate should be **>50%** (was 33% before)
- Fewer total trades (because of stricter pole detection)
- More HOLD signals (because of alignment requirement)

## Step 4: Compare Before/After

### Before Quick Wins
```
Predictions per 15m: ~20
Accuracy: 32% (8/25)
Win Rate: 33%
P&L: -26%
```

### After Quick Wins (Expected)
```
Predictions per 15m: ~12
Accuracy: 50%+ (6/12)
Win Rate: 55%+
P&L: -5% to +5%
```

## Step 5: Run Multiple Cycles

Let it run for 30-60 minutes (2-4 market cycles) to get better statistics:

```bash
SIMULATION_MODE=true npm start
# Let it run for 30-60 minutes
# Then Ctrl+C to stop
npm run pnl:summary
```

## Interpreting Results

### Good Signs ✅
- Win Rate > 50%
- Fewer predictions (stricter filtering working)
- More HOLD signals
- Accuracy improving over time

### Bad Signs ❌
- Win Rate still < 50%
- Same number of predictions as before
- No HOLD signals
- Accuracy not improving

## If Something Goes Wrong

**Revert the changes:**
```bash
git checkout src/utils/pricePredictor.ts
```

**Then try again:**
```bash
SIMULATION_MODE=true npm start
```

## Debugging: Check Specific Logs

**See all predictions:**
```bash
grep "🔮 Prediction:" logs/bot-*.log | tail -20
```

**See all HOLD signals:**
```bash
grep "Signal: HOLD" logs/bot-*.log | wc -l
```

**See accuracy over time:**
```bash
grep "Prediction Accuracy:" logs/bot-*.log | tail -10
```

**See pole detections:**
```bash
grep "PREDICT \[POLE\]" logs/bot-*.log | tail -20
```

## Expected Behavior Changes

### Change 1: Stricter Pole Detection (0.02 → 0.05)

**Before:**
```
Price: 0.50 → 0.52 → 0.51 → POLE DETECTED (too easy)
```

**After:**
```
Price: 0.50 → 0.55 → 0.54 → POLE DETECTED (significant move)
```

**Result:** Fewer predictions, but higher quality

### Change 2: Skip First 2 Minutes

**Before:**
```
09:00:30 - Prediction: UP (wrong, too noisy)
09:01:15 - Prediction: DOWN (wrong, too noisy)
09:02:45 - Prediction: UP (better signal)
```

**After:**
```
09:00:30 - SKIP (too noisy)
09:01:15 - SKIP (too noisy)
09:02:45 - Prediction: UP (better signal)
```

**Result:** Removes noisiest period

### Change 3: Require Signal Alignment

**Before:**
```
Momentum: -0.031 (DOWN)
Trend: +0.087 (UP)
Prediction: UP (contradictory!)
Result: WRONG
```

**After:**
```
Momentum: -0.031 (DOWN)
Trend: +0.087 (UP)
Signal: HOLD (don't trade, signals contradict)
```

**Result:** Avoids contradictory trades

## Next Steps After Testing

1. **If accuracy improved to 50%+:**
   - Deploy to live trading (small position size)
   - Monitor for 1-2 hours
   - Gradually increase position size

2. **If accuracy still low (<50%):**
   - Check logs for patterns
   - Try adjusting thresholds:
     - `noiseThreshold`: Try 0.06 or 0.07
     - `minuteInCycle < 2`: Try `< 3` or `< 4`
     - Momentum/trend thresholds: Try 0.01 or 0.02

3. **If you want more improvements:**
   - Read `PREDICTION_ANALYSIS.md` for medium/advanced improvements
   - Implement order book imbalance feature
   - Add per-market accuracy tracking

## Commands Reference

```bash
# Run in simulation mode
SIMULATION_MODE=true npm start

# View P&L
npm run pnl:summary

# Export to CSV
npm run pnl:export

# Check TypeScript
npx tsc --noEmit

# View recent predictions
grep "🔮 Prediction:" logs/bot-*.log | tail -20

# Revert changes
git checkout src/utils/pricePredictor.ts
```

---

**Ready to test? Run:**
```bash
SIMULATION_MODE=true npm start
```

Let it run for 10-30 minutes, then check results with:
```bash
npm run pnl:summary
```
