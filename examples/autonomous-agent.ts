/**
 * Example: Autonomous agent using built-in framework
 * 
 * This agent runs continuously and makes trading decisions using GPT-4
 */

import { 
  HyperliquidAgentToolkit,
  HyperliquidAgent,
  OpenAIAdapter,
  EnvWallet,
  type AgentConfig
} from '../src/index.js';

async function main() {
  console.log('🤖 Starting Autonomous Hyperliquid Agent\n');

  // 1. Setup wallet (use env var for security)
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('HYPERLIQUID_PRIVATE_KEY not set');
  }
  
  const wallet = new EnvWallet(privateKey);
  console.log(`Wallet: ${wallet.address}\n`);

  // 2. Create toolkit with risk limits
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'testnet', // Use testnet for safety
    riskConfig: {
      maxLeverage: 3,
      maxPositionSizeUsd: 100,
      maxDailyLoss: 50,
      requireStopLoss: true,
      maxOpenPositions: 2,
    },
    defaultSlippagePercent: 1,
  });

  console.log('📊 Toolkit initialized with risk limits:');
  console.log('  - Max leverage: 3x');
  console.log('  - Max position size: $100');
  console.log('  - Max daily loss: $50');
  console.log('  - Stop-loss required: yes\n');

  // 3. Configure agent
  const config: AgentConfig = {
    name: 'Momentum Trader',
    instructions: `
You are a conservative momentum trading bot on Hyperliquid DEX.

Strategy:
- Trade BTC and ETH based on short-term momentum
- Enter positions when momentum is strong
- Always use 3% stop-loss and 6% take-profit
- Risk only 2% of account per trade
- Maximum 3x leverage
- Close positions when momentum reverses

Risk Management:
- Never exceed 2 open positions
- If daily loss reaches $50, stop trading
- Always set stop-loss orders
- Don't trade during high volatility (funding rate > 0.1%)

Decision Making:
1. Check current positions and account balance
2. Analyze market data (price, volume, funding)
3. Decide: open new position, close existing, or wait
4. Provide clear reasoning for each action
`.trim(),
    riskConfig: {
      maxLeverage: 3,
      maxPositionSizeUsd: 100,
      maxDailyLoss: 50,
      requireStopLoss: true,
      maxOpenPositions: 2,
    },
    intervalMs: 60_000, // Run every 1 minute
    maxActionsPerInterval: 2,
    paperTrading: true, // Set to false for real trading
  };

  // 4. Create model adapter
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const modelAdapter = new OpenAIAdapter({
    apiKey: openaiApiKey,
    model: 'gpt-4',
    temperature: 0.7,
  });

  // 5. Create and start agent
  const agent = new HyperliquidAgent(toolkit, config, modelAdapter);

  console.log('🚀 Starting autonomous agent...');
  console.log(`Mode: ${config.paperTrading ? 'PAPER TRADING' : 'LIVE TRADING'}`);
  console.log(`Interval: ${config.intervalMs}ms (${config.intervalMs / 1000}s)\n`);

  await agent.start();

  // 6. Monitor agent state
  setInterval(() => {
    const state = agent.getState();
    console.log('\n📈 Agent State:');
    console.log(`  Running: ${state.isRunning}`);
    console.log(`  Ticks: ${state.tickCount}`);
    console.log(`  Total trades: ${state.totalTrades}`);
    console.log(`  Total PnL: $${state.totalPnl.toFixed(2)}`);
    console.log(`  Daily PnL: $${state.dailyPnl.toFixed(2)}`);
    console.log(`  Errors: ${state.errors.length}`);
    
    if (state.errors.length > 0) {
      console.log('  Recent errors:');
      for (const err of state.errors.slice(-3)) {
        console.log(`    - ${err}`);
      }
    }

    // Show recent trades
    const logs = agent.getTradeLogs(5);
    if (logs.length > 0) {
      console.log('\n📝 Recent Trades:');
      for (const log of logs) {
        const status = log.success ? '✅' : '❌';
        console.log(`  ${status} ${log.action} ${log.coin} - ${log.reason || 'No reason'}`);
      }
    }
  }, 30_000); // Print state every 30 seconds

  // 7. Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down agent...');
    await agent.stop();
    
    const finalState = agent.getState();
    console.log('\n📊 Final Stats:');
    console.log(`  Total trades: ${finalState.totalTrades}`);
    console.log(`  Total PnL: $${finalState.totalPnl.toFixed(2)}`);
    console.log(`  Success rate: ${
      finalState.totalTrades > 0 
        ? ((agent.getTradeLogs().filter(l => l.success).length / finalState.totalTrades) * 100).toFixed(1) 
        : 0
    }%`);
    
    process.exit(0);
  });
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
