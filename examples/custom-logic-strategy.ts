/**
 * CUSTOM LOGIC STRATEGY (No LLM)
 * 
 * Don't want to use an LLM? Write your own trading logic!
 * This example shows how to use the toolkit directly with your own code.
 */

import { 
  HyperliquidAgentToolkit,
  EnvWallet 
} from '../src/index.js';

/**
 * YOUR CUSTOM TRADING LOGIC
 * 
 * Write any logic you want here - technical indicators,
 * ML models, arbitrage strategies, whatever!
 */
async function tradingLogic(toolkit: HyperliquidAgentToolkit) {
  console.log('🔍 Checking market conditions...');
  
  // 1. Get market data
  const marketsResult = await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });
  if (!marketsResult.success) {
    console.error('Failed to get market data:', marketsResult.error);
    return;
  }
  
  const markets = marketsResult.data!;
  const btc = markets.find(m => m.coin === 'BTC')!;
  
  console.log(`  BTC: $${btc.price.toFixed(2)}`);
  console.log(`  Volume: $${(btc.volume24h / 1_000_000).toFixed(2)}M`);
  console.log(`  Funding: ${btc.fundingRate.toFixed(4)}%`);
  
  // 2. Check current positions
  const positionsResult = await toolkit.getPositions();
  const positions = positionsResult.success ? positionsResult.data! : [];
  
  console.log(`  Open positions: ${positions.length}`);
  
  // 3. YOUR STRATEGY HERE
  
  // Example: Simple momentum strategy
  const hasPosition = positions.some(p => p.coin === 'BTC');
  const highVolume = btc.volume24h > 100_000_000; // $100M
  const normalFunding = Math.abs(btc.fundingRate) < 0.1; // Low funding
  
  if (!hasPosition && highVolume && normalFunding) {
    console.log('📈 Opening BTC long position...');
    
    const result = await toolkit.openPosition({
      coin: 'BTC',
      side: 'long',
      sizeUsd: 50,
      leverage: 2,
      stopLossPercent: 3,
      takeProfitPercent: 6,
    });
    
    if (result.success) {
      console.log('  ✅ Position opened!');
    } else {
      console.error('  ❌ Failed:', result.error);
    }
  } else {
    console.log('  ⏸️  No action - conditions not met');
  }
  
  // 4. Check existing positions for exit conditions
  for (const position of positions) {
    console.log(`\n📊 Position: ${position.coin} ${position.side}`);
    console.log(`  PnL: $${position.unrealizedPnl.toFixed(2)} (${position.unrealizedPnlPercent.toFixed(2)}%)`);
    
    // Example: Exit if profit > 5%
    if (position.unrealizedPnlPercent > 5) {
      console.log('  💰 Taking profit!');
      
      const result = await toolkit.closePosition({
        coin: position.coin,
        percent: 100,
      });
      
      if (result.success) {
        console.log('  ✅ Position closed!');
      }
    }
  }
}

/**
 * CONFIGURATION
 */
const CONFIG = {
  checkInterval: 60_000, // Check every 1 minute
  network: 'testnet' as const,
};

/**
 * MAIN LOOP
 */
async function main() {
  console.log('🤖 Starting Custom Logic Trading Bot\n');
  
  // Setup
  const wallet = new EnvWallet(process.env.HYPERLIQUID_PRIVATE_KEY!);
  console.log(`Wallet: ${wallet.address}`);
  console.log(`Network: ${CONFIG.network}\n`);
  
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: CONFIG.network,
    riskConfig: {
      maxLeverage: 3,
      maxPositionSizeUsd: 100,
      maxDailyLoss: 50,
      requireStopLoss: true,
    },
  });
  
  console.log('✅ Setup complete. Starting trading loop...\n');
  
  // Run trading logic on interval
  const intervalId = setInterval(async () => {
    try {
      await tradingLogic(toolkit);
    } catch (error: any) {
      console.error('❌ Error in trading logic:', error.message);
    }
  }, CONFIG.checkInterval);
  
  // Also run immediately
  await tradingLogic(toolkit);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    clearInterval(intervalId);
    process.exit(0);
  });
  
  console.log('\n🔄 Trading loop active. Press Ctrl+C to stop.\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

/**
 * USAGE:
 * 
 * 1. Set HYPERLIQUID_PRIVATE_KEY in .env
 * 2. Write your logic in tradingLogic() function above
 * 3. Run: npx tsx examples/custom-logic-strategy.ts
 * 
 * No LLM needed! Full control over your strategy.
 */
