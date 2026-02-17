import { HyperliquidAgentToolkit, EnvWallet } from '../src/index.js';

async function main() {
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('HYPERLIQUID_PRIVATE_KEY is required');
  }

  const wallet = new EnvWallet(privateKey);
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'mainnet',
  });

  console.log('Wallet:', wallet.address);

  const balance = await toolkit.getBalance();
  if (!balance.success) {
    throw new Error(`Failed to fetch balance: ${balance.error}`);
  }
  console.log('Available balance:', balance.data!.availableBalance.toFixed(2));
  const spotUsd = 10;
  const perpUsd = 10.2;
  const skipSpot = process.env.SKIP_SPOT === '1';

  if (!skipSpot) {
    console.log(`\n[1/3] Spot buy test: HYPE $${spotUsd}`);
    const spotResult = await toolkit.openPosition({
      coin: 'HYPE',
      market: 'spot',
      side: 'buy',
      sizeUsd: spotUsd,
    });
    console.log('Spot result:', spotResult);
  } else {
    console.log('\n[1/3] Spot buy test: skipped');
  }

  console.log(`\n[2/3] Perp open test: ETH long $${perpUsd}`);
  const perpOpen = await toolkit.openPosition({
    coin: 'ETH',
    market: 'perp',
    side: 'long',
    sizeUsd: perpUsd,
    leverage: 2,
  });
  console.log('Perp open result:', perpOpen);

  console.log('\n[3/3] Perp close test: ETH close 100%');
  const perpClose = await toolkit.closePosition({
    coin: 'ETH',
    percent: 100,
  });
  console.log('Perp close result:', perpClose);
}

main().catch((error) => {
  console.error('Smoke test failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
