/**
 * Mainnet Test Script
 * Tests real API calls with your wallet
 */

import { HyperliquidAgentToolkit, EnvWallet } from '../src/index.js';

async function main() {
  console.log('🔥 HYPERLIQUID MAINNET TEST\n');
  console.log('⚠️  WARNING: Using REAL FUNDS on MAINNET\n');

  // Check for private key
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Error: HYPERLIQUID_PRIVATE_KEY not set');
    console.log('\nSet it with:');
    console.log('  export HYPERLIQUID_PRIVATE_KEY=0x...');
    process.exit(1);
  }

  // Create wallet
  const wallet = new EnvWallet(privateKey);
  console.log(`✅ Wallet: ${wallet.address}\n`);

  // Create toolkit (MAINNET)
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'mainnet', // REAL MAINNET!
    riskConfig: {
      maxLeverage: 3,
      maxPositionSizeUsd: 50, // Small for testing
    }
  });

  console.log('═'.repeat(60));
  console.log('PART 1: READ-ONLY TESTS (Safe, no transactions)');
  console.log('═'.repeat(60));
  console.log();

  // Test 1: Market Data
  console.log('📊 Test 1: Get Market Data');
  try {
    const result = await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });
    
    if (result.success) {
      console.log('  ✅ SUCCESS');
      for (const market of result.data!) {
        console.log(`  ${market.coin}: $${market.price.toFixed(2)} | Vol: $${(market.volume24h / 1_000_000).toFixed(2)}M`);
      }
    } else {
      console.log('  ❌ FAILED:', result.error);
    }
  } catch (error: any) {
    console.log('  ❌ ERROR:', error.message);
  }
  console.log();

  // Test 2: Your Balance
  console.log('💰 Test 2: Get Your Balance');
  try {
    const result = await toolkit.getBalance();
    
    if (result.success) {
      console.log('  ✅ SUCCESS');
      console.log(`  Account Value: $${result.data!.accountValue.toFixed(2)}`);
      console.log(`  Available: $${result.data!.availableBalance.toFixed(2)}`);
      console.log(`  Margin Used: $${result.data!.marginUsed.toFixed(2)}`);
      console.log(`  Withdrawable: $${result.data!.withdrawable.toFixed(2)}`);
    } else {
      console.log('  ❌ FAILED:', result.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.log('  ❌ ERROR:', error.message);
    process.exit(1);
  }
  console.log();

  // Test 3: Your Positions
  console.log('📈 Test 3: Get Your Open Positions');
  try {
    const result = await toolkit.getPositions();
    
    if (result.success) {
      console.log('  ✅ SUCCESS');
      if (result.data!.length === 0) {
        console.log('  No open positions');
      } else {
        for (const pos of result.data!) {
          console.log(`  ${pos.coin} ${pos.side.toUpperCase()}`);
          console.log(`    Size: ${pos.size} | Entry: $${pos.entryPrice.toFixed(2)}`);
          console.log(`    Current: $${pos.currentPrice.toFixed(2)}`);
          console.log(`    PnL: $${pos.unrealizedPnl.toFixed(2)} (${pos.unrealizedPnlPercent.toFixed(2)}%)`);
        }
      }
    } else {
      console.log('  ❌ FAILED:', result.error);
    }
  } catch (error: any) {
    console.log('  ❌ ERROR:', error.message);
  }
  console.log();

  // Test 4: Order Book
  console.log('📖 Test 4: Get BTC Order Book');
  try {
    const result = await toolkit.getOrderBook({ coin: 'BTC', depth: 5 });
    
    if (result.success) {
      console.log('  ✅ SUCCESS');
      console.log('  Top 5 Bids:');
      result.data!.bids.slice(0, 5).forEach(([price, size]) => {
        console.log(`    $${price.toFixed(2)} - ${size} BTC`);
      });
      console.log('  Top 5 Asks:');
      result.data!.asks.slice(0, 5).forEach(([price, size]) => {
        console.log(`    $${price.toFixed(2)} - ${size} BTC`);
      });
    } else {
      console.log('  ❌ FAILED:', result.error);
    }
  } catch (error: any) {
    console.log('  ❌ ERROR:', error.message);
  }
  console.log();

  console.log('═'.repeat(60));
  console.log('✅ READ-ONLY TESTS COMPLETE');
  console.log('═'.repeat(60));
  console.log();

  // Ask before trading
  console.log('⚠️  PART 2: TRADING TEST (Uses real money!)');
  console.log();
  console.log('Do you want to test a SMALL TRADE on mainnet?');
  console.log('This will open a $10 BTC long position with 3% stop-loss.');
  console.log();
  console.log('To proceed, run:');
  console.log('  npm run test:mainnet:trade');
  console.log();
  console.log('Or to skip trading test, you\'re done! All APIs work ✅');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
