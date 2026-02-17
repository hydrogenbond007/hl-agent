/**
 * Run autonomous agent + local web dashboard.
 * Open http://127.0.0.1:8787 to monitor trades and PnL.
 */

import {
  EnvWallet,
  HyperliquidAgentToolkit,
  HyperliquidAgent,
  OpenAIAdapter,
  startAgentMonitorServer,
  type AgentConfig,
} from '../src/index.js';

async function main() {
  const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!privateKey) throw new Error('HYPERLIQUID_PRIVATE_KEY not set');
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY not set');

  const wallet = new EnvWallet(privateKey);
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'mainnet',
    riskConfig: {
      maxLeverage: 3,
      maxPositionSizeUsd: 25,
      maxDailyLoss: 20,
      maxOpenPositions: 2,
    },
    defaultSlippagePercent: 1,
  });

  const config: AgentConfig = {
    name: 'Monitor Trader',
    instructions: [
      'Trade only BTC and ETH.',
      'Be conservative: default to no trade when uncertain.',
      'Use small sizes and avoid overtrading.',
      'If a position exists and signal weakens, reduce risk or close.',
    ].join(' '),
    riskConfig: {
      maxLeverage: 3,
      maxPositionSizeUsd: 25,
      maxDailyLoss: 20,
      maxOpenPositions: 2,
    },
    intervalMs: 60_000,
    maxActionsPerInterval: 2,
    paperTrading: true,
  };

  const adapter = new OpenAIAdapter({
    apiKey: openaiApiKey,
    model: 'gpt-4o-mini',
    temperature: 0.3,
  });

  const agent = new HyperliquidAgent(toolkit, config, adapter);
  const monitor = await startAgentMonitorServer({
    agent,
    toolkit,
    port: 8787,
    host: '127.0.0.1',
    refreshMs: 2_000,
  });

  console.log(`Dashboard: http://127.0.0.1:${monitor.port}`);
  console.log(`Mode: ${config.paperTrading ? 'PAPER' : 'LIVE'}`);
  console.log('Starting agent...');
  await agent.start();

  const shutdown = async () => {
    console.log('\nStopping...');
    await agent.stop();
    await monitor.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
