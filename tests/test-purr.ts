/**
 * Test PURR spot purchase
 * PURR is spot universe index 0 (pair: PURR/USDC)
 */

import { HyperliquidAgentToolkit, EnvWallet } from '../src/index.js';

async function main() {
  const wallet = new EnvWallet(process.env.HYPERLIQUID_PRIVATE_KEY!);
  const toolkit = new HyperliquidAgentToolkit({ wallet, network: 'mainnet' });

  console.log(`Wallet: ${wallet.address}\n`);

  // Buy $2 of PURR
  console.log('📈 Buying $2 of PURR (spot pair PURR/USDC)...');
  const result = await toolkit.openPosition({
    coin: 'PURR/USDC',
    market: 'spot',
    side: 'buy',
    sizeUsd: 2,
  });

  console.log(result.success ? '✅ SUCCESS!' : `❌ FAILED: ${result.error}`);
}

main().catch(console.error);
