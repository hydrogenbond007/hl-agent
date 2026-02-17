/**
 * Simple Trading Bot Example
 * 
 * This example shows how to:
 * - Set up a secure wallet
 * - Configure risk limits
 * - Get market data
 * - Open/close positions with stop-loss and take-profit
 */

import { 
  EnvWallet, 
  HyperliquidAgentToolkit 
} from '../src/index.js';

async function main() {
  // 1. Set up wallet (use environment variable for security)
  const wallet = EnvWallet.fromEnv('PRIVATE_KEY');
  console.log('Wallet address:', wallet.address);

  // 2. Create toolkit with risk limits
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'testnet',
    riskConfig: {
      maxLeverage: 5,
      maxPositionSizeUsd: 1000,
      maxDailyLoss: 500,
      requireStopLoss: true,
      maxOpenPositions: 3,
    },
    defaultSlippagePercent: 1,
  });

  console.log('Toolkit initialized for', toolkit.getNetwork());

  // 3. Get market data
  console.log('\n📊 Fetching market data...');
  const marketsResult = await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });
  
  if (marketsResult.success) {
    console.log('Markets:');
    marketsResult.data?.forEach(m => {
      console.log(`  ${m.coin}: $${m.price.toFixed(2)} | Funding: ${m.fundingRate.toFixed(4)}% | OI: $${m.openInterest.toLocaleString()}`);
    });
  }

  // 4. Check current positions
  console.log('\n📈 Checking positions...');
  const positionsResult = await toolkit.getPositions();
  
  if (positionsResult.success && positionsResult.data) {
    console.log(`Open positions: ${positionsResult.data.length}`);
    positionsResult.data.forEach(p => {
      console.log(`  ${p.coin} ${p.side}: ${p.size} @ $${p.entryPrice.toFixed(2)} | PnL: $${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPercent.toFixed(2)}%)`);
    });
  }

  // 5. Check balance
  console.log('\n💰 Checking balance...');
  const balanceResult = await toolkit.getBalance();
  
  if (balanceResult.success) {
    const { accountValue, availableBalance, marginUsed } = balanceResult.data!;
    console.log(`  Account Value: $${accountValue.toFixed(2)}`);
    console.log(`  Available: $${availableBalance.toFixed(2)}`);
    console.log(`  Margin Used: $${marginUsed.toFixed(2)}`);
  }

  // 6. Open a position with stop-loss and take-profit
  console.log('\n🎯 Opening BTC long position...');
  const orderResult = await toolkit.openPosition({
    coin: 'BTC',
    side: 'long',
    sizeUsd: 100,
    leverage: 3,
    stopLossPercent: 5,    // Stop-loss at -5%
    takeProfitPercent: 10, // Take-profit at +10%
    slippagePercent: 1,
  });

  if (orderResult.success) {
    console.log('✅ Position opened successfully!');
  } else {
    console.error('❌ Failed to open position:', orderResult.error);
  }

  // 7. Get risk statistics
  const riskStats = toolkit.getRiskStats();
  if (riskStats) {
    console.log('\n📊 Risk Statistics:');
    console.log(`  Daily PnL: $${riskStats.dailyPnl.toFixed(2)}`);
    console.log(`  Total Trades: ${riskStats.totalTrades}`);
    console.log(`  Win Rate: ${riskStats.winRate.toFixed(1)}%`);
  }

  // 8. Example: Close a position
  // const closeResult = await toolkit.closePosition({
  //   coin: 'BTC',
  //   percent: 100, // Close 100% of position
  // });

  // 9. Cleanup
  await wallet.dispose();
  console.log('\n✨ Done!');
}

main().catch(console.error);
