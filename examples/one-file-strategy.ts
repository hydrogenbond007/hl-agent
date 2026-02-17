/**
 * ONE-FILE TRADING STRATEGY EXAMPLE
 * 
 * This shows the simplest way to use the SDK:
 * 1. Write your trading logic in one file
 * 2. Run it: npx tsx examples/one-file-strategy.ts
 * 3. That's it!
 */

import { 
  HyperliquidAgentToolkit,
  HyperliquidAgent,
  OpenAIAdapter,
  EnvWallet 
} from '../src/index.js';

/**
 * YOUR TRADING STRATEGY
 * 
 * Write your strategy as plain English instructions.
 * The AI agent will execute based on these rules.
 */
const STRATEGY = `
You are a BTC momentum trading bot.

ENTRY RULES:
- Only trade BTC
- Enter long when price > 24h high and volume increasing
- Enter short when price < 24h low and volume increasing
- Use 3x leverage maximum
- Position size: 2% of account balance

EXIT RULES:
- Use 3% stop loss (always required)
- Use 6% take profit
- Exit if momentum reverses (volume drops significantly)

RISK MANAGEMENT:
- Max 1 position at a time
- No trading if daily loss > $50
- No trading during high volatility (funding rate > 0.1%)

Be conservative. Safety first.
`.trim();

/**
 * CONFIGURATION
 * 
 * Set your risk limits here.
 */
const CONFIG = {
  // Agent settings
  name: 'BTC Momentum Bot',
  checkInterval: 60_000, // Check every 1 minute
  
  // Risk limits
  maxLeverage: 3,
  maxPositionSizeUsd: 100,
  maxDailyLoss: 50,
  
  // Trading settings
  network: 'testnet' as const, // Start with testnet!
  paperTrading: true, // Set false for real trading
};

/**
 * MAIN - DON'T NEED TO CHANGE THIS
 */
async function main() {
  console.log(`🤖 Starting ${CONFIG.name}\n`);
  
  // Setup wallet
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Set HYPERLIQUID_PRIVATE_KEY in .env file');
  }
  
  const wallet = new EnvWallet(privateKey);
  console.log(`Wallet: ${wallet.address}`);
  console.log(`Network: ${CONFIG.network}`);
  console.log(`Mode: ${CONFIG.paperTrading ? 'PAPER TRADING' : 'LIVE TRADING'}\n`);

  // Setup toolkit with your risk limits
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: CONFIG.network,
    riskConfig: {
      maxLeverage: CONFIG.maxLeverage,
      maxPositionSizeUsd: CONFIG.maxPositionSizeUsd,
      maxDailyLoss: CONFIG.maxDailyLoss,
      requireStopLoss: true,
      maxOpenPositions: 1,
    },
  });

  // Setup LLM adapter
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('Set OPENAI_API_KEY in .env file');
  }

  const modelAdapter = new OpenAIAdapter({
    apiKey: openaiKey,
    model: 'gpt-4',
    temperature: 0.7,
  });

  // Create agent with your strategy
  const agent = new HyperliquidAgent(
    toolkit,
    {
      name: CONFIG.name,
      instructions: STRATEGY, // ← Your strategy here!
      riskConfig: {
        maxLeverage: CONFIG.maxLeverage,
        maxPositionSizeUsd: CONFIG.maxPositionSizeUsd,
        maxDailyLoss: CONFIG.maxDailyLoss,
        requireStopLoss: true,
        maxOpenPositions: 1,
      },
      intervalMs: CONFIG.checkInterval,
      maxActionsPerInterval: 2,
      paperTrading: CONFIG.paperTrading,
    },
    modelAdapter
  );

  // Start agent
  console.log('🚀 Agent starting...\n');
  await agent.start();

  // Monitor state every 30 seconds
  setInterval(() => {
    const state = agent.getState();
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Status: ${state.isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}`);
    console.log(`Ticks: ${state.tickCount} | Trades: ${state.totalTrades}`);
    console.log(`PnL: $${state.totalPnl.toFixed(2)} (today: $${state.dailyPnl.toFixed(2)})`);
    
    const logs = agent.getTradeLogs(3);
    if (logs.length > 0) {
      console.log('\nRecent trades:');
      logs.forEach(log => {
        const icon = log.success ? '✅' : '❌';
        console.log(`  ${icon} ${log.action} ${log.coin}`);
      });
    }
    console.log('='.repeat(50));
  }, 30_000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await agent.stop();
    
    const state = agent.getState();
    console.log(`\n📈 Final Stats:`);
    console.log(`  Trades: ${state.totalTrades}`);
    console.log(`  PnL: $${state.totalPnl.toFixed(2)}`);
    
    process.exit(0);
  });
}

/**
 * RUN IT
 */
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

/**
 * USAGE:
 * 
 * 1. Create .env file:
 *    HYPERLIQUID_PRIVATE_KEY=0x...
 *    OPENAI_API_KEY=sk-...
 * 
 * 2. Run:
 *    npx tsx examples/one-file-strategy.ts
 * 
 * 3. Monitor and stop with Ctrl+C
 * 
 * THAT'S IT! Your strategy is running.
 */
