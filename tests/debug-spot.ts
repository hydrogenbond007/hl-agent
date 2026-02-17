/**
 * Debug spot order issue
 */

import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';

async function main() {
  console.log('🔍 Debugging Spot Order Issue\n');
  
  const client = new InfoClient({ transport: new HttpTransport() });
  
  // 1. Get spot metadata
  console.log('1. Fetching spot metadata...');
  const spotMeta = await client.spotMeta();
  console.log(`   Found ${spotMeta.universe.length} trading pairs`);
  
  // 2. Find HYPE/USDC pair
  console.log('\n2. Looking for HYPE/USDC pair...');
  const hypePair = spotMeta.universe.find(u => u.name === 'HYPE/USDC');
  
  if (!hypePair) {
    console.log('   ❌ HYPE/USDC not found!');
    console.log('   Available pairs with HYPE:');
    spotMeta.universe
      .filter(u => u.name.includes('HYPE'))
      .forEach(u => console.log(`     - ${u.name} (index: ${u.index})`));
    return;
  }
  
  console.log(`   ✅ Found: ${hypePair.name} (universe index: ${hypePair.index})`);
  console.log(`   Asset index for order: ${10000 + hypePair.index}`);
  
  // 3. Get order book to find price
  console.log('\n3. Getting HYPE/USDC order book...');
  try {
    const book = await client.l2Book({ coin: 'HYPE/USDC', nSigFigs: 5 });
    
    if (book[0]?.levels?.length && book[1]?.levels?.length) {
      const bestBid = book[0].levels[0].px;
      const bestAsk = book[1].levels[0].px;
      console.log(`   Best Bid: ${bestBid}`);
      console.log(`   Best Ask: ${bestAsk}`);
      console.log(`   Mid Price: ${(parseFloat(bestBid) + parseFloat(bestAsk)) / 2}`);
    } else {
      console.log('   ❌ No liquidity in order book');
    }
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('\n✅ Debug complete');
  console.log('\nFor spot orders use:');
  console.log(`  asset: ${10000 + hypePair.index}`);
  console.log(`  coin parameter: "HYPE/USDC" or "HYPE"`);
}

main().catch(console.error);
