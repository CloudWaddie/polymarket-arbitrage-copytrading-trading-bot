import { logger } from "./logger";
import * as fs from "fs";
import * as path from "path";

/**
 * P&L tracking for trades
 * Tracks cost basis, redemption value, and profit/loss
 */

export interface TradeRecord {
    timestamp: number;
    market: string;
    slug: string;
    conditionId: string;
    tokenId: string;
    tokenType: "UP" | "DOWN";
    shares: number;
    buyPrice: number;
    buyCost: number;
    redemptionPrice?: number; // Price when redeemed (0 or 1)
    redemptionValue?: number; // Actual value received
    pnl?: number; // Profit/loss on this trade
    pnlPercent?: number; // P&L as percentage
    status: "OPEN" | "REDEEMED" | "EXPIRED";
    endTime?: number; // When trade was closed/redeemed
}

export interface MarketPnL {
    market: string;
    slug: string;
    conditionId: string;
    winner?: "UP" | "DOWN"; // Which token won (0 or 1)
    totalCost: number;
    totalRedemptionValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    trades: TradeRecord[];
    startTime: number;
    endTime?: number;
}

export interface PnLSummary {
    totalCost: number;
    totalRedemptionValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    winRate: number; // % of trades that were profitable
    markets: MarketPnL[];
    lastUpdated: number;
}

const PNL_FILE = path.resolve(process.cwd(), "src/data/pnl-tracker.json");

function ensurePnLFile(): void {
    const dir = path.dirname(PNL_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(PNL_FILE)) {
        fs.writeFileSync(PNL_FILE, JSON.stringify({ markets: [] }, null, 2));
    }
}

export function loadPnLData(): { markets: MarketPnL[] } {
    ensurePnLFile();
    try {
        const content = fs.readFileSync(PNL_FILE, "utf-8");
        return JSON.parse(content);
    } catch (e) {
        logger.error(`Failed to load P&L data: ${e instanceof Error ? e.message : String(e)}`);
        return { markets: [] };
    }
}

export function savePnLData(data: { markets: MarketPnL[] }): void {
    try {
        ensurePnLFile();
        fs.writeFileSync(PNL_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        logger.error(`Failed to save P&L data: ${e instanceof Error ? e.message : String(e)}`);
    }
}

/**
 * Record a trade (when buying tokens)
 */
export function recordTrade(
    market: string,
    slug: string,
    conditionId: string,
    tokenId: string,
    tokenType: "UP" | "DOWN",
    shares: number,
    buyPrice: number
): void {
    const data = loadPnLData();
    const marketKey = `${market}-${slug}`;
    
    let marketPnL = data.markets.find(m => m.slug === slug && m.market === market);
    if (!marketPnL) {
        marketPnL = {
            market,
            slug,
            conditionId,
            totalCost: 0,
            totalRedemptionValue: 0,
            totalPnL: 0,
            totalPnLPercent: 0,
            trades: [],
            startTime: Date.now(),
        };
        data.markets.push(marketPnL);
    }

    const buyCost = shares * buyPrice;
    const trade: TradeRecord = {
        timestamp: Date.now(),
        market,
        slug,
        conditionId,
        tokenId,
        tokenType,
        shares,
        buyPrice,
        buyCost,
        status: "OPEN",
    };

    marketPnL.trades.push(trade);
    marketPnL.totalCost += buyCost;

    savePnLData(data);
    logger.info(`📝 Trade recorded: ${tokenType} ${shares} @ ${buyPrice.toFixed(4)} = ${buyCost.toFixed(2)} USDC`);
}

/**
 * Update trade with redemption value (when market resolves)
 * redemptionPrice should be 0 or 1 (which token won)
 */
export function updateTradeRedemption(
    conditionId: string,
    tokenId: string,
    redemptionPrice: number // 0 or 1
): void {
    const data = loadPnLData();
    let updated = false;

    for (const market of data.markets) {
        if (market.conditionId !== conditionId) continue;

        for (const trade of market.trades) {
            if (trade.tokenId !== tokenId || trade.status !== "OPEN") continue;

            // Calculate redemption value
            // If this token won (redemptionPrice = 1), value = shares
            // If this token lost (redemptionPrice = 0), value = 0
            const redemptionValue = trade.shares * redemptionPrice;
            const pnl = redemptionValue - trade.buyCost;
            const pnlPercent = trade.buyCost > 0 ? (pnl / trade.buyCost) * 100 : 0;

            trade.redemptionPrice = redemptionPrice;
            trade.redemptionValue = redemptionValue;
            trade.pnl = pnl;
            trade.pnlPercent = pnlPercent;
            trade.status = "REDEEMED";
            trade.endTime = Date.now();

            market.totalRedemptionValue += redemptionValue;
            market.totalPnL = market.totalRedemptionValue - market.totalCost;
            market.totalPnLPercent = market.totalCost > 0 ? (market.totalPnL / market.totalCost) * 100 : 0;
            market.endTime = Date.now();

            // Determine winner
            if (redemptionPrice === 1) {
                market.winner = trade.tokenType;
            }

            updated = true;
            logger.info(
                `✅ Trade redeemed: ${trade.tokenType} | Value: ${redemptionValue.toFixed(2)} USDC | P&L: ${pnl > 0 ? "+" : ""}${pnl.toFixed(2)} USDC (${pnlPercent > 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)`
            );
        }
    }

    if (updated) {
        savePnLData(data);
    }
}

/**
 * Get P&L summary for all trades
 */
export function getPnLSummary(): PnLSummary {
    const data = loadPnLData();
    
    let totalCost = 0;
    let totalRedemptionValue = 0;
    let profitableTrades = 0;
    let totalTrades = 0;

    for (const market of data.markets) {
        totalCost += market.totalCost;
        totalRedemptionValue += market.totalRedemptionValue;

        for (const trade of market.trades) {
            if (trade.status === "REDEEMED") {
                totalTrades++;
                if ((trade.pnl ?? 0) > 0) {
                    profitableTrades++;
                }
            }
        }
    }

    const totalPnL = totalRedemptionValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

    return {
        totalCost,
        totalRedemptionValue,
        totalPnL,
        totalPnLPercent,
        winRate,
        markets: data.markets,
        lastUpdated: Date.now(),
    };
}

/**
 * Print P&L summary to logs
 */
export function printPnLSummary(): void {
    const summary = getPnLSummary();

    logger.info(`\n${"=".repeat(80)}`);
    logger.info(`💰 P&L SUMMARY`);
    logger.info(`${"=".repeat(80)}`);
    logger.info(`Total Cost: ${summary.totalCost.toFixed(2)} USDC`);
    logger.info(`Total Redemption Value: ${summary.totalRedemptionValue.toFixed(2)} USDC`);
    logger.info(`Total P&L: ${summary.totalPnL > 0 ? "+" : ""}${summary.totalPnL.toFixed(2)} USDC`);
    logger.info(`Total P&L %: ${summary.totalPnLPercent > 0 ? "+" : ""}${summary.totalPnLPercent.toFixed(2)}%`);
    logger.info(`Win Rate: ${summary.winRate.toFixed(2)}%`);
    logger.info(`${"=".repeat(80)}\n`);

    // Per-market breakdown
    if (summary.markets.length > 0) {
        logger.info(`📊 PER-MARKET BREAKDOWN:`);
        for (const market of summary.markets) {
            if (market.totalCost > 0) {
                logger.info(`\n  ${market.market.toUpperCase()} (${market.slug})`);
                logger.info(`    Cost: ${market.totalCost.toFixed(2)} USDC`);
                logger.info(`    Redemption: ${market.totalRedemptionValue.toFixed(2)} USDC`);
                logger.info(`    P&L: ${market.totalPnL > 0 ? "+" : ""}${market.totalPnL.toFixed(2)} USDC (${market.totalPnLPercent > 0 ? "+" : ""}${market.totalPnLPercent.toFixed(2)}%)`);
                logger.info(`    Winner: ${market.winner || "PENDING"}`);
                logger.info(`    Trades: ${market.trades.length}`);
            }
        }
        logger.info(`\n${"=".repeat(80)}\n`);
    }
}

/**
 * Get P&L for a specific market
 */
export function getMarketPnL(market: string, slug: string): MarketPnL | null {
    const data = loadPnLData();
    return data.markets.find(m => m.market === market && m.slug === slug) || null;
}

/**
 * Export P&L data to CSV for analysis
 */
export function exportPnLToCSV(filePath?: string): string {
    const summary = getPnLSummary();
    const outputPath = filePath || path.resolve(process.cwd(), "pnl-export.csv");

    let csv = "Market,Slug,TokenType,Shares,BuyPrice,BuyCost,RedemptionPrice,RedemptionValue,P&L,P&L%,Status\n";

    for (const market of summary.markets) {
        for (const trade of market.trades) {
            csv += `${trade.market},${trade.slug},${trade.tokenType},${trade.shares},${trade.buyPrice.toFixed(4)},${trade.buyCost.toFixed(2)},${trade.redemptionPrice ?? "N/A"},${trade.redemptionValue?.toFixed(2) ?? "N/A"},${trade.pnl?.toFixed(2) ?? "N/A"},${trade.pnlPercent?.toFixed(2) ?? "N/A"},${trade.status}\n`;
        }
    }

    fs.writeFileSync(outputPath, csv);
    logger.info(`📊 P&L data exported to ${outputPath}`);
    return outputPath;
}
