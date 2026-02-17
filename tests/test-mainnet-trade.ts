/**
 * Mainnet Trading Test
 * ACTUALLY TRADES WITH REAL MONEY
 */

import { HyperliquidAgentToolkit, EnvWallet } from '../src/index.js';
import { createInterface } from 'readline';

async function askConfirmation(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  console.log('🔥 MAINNET TRADING TEST\n');
  console.log('⚠️  ⚠️  ⚠️  WARNING ⚠️  ⚠️  ⚠️');
  console.log('This will TRADE WITH REAL MONEY on MAINNET!\n');

  const confirmed = await askConfirmation('Type "yes" to continue: ');
  
  if (!confirmed) {
    console.log('\n❌ Cancelled. No trades executed.');
    process.exit(0);
  }

  console.log();

  // Setup
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ HYPERLIQUID_PRIVATE_KEY not set');
    process.exit(1);
  }

  const wallet = new EnvWallet(privateKey);
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'mainnet',
  });

  console.log(`Wallet: ${wallet.address}\n`);

  // Check balance first
  console.log('💰 Checking balance...');
  const balance = await toolkit.getBalance();
  
  if (!balance.success) {
    console.error('❌ Failed to get balance:', balance.error);
    process.exit(1);
  }

  console.log(`  Available: $${balance.data!.availableBalance.toFixed(2)}`);
  
  if (balance.data!.availableBalance < 2) {
    console.error('\n❌ Insufficient balance. Need at least $2.');
    process.exit(1);
  }
  console.log();

  // List available spot tokens
  console.log('🔍 Fetching available spot tokens...');
  const { InfoClient, HttpTransport } = await import('@nktkas/hyperliquid');
  const infoClient = new InfoClient({ transport: new HttpTransport({ isTestnet: false }) });
  const spotMeta = await infoClient.spotMeta();
  
  console.log(`  Found ${spotMeta.tokens.length} spot tokens:`);
  const tokens = spotMeta.tokens.slice(0, 10).map(t => t.name);
  console.log(`  ${tokens.join(', ')}`);
  console.log();

  // Pick first available token
  const tokenToBuy = spotMeta.tokens[0].name;
  
  // Execute spot trade
  console.log(`🪙 Buying $2 of ${tokenToBuy} (spot)...`);
  console.log(`  Token: ${tokenToBuy}`);
  console.log('  Market: Spot');
  console.log('  Side: Buy');
  console.log('  Size: $2');
  console.log();

  try {
    const result = await toolkit.openPosition({
      coin: tokenToBuy,
      market: 'spot',
      side: 'buy',
      sizeUsd: 2,
    });

    if (result.success) {
      console.log('✅ SPOT ORDER PLACED!');
      console.log(`  Order ID: ${result.data!.orderId}`);
      console.log();

      console.log('🎉 SPOT TRADE TEST SUCCESSFUL!');
      console.log();
      console.log('You now own GOLD tokens on Hyperliquid!');
      console.log();
      console.log('To check your spot balance:');
      console.log('  1. Go to https://app.hyperliquid.xyz/spot');
      console.log('  2. Look for GOLD in your balances');

    } else {
      console.log('❌ TRADE FAILED:', result.error);
      console.log();
      console.log('Possible reasons:');
      console.log('  - Insufficient balance');
      console.log('  - Token not found (check name: GOLD, HYPE, PURR, etc.)');
      console.log('  - Order size too small');
      console.log('  - Network error');
    }

  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
