/**
 * Example: Using Enhanced Toolkit Features
 * 
 * Shows advanced features beyond basic SDK
 */

import { EnhancedHyperliquidToolkit } from '../src/toolkit/enhanced-toolkit.js';
import { EnvWallet } from '../src/index.js';

async function main() {
  console.log('🚀 Enhanced Toolkit Features Demo\n');

  const wallet = new EnvWallet(process.env.HYPERLIQUID_PRIVATE_KEY || '0x1');
  const toolkit = new EnhancedHyperliquidToolkit({
    wallet,
    network: 'testnet',
  });

  // Feature 1: Cached Market Data
  console.log('1️⃣  Cached Market Data (faster repeated calls)');
  console.time('  First call');
  await toolkit.getMarketDataCached({ coins: ['BTC'] });
  console.timeEnd('  First call');
  
  console.time('  Cached call');
  const cached = await toolkit.getMarketDataCached({ coins: ['BTC'] });
  console.timeEnd('  Cached call');
  console.log(`  Cached: ${(cached as any).cached === true ? 'Yes' : 'No'}`);
  console.log();

  // Feature 2: Position Simulation
  console.log('2️⃣  Position Simulation (preview before trading)');
  const simulation = await toolkit.simulatePosition({
    coin: 'BTC',
    side: 'long',
    sizeUsd: 100,
    leverage: 3,
  });

  if (simulation.success) {
    console.log('  📊 Simulation Results:');
    console.log(`    Fill Price: $${simulation.data!.estimatedFillPrice.toFixed(2)}`);
    console.log(`    Slippage: ${simulation.data!.estimatedSlippage.toFixed(3)}%`);
    console.log(`    Fees: $${simulation.data!.estimatedFees.toFixed(2)}`);
    console.log(`    Liquidation: $${simulation.data!.estimatedLiquidationPrice.toFixed(2)}`);
    console.log(`    Price Impact: ${simulation.data!.priceImpact.toFixed(3)}%`);
  }
  console.log();

  // Feature 3: Dry Run (test without executing)
  console.log('3️⃣  Dry Run Mode (simulate only)');
  await toolkit.openPositionWithPreview({
    coin: 'BTC',
    side: 'long',
    sizeUsd: 100,
    leverage: 3,
    dryRun: true, // ← Won't actually trade
  });
  console.log();

  // Feature 4: Trailing Stop-Loss
  console.log('4️⃣  Trailing Stop-Loss');
  const trailingStop = await toolkit.setTrailingStop({
    coin: 'BTC',
    trailPercent: 5, // Trails 5% below high
  });
  console.log(`  Status: ${trailingStop.success ? 'Active' : 'Failed'}`);
  console.log();

  // Feature 5: TWAP Order
  console.log('5️⃣  TWAP Order (split over time)');
  await toolkit.twapOrder({
    coin: 'BTC',
    side: 'long',
    totalSizeUsd: 1000,
    durationMinutes: 60,
    slicesCount: 12, // 12 slices = 1 every 5 minutes
  });
  console.log();

  // Feature 6: Batch Operations
  console.log('6️⃣  Batch Operations (parallel execution)');
  await toolkit.batchExecute([
    { type: 'open', params: { coin: 'BTC', side: 'long', sizeUsd: 50 } },
    { type: 'open', params: { coin: 'ETH', side: 'long', sizeUsd: 50 } },
    { type: 'open', params: { coin: 'SOL', side: 'long', sizeUsd: 50 } },
  ]);
  console.log();

  // Feature 7: Real-time Position Updates
  console.log('7️⃣  Real-time Position Updates');
  console.log('  (Would monitor position every 5s in production)');
  
  if (process.env.HYPERLIQUID_PRIVATE_KEY) {
    const cleanup = await toolkit.getPositionWithUpdates({
      coin: 'BTC',
      onUpdate: (position) => {
        console.log(`  BTC Position: ${position.side} | PnL: $${position.unrealizedPnl.toFixed(2)}`);
      },
      intervalMs: 5000,
    });
    
    // Stop after 15 seconds
    setTimeout(() => {
      cleanup();
      console.log('  Stopped monitoring');
    }, 15000);
  }

  console.log('\n✅ Enhanced features demo complete!');
}

main().catch(console.error);
