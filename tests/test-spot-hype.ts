/**
 * Quick test: Buy $2 of HYPE spot
 */

import { HyperliquidAgentToolkit, EnvWallet } from '../src/index.js';

async function main() {
  console.log('🪙 Testing HYPE Spot Purchase\n');

  const wallet = new EnvWallet(process.env.HYPERLIQUID_PRIVATE_KEY!);
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'mainnet',
  });

  console.log(`Wallet: ${wallet.address}\n`);

  // Check balance
  const balance = await toolkit.getBalance();
  console.log(`Balance: $${balance.data?.availableBalance.toFixed(2)}\n`);

  // First, find HYPE in universe
  const { InfoClient, HttpTransport } = await import('@nktkas/hyperliquid');
  const infoClient = new InfoClient({ transport: new HttpTransport() });
  const spotMeta = await infoClient.spotMeta();
  
  const hypeToken = spotMeta.tokens.find(t => t.name === 'HYPE');
  console.log(`HYPE token index: ${hypeToken?.index}`);
  
  const hypePair = spotMeta.universe.find(u => u.tokens.includes(hypeToken!.index));
  console.log(`HYPE pair: ${hypePair?.name} (index: ${hypePair?.index})`);
  console.log();
  
  // Buy $2 using the actual pair name
  console.log(`📈 Buying $2 via ${hypePair?.name}...`);
  const result = await toolkit.openPosition({
    coin: hypePair!.name,
    market: 'spot',
    side: 'buy',
    sizeUsd: 2,
  });

  if (result.success) {
    console.log('✅ SUCCESS! Order placed.');
  } else {
    console.log('❌ FAILED:', result.error);
  }
}

main().catch(console.error);
