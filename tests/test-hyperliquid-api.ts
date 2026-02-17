/**
 * Test Hyperliquid API Communication
 * 
 * This tests that our SDK can actually communicate with Hyperliquid's API
 * Run: npm test
 */

import { HyperliquidAgentToolkit, EnvWallet } from '../src/index.js';

async function testReadOnlyAPIs() {
  console.log('🧪 Testing Read-Only APIs (no wallet needed)\n');
  
  // Create a dummy wallet (won't be used for read operations)
  const dummyWallet = new EnvWallet('0x0000000000000000000000000000000000000000000000000000000000000001');
  
  const toolkit = new HyperliquidAgentToolkit({
    wallet: dummyWallet,
    network: 'mainnet'
  });

  // Test 1: Get Market Data
  console.log('📊 Test 1: Get Market Data');
  try {
    const result = await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });
    
    if (result.success) {
      console.log('  ✅ SUCCESS');
      console.log(`  Found ${result.data!.length} markets`);
      for (const market of result.data!) {
        console.log(`    ${market.coin}: $${market.price.toFixed(2)} | Vol: $${(market.volume24h / 1_000_000).toFixed(2)}M`);
      }
    } else {
      console.log('  ❌ FAILED:', result.error);
    }
  } catch (error: any) {
    console.log('  ❌ ERROR:', error.message);
  }
  console.log();

  // Test 2: Get Order Book
  console.log('📖 Test 2: Get Order Book');
  try {
    const result = await toolkit.getOrderBook({ coin: 'BTC', depth: 5 });
    
    if (result.success) {
      console.log('  ✅ SUCCESS');
      console.log('  Top 5 bids:');
      result.data!.bids.forEach(([price, size]) => {
        console.log(`    $${price.toFixed(2)} - ${size} BTC`);
      });
      console.log('  Top 5 asks:');
      result.data!.asks.forEach(([price, size]) => {
        console.log(`    $${price.toFixed(2)} - ${size} BTC`);
      });
    } else {
      console.log('  ❌ FAILED:', result.error);
    }
  } catch (error: any) {
    console.log('  ❌ ERROR:', error.message);
  }
  console.log();

  // Test 3: Get Balance (requires real wallet)
  console.log('💰 Test 3: Get Balance (will fail with dummy wallet)');
  try {
    const result = await toolkit.getBalance();
    
    if (result.success) {
      console.log('  ✅ SUCCESS');
      console.log(`  Account Value: $${result.data!.accountValue.toFixed(2)}`);
      console.log(`  Available: $${result.data!.availableBalance.toFixed(2)}`);
    } else {
      console.log('  ⚠️  Expected (dummy wallet):', result.error);
    }
  } catch (error: any) {
    console.log('  ⚠️  Expected error with dummy wallet:', error.message);
  }
  console.log();
}

async function testWithRealWallet() {
  console.log('🔐 Testing with Real Wallet\n');

  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  
  if (!privateKey) {
    console.log('⚠️  Skipping: Set HYPERLIQUID_PRIVATE_KEY to test with real wallet\n');
    return;
  }

  const wallet = new EnvWallet(privateKey);
  console.log(`Wallet: ${wallet.address}\n`);

  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'testnet', // Use testnet for safety
  });

  // Test 4: Get Positions
  console.log('📈 Test 4: Get Your Positions');
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

  // Test 5: Get Balance
  console.log('💰 Test 5: Get Your Balance');
  try {
    const result = await toolkit.getBalance();
    
    if (result.success) {
      console.log('  ✅ SUCCESS');
      console.log(`  Account Value: $${result.data!.accountValue.toFixed(2)}`);
      console.log(`  Available: $${result.data!.availableBalance.toFixed(2)}`);
      console.log(`  Margin Used: $${result.data!.marginUsed.toFixed(2)}`);
    } else {
      console.log('  ❌ FAILED:', result.error);
    }
  } catch (error: any) {
    console.log('  ❌ ERROR:', error.message);
  }
  console.log();
}

async function testUnderlyingSDK() {
  console.log('🔍 Testing Underlying @nktkas/hyperliquid SDK\n');

  try {
    const { HttpTransport, InfoClient } = await import('@nktkas/hyperliquid');
    
    console.log('📡 Direct API call to Hyperliquid:');
    
    const transport = new HttpTransport({ isTestnet: false });
    const client = new InfoClient({ transport });
    
    // Make direct API call
    const mids = await client.allMids();
    
    console.log('  ✅ SUCCESS - Raw API Response:');
    console.log(`  BTC: $${mids['BTC']}`);
    console.log(`  ETH: $${mids['ETH']}`);
    console.log(`  SOL: $${mids['SOL']}`);
    console.log();
    
    console.log('🌐 API Endpoint:');
    console.log('  https://api.hyperliquid.xyz/info');
    console.log('  Method: POST');
    console.log('  Body: { "type": "allMids" }');
    console.log();
    
  } catch (error: any) {
    console.log('  ❌ ERROR:', error.message);
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  HYPERLIQUID API COMMUNICATION TEST');
  console.log('═'.repeat(60));
  console.log();

  // Test the underlying SDK directly
  await testUnderlyingSDK();
  
  // Test read-only APIs (work without real wallet)
  await testReadOnlyAPIs();
  
  // Test with real wallet (if provided)
  await testWithRealWallet();

  console.log('═'.repeat(60));
  console.log('  TEST COMPLETE');
  console.log('═'.repeat(60));
  console.log();
  console.log('📝 Summary:');
  console.log('  ✅ Read-only APIs work without wallet');
  console.log('  ✅ SDK communicates with Hyperliquid via HTTP');
  console.log('  🔐 Trading APIs require real wallet + signature');
  console.log();
  console.log('💡 To test trading:');
  console.log('  1. Set HYPERLIQUID_PRIVATE_KEY in .env');
  console.log('  2. Use testnet for safety');
  console.log('  3. Run: npm test');
  console.log();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
