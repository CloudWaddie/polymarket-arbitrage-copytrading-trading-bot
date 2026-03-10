#!/usr/bin/env node

import { getPnLSummary, printPnLSummary, exportPnLToCSV, getMarketPnL } from "../utils/pnlTracker";
import { logger } from "../utils/logger";


const command = process.argv[2];
const arg = process.argv[3];

function showHelp() {
    console.log(`
📊 P&L Tracker CLI

Usage:
  npm run pnl:summary          Show overall P&L summary
  npm run pnl:market <name>    Show P&L for specific market (e.g., btc, eth)
  npm run pnl:export           Export P&L data to CSV
  npm run pnl:help             Show this help message

Examples:
  npm run pnl:summary
  npm run pnl:market btc
  npm run pnl:export
    `);
}

async function main() {
    try {
        switch (command) {
            case "summary":
                printPnLSummary();
                break;

            case "market":
                if (!arg) {
                    logger.error("Market name required. Usage: npm run pnl:market <market>");
                    process.exit(1);
                }
                const marketPnL = getMarketPnL(arg, `${arg}-updown-15m-*`);
                if (!marketPnL) {
                    logger.info(`No P&L data found for market: ${arg}`);
                } else {
                    logger.info(`\n${"=".repeat(80)}`);
                    logger.info(`📊 P&L for ${arg.toUpperCase()}`);
                    logger.info(`${"=".repeat(80)}`);
                    logger.info(`Total Cost: ${marketPnL.totalCost.toFixed(2)} USDC`);
                    logger.info(`Total Redemption: ${marketPnL.totalRedemptionValue.toFixed(2)} USDC`);
                    logger.info(`Total P&L: ${marketPnL.totalPnL > 0 ? "+" : ""}${marketPnL.totalPnL.toFixed(2)} USDC`);
                    logger.info(`P&L %: ${marketPnL.totalPnLPercent > 0 ? "+" : ""}${marketPnL.totalPnLPercent.toFixed(2)}%`);
                    logger.info(`Winner: ${marketPnL.winner || "PENDING"}`);
                    logger.info(`Trades: ${marketPnL.trades.length}`);
                    logger.info(`${"=".repeat(80)}\n`);
                }
                break;

            case "export":
                const csvPath = exportPnLToCSV();
                logger.info(`✅ P&L exported to: ${csvPath}`);
                break;

            case "help":
            case "--help":
            case "-h":
                showHelp();
                break;

            default:
                logger.error(`Unknown command: ${command}`);
                showHelp();
                process.exit(1);
        }
    } catch (e) {
        logger.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
    }
}

main();
