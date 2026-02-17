# Quick Start Guide

Get started with the Hyperliquid Agent SDK in 5 minutes.

## Installation

```bash
npm install @hyperliquid/agent-sdk
```

## Basic Usage

### 1. Simple Trading Bot

```typescript
import { 
  HyperliquidAgentToolkit,
  EnvWallet 
} from '@hyperliquid/agent-sdk';

// Create wallet (testnet for safety)
const wallet = new EnvWallet(process.env.PRIVATE_KEY!);

// Create toolkit
const toolkit = new HyperliquidAgentToolkit({
  wallet,
  network: 'testnet',
  riskConfig: {
    maxLeverage: 5,
    maxPositionSizeUsd: 100,
  }
});

// Get market data
const markets = await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });
console.log(markets);

// Open a position
const result = await toolkit.openPosition({
  coin: 'BTC',
  side: 'long',
  sizeUsd: 50,
  stopLossPercent: 3,
  takeProfitPercent: 6
});

console.log(result);
```

### 2. Autonomous Agent

```typescript
import { 
  HyperliquidAgentToolkit,
  HyperliquidAgent,
  OpenAIAdapter,
  EnvWallet 
} from '@hyperliquid/agent-sdk';

const wallet = new EnvWallet(process.env.PRIVATE_KEY!);
const toolkit = new HyperliquidAgentToolkit({ wallet });

const agent = new HyperliquidAgent(
  toolkit,
  {
    name: "My Bot",
    instructions: "Trade BTC conservatively, 2% risk per trade",
    riskConfig: {
      maxLeverage: 3,
      maxPositionSizeUsd: 100,
    },
    intervalMs: 60000, // 1 minute
  },
  new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!
  })
);

// Start autonomous execution
await agent.start();

// Monitor state
setInterval(() => {
  const state = agent.getState();
  console.log(`Trades: ${state.totalTrades}, PnL: $${state.totalPnl}`);
}, 30000);
```

### 3. LangChain Integration

```typescript
import { 
  HyperliquidAgentToolkit,
  getToolDefinitions,
  executeTool 
} from '@hyperliquid/agent-sdk';

const toolkit = new HyperliquidAgentToolkit({ wallet });
const tools = getToolDefinitions();

// Use tools with any LLM framework
// OpenAI, LangChain, LlamaIndex, etc.

// Direct execution
const result = await executeTool('get_markets', { coins: ['BTC'] }, toolkit);
```

## Wallet Options

### Development (Environment Variable)

```typescript
import { EnvWallet } from '@hyperliquid/agent-sdk';

const wallet = new EnvWallet(process.env.PRIVATE_KEY!);
```

⚠️ **Not for production!** Private keys in env vars are insecure.

### Production (Turnkey MPC)

```typescript
import { TurnkeyWallet } from '@hyperliquid/agent-sdk';

const wallet = new TurnkeyWallet({
  organizationId: process.env.TURNKEY_ORG_ID!,
  privateKeyId: process.env.TURNKEY_KEY_ID!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE!,
});

await wallet.initialize();
```

### Production (Privy Embedded Wallets)

```typescript
import { PrivyWallet } from '@hyperliquid/agent-sdk';

const wallet = new PrivyWallet({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
  userId: 'user-123',
  walletAddress: '0x...', // For now
});

await wallet.initialize();
```

## Risk Management

Always set risk limits:

```typescript
const toolkit = new HyperliquidAgentToolkit({
  wallet,
  riskConfig: {
    maxLeverage: 5,              // Max 5x leverage
    maxPositionSizeUsd: 1000,    // Max $1000 per position
    maxDailyLoss: 500,           // Stop if lose $500 in a day
    requireStopLoss: true,       // Force stop-loss on all trades
    maxOpenPositions: 3,         // Max 3 concurrent positions
  }
});
```

## Environment Variables

Create a `.env` file:

```bash
# Development (testnet)
HYPERLIQUID_PRIVATE_KEY=0x...
OPENAI_API_KEY=sk-...

# Production (mainnet)
TURNKEY_ORG_ID=...
TURNKEY_KEY_ID=...
TURNKEY_API_PUBLIC=...
TURNKEY_API_PRIVATE=...
VAULT_MASTER_KEY=... # For AgentVault
```

## Examples

Run the included examples:

```bash
# Simple trading bot
npm run example:simple

# Autonomous agent with GPT-4
npm run example:autonomous

# LangChain integration
npm run example:langchain

# Production setup with Turnkey
npm run example:production
```

## Next Steps

- **Read the [Architecture](./ARCHITECTURE.md)** for in-depth understanding
- **Check [examples/](../examples/)** for more use cases
- **See [API.md](./API.md)** for complete API reference
- **Review [SECURITY.md](./SECURITY.md)** before production deployment

## Common Patterns

### Pattern 1: Direct Control (No LLM)

```typescript
// Implement your own logic
const markets = await toolkit.getMarketData({ coins: ['BTC'] });
const btcPrice = markets.data![0].price;

if (btcPrice < 50000) {
  await toolkit.openPosition({
    coin: 'BTC',
    side: 'long',
    sizeUsd: 100,
    stopLossPercent: 3
  });
}
```

### Pattern 2: Built-in Agent Framework

```typescript
// Let the agent make decisions
const agent = new HyperliquidAgent(toolkit, config, modelAdapter);
await agent.start();
```

### Pattern 3: External Framework Integration

```typescript
// Use with LangChain, CrewAI, AutoGPT, etc.
const tools = getToolDefinitions();
// Pass tools to your framework
```

## Troubleshooting

### "Wallet not initialized"

Make sure to call `await wallet.initialize()` for MPC wallets:

```typescript
const wallet = new TurnkeyWallet(config);
await wallet.initialize(); // Required!
```

### "Risk check failed"

Your position exceeds risk limits. Adjust `riskConfig` or reduce position size:

```typescript
riskConfig: {
  maxPositionSizeUsd: 1000, // Increase this
  maxLeverage: 10,           // Or increase this
}
```

### "OpenAI package not installed"

Install optional peer dependencies:

```bash
npm install openai @anthropic-ai/sdk
```

## Support

- **Issues:** https://github.com/your-org/agent-sdk/issues
- **Discord:** https://discord.gg/your-server
- **Docs:** https://docs.hyperliquid.xyz

Happy trading! 🚀
