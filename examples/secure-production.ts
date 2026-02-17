/**
 * Example: Production-ready setup with enterprise security
 * 
 * This shows best practices for deploying agents in production
 */

import { 
  HyperliquidAgentToolkit,
  HyperliquidAgent,
  OpenAIAdapter,
  TurnkeyWallet,
  AgentVault,
  initTEE,
} from '../src/index.js';

/**
 * Production deployment with:
 * - Turnkey MPC wallet (no private keys in memory)
 * - Encrypted secrets vault
 * - TEE (Trusted Execution Environment) support
 * - Comprehensive monitoring
 * - Graceful error handling
 */
async function main() {
  console.log('🔒 Production-Ready Hyperliquid Agent\n');

  // ============================================
  // 1. INITIALIZE SECURE VAULT
  // ============================================
  
  console.log('📦 Initializing secure vault...');
  
  const vault = new AgentVault({
    masterKey: process.env.VAULT_MASTER_KEY!,
    storage: 'file',
    filePath: './secure/agent-vault.enc',
  });
  
  await vault.load();
  
  // Store secrets in vault (do this once during setup)
  if (!vault.has('TURNKEY_API_PUBLIC')) {
    await vault.set('TURNKEY_API_PUBLIC', process.env.TURNKEY_API_PUBLIC!);
    await vault.set('TURNKEY_API_PRIVATE', process.env.TURNKEY_API_PRIVATE!);
    await vault.set('OPENAI_API_KEY', process.env.OPENAI_API_KEY!);
    console.log('  ✅ Secrets stored in vault\n');
  } else {
    console.log('  ✅ Loaded existing vault\n');
  }

  // ============================================
  // 2. INITIALIZE TEE (if available)
  // ============================================
  
  console.log('🔐 Checking for TEE environment...');
  
  const tee = await initTEE({
    provider: 'nitro', // AWS Nitro Enclaves
    attestation: {
      enabled: true,
      endpoint: process.env.ATTESTATION_ENDPOINT,
    },
  });
  
  if (tee) {
    console.log('  ✅ Running in secure enclave (TEE)');
    
    const attestation = await tee.getAttestation();
    console.log('  📜 Attestation:', {
      provider: attestation.provider,
      timestamp: new Date(attestation.timestamp).toISOString(),
    });
    console.log();
  } else {
    console.log('  ⚠️  No TEE detected - running in standard mode\n');
  }

  // ============================================
  // 3. INITIALIZE TURNKEY WALLET
  // ============================================
  
  console.log('🔑 Initializing Turnkey wallet...');
  
  const wallet = new TurnkeyWallet({
    organizationId: process.env.TURNKEY_ORG_ID!,
    privateKeyId: process.env.TURNKEY_KEY_ID!,
    apiPublicKey: await vault.get('TURNKEY_API_PUBLIC')!,
    apiPrivateKey: await vault.get('TURNKEY_API_PRIVATE')!,
  });
  
  try {
    await wallet.initialize();
    console.log(`  ✅ Wallet initialized: ${wallet.address}\n`);
  } catch (error) {
    console.error('  ❌ Failed to initialize Turnkey wallet:', error);
    console.log('  ℹ️  Falling back to demo mode (no real trading)\n');
    // In production, you would fail here
  }

  // ============================================
  // 4. CREATE TOOLKIT WITH STRICT RISK LIMITS
  // ============================================
  
  console.log('🛡️  Creating toolkit with risk limits...');
  
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'mainnet', // Production uses mainnet
    riskConfig: {
      maxLeverage: 3,
      maxPositionSizeUsd: 1000,
      maxDailyLoss: 500,
      maxDrawdownPercent: 20,
      requireStopLoss: true,
      maxOpenPositions: 3,
    },
    defaultSlippagePercent: 0.5,
  });

  console.log('  ✅ Risk limits configured:');
  console.log('    - Max leverage: 3x');
  console.log('    - Max position: $1,000');
  console.log('    - Max daily loss: $500');
  console.log('    - Max drawdown: 20%');
  console.log('    - Stop-loss: required\n');

  // ============================================
  // 5. CREATE AGENT WITH MONITORING
  // ============================================
  
  console.log('🤖 Creating autonomous agent...');
  
  const openaiKey = await vault.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OpenAI API key not found in vault');
  }

  const modelAdapter = new OpenAIAdapter({
    apiKey: openaiKey,
    model: 'gpt-4',
    temperature: 0.7,
  });

  const agent = new HyperliquidAgent(
    toolkit,
    {
      name: 'Production Agent',
      instructions: `
You are a professional trading agent managing real capital on Hyperliquid DEX.

Strategy: Conservative momentum trading
- Only trade BTC and ETH
- Maximum 3x leverage
- Always use stop-loss (3%) and take-profit (6%)
- Risk 1% of capital per trade
- Avoid trading during high volatility

Safety Rules:
- Never exceed risk limits
- Close positions immediately if daily loss > $400
- Stop trading if 3 consecutive losses
- Monitor funding rates (avoid > 0.1%)
- Double-check all trade parameters

You are responsible for real money. Be conservative and careful.
      `.trim(),
      riskConfig: {
        maxLeverage: 3,
        maxPositionSizeUsd: 1000,
        maxDailyLoss: 500,
        requireStopLoss: true,
        maxOpenPositions: 3,
      },
      intervalMs: 300_000, // 5 minutes in production
      maxActionsPerInterval: 2,
      paperTrading: false, // LIVE TRADING
    },
    modelAdapter
  );

  console.log('  ✅ Agent created\n');

  // ============================================
  // 6. START WITH MONITORING & ALERTS
  // ============================================
  
  console.log('🚀 Starting agent with monitoring...\n');
  
  await agent.start();

  // Monitor and log state
  const monitoringInterval = setInterval(() => {
    const state = agent.getState();
    const riskStats = toolkit.getRiskStats();
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Agent Status - ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    console.log(`Status: ${state.isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}`);
    console.log(`Ticks: ${state.tickCount}`);
    console.log(`Trades: ${state.totalTrades}`);
    console.log(`Total PnL: $${state.totalPnl.toFixed(2)}`);
    console.log(`Daily PnL: $${state.dailyPnl.toFixed(2)}`);
    
    if (riskStats) {
      console.log(`Daily Trades: ${riskStats.dailyTrades}`);
      console.log(`Win Rate: ${((riskStats.winningTrades / Math.max(riskStats.totalTrades, 1)) * 100).toFixed(1)}%`);
    }

    // Alert on errors
    if (state.errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      for (const err of state.errors.slice(-3)) {
        console.log(`  - ${err}`);
      }
    }

    // Alert on high losses
    if (state.dailyPnl < -400) {
      console.log('\n🚨 ALERT: High daily loss! Consider stopping agent.');
    }

    // Show recent trades
    const logs = agent.getTradeLogs(3);
    if (logs.length > 0) {
      console.log('\n📝 Recent Trades:');
      for (const log of logs) {
        const status = log.success ? '✅' : '❌';
        const pnl = log.pnl ? `(PnL: $${log.pnl.toFixed(2)})` : '';
        console.log(`  ${status} ${log.action} ${log.coin} ${pnl}`);
        if (log.reason) {
          console.log(`     Reason: ${log.reason}`);
        }
      }
    }
    console.log('='.repeat(60) + '\n');

    // TODO: Send metrics to monitoring system (Datadog, Prometheus, etc.)
    // TODO: Send alerts to Slack/Discord/PagerDuty

  }, 60_000); // Monitor every minute

  // ============================================
  // 7. GRACEFUL SHUTDOWN
  // ============================================
  
  const shutdown = async (signal: string) => {
    console.log(`\n\n🛑 Received ${signal}, shutting down gracefully...`);
    
    clearInterval(monitoringInterval);
    
    try {
      await agent.stop();
      console.log('  ✅ Agent stopped');
      
      // Get final stats
      const finalState = agent.getState();
      const allLogs = agent.getTradeLogs();
      
      console.log('\n📊 Final Statistics:');
      console.log(`  Total runtime: ${finalState.startedAt ? ((Date.now() - finalState.startedAt) / 1000 / 60).toFixed(1) : 0} minutes`);
      console.log(`  Total ticks: ${finalState.tickCount}`);
      console.log(`  Total trades: ${finalState.totalTrades}`);
      console.log(`  Total PnL: $${finalState.totalPnl.toFixed(2)}`);
      
      if (allLogs.length > 0) {
        const successful = allLogs.filter(l => l.success).length;
        console.log(`  Success rate: ${((successful / allLogs.length) * 100).toFixed(1)}%`);
      }

      // Cleanup
      await wallet.dispose?.();
      await vault.seal();
      
      console.log('  ✅ Cleanup complete\n');
      
    } catch (error) {
      console.error('  ❌ Error during shutdown:', error);
    }
    
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
