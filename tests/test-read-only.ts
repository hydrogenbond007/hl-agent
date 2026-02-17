/**
 * Quick test of read-only APIs
 * These work without any wallet/authentication
 */

import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';

async function main() {
  console.log('🧪 Testing Direct Hyperliquid API Access\n');

  // Create transport (HTTP client)
  const transport = new HttpTransport({ isTestnet: false });
  const client = new InfoClient({ transport });

  console.log('📡 Fetching live data from Hyperliquid...\n');

  // Test 1: Get all mid prices
  console.log('1️⃣  Get All Prices:');
  const mids = await client.allMids();
  console.log(`   BTC: $${mids['BTC']}`);
  console.log(`   ETH: $${mids['ETH']}`);
  console.log(`   SOL: $${mids['SOL']}`);
  console.log();

  // Test 2: Get metadata
  console.log('2️⃣  Get Market Metadata:');
  const meta = await client.meta();
  console.log(`   Total markets: ${meta.universe.length}`);
  console.log(`   First 5 markets: ${meta.universe.slice(0, 5).map(m => m.name).join(', ')}`);
  console.log();

  // Test 3: Get L2 orderbook
  console.log('3️⃣  Get BTC Order Book:');
  const book = await client.l2Book({ coin: 'BTC', nSigFigs: 5 });
  console.log('   Top 3 Bids:');
  book[0].levels.slice(0, 3).forEach((level: any) => {
    console.log(`     $${level.px} - ${level.sz} BTC`);
  });
  console.log('   Top 3 Asks:');
  book[1].levels.slice(0, 3).forEach((level: any) => {
    console.log(`     $${level.px} - ${level.sz} BTC`);
  });
  console.log();

  console.log('✅ All API calls successful!');
  console.log();
  console.log('🌐 Communication Details:');
  console.log('   Endpoint: https://api.hyperliquid.xyz/info');
  console.log('   Method: POST');
  console.log('   Authentication: None (read-only)');
  console.log();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
