# Hyperliquid Agent SDK

**The easiest way to build AI trading agents on Hyperliquid DEX.**

## Two Ways to Use This SDK

### 1. **Write Your Strategy, We Handle the Rest** 📝
```typescript
// Write your strategy in plain English
const STRATEGY = `Trade BTC conservatively. Use 3% stop-loss always.`;

// Run it
const agent = new HyperliquidAgent(toolkit, { instructions: STRATEGY }, llm);
await agent.start();
```
→ [See one-file example](./examples/one-file-strategy.ts)

### 2. **Use Our Toolkit in Your Agent** 🔌
```typescript
// Integrate with your existing agent framework
import { HyperliquidAgentToolkit } from '@hyperliquid/agent-sdk';

const toolkit = new HyperliquidAgentToolkit({ wallet });
// Use with LangChain, CrewAI, custom logic, etc.
```
→ [See integration example](./examples/langchain-integration.ts)

## Why This SDK?

- ✅ **Write strategies in plain English** (or custom TypeScript)
- ✅ **Secure wallet management** (Turnkey MPC, Privy, not just env vars)
- ✅ **Built-in risk management** (position limits, stop-loss enforcement)
- ✅ **Production-ready** (error handling, logging, monitoring)
- ✅ **Works with any LLM** (OpenAI, Anthropic, or bring your own)

## Features

### 🔐 Multiple Wallet Types (All with Same Interface)

```typescript
// Development
const wallet = new EnvWallet(process.env.PRIVATE_KEY);

// Cloud KMS
const wallet = new KMSWallet({ provider: 'aws', keyId: '...' });

// MPC Providers
const wallet = new TurnkeyWallet({ organizationId: '...', ... });
const wallet = new FireblocksWallet({ vaultAccountId: '...', ... });
const wallet = new PrivyWallet({ appId: '...', userId: '...' });

// Hardware (coming soon)
const wallet = new HardwareWallet({ type: 'ledger', path: "m/44'/60'/0'/0/0" });
```

### 🎯 High-Level Trading Actions
```typescript
const toolkit = new HyperliquidAgentToolkit({
  wallet,
  network: 'mainnet',
  riskConfig: {
    maxLeverage: 10,
    maxPositionSizeUsd: 1000,
    maxDailyLoss: 500
  }
});

// Pre-built actions for AI agents
await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });
await toolkit.openPosition({ 
  coin: 'BTC', 
  side: 'long', 
  sizeUsd: 100,
  stopLossPercent: 5,
  takeProfitPercent: 10
});
await toolkit.checkPosition({ coin: 'BTC' });
```

### 🤖 Built-in Agent Framework

```typescript
import { HyperliquidAgent, OpenAIAdapter } from '@hyperliquid/agent-sdk';

const agent = new HyperliquidAgent(
  toolkit,
  {
    name: "Momentum Trader",
    instructions: "Trade BTC based on momentum. 2% risk per trade.",
    riskConfig: { maxLeverage: 5, maxPositionSizeUsd: 1000 },
    intervalMs: 60000, // Run every minute
  },
  new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY })
);

// Fully autonomous
await agent.start();
```

**Supported Models:**
- ✅ OpenAI (GPT-4, GPT-3.5)
- ✅ Anthropic (Claude 3.5 Sonnet)
- ✅ Custom model adapters
- 🔄 Google Gemini (coming soon)
- 🔄 Local models via Ollama (coming soon)

**Security Features:**
- ✅ Encrypted secret storage (`AgentVault`)
- ✅ TEE support (Intel SGX, AWS Nitro, AMD SEV)
- ✅ MPC wallet integration

## Installation

```bash
npm install @hyperliquid/agent-sdk

# Optional peer dependencies (install what you need)
npm install openai              # For OpenAI models
npm install @anthropic-ai/sdk   # For Claude
npm install langchain           # For LangChain integration
```

## Quick Start

**⚡ Get started in 5 minutes:** [Quick Start Guide](./docs/QUICKSTART.md)

### 1. Basic Trading
```typescript
import { HyperliquidAgentToolkit, EnvWallet } from '@hyperliquid/agent-sdk';

const wallet = new EnvWallet(process.env.PRIVATE_KEY);
const toolkit = new HyperliquidAgentToolkit({ wallet });

// Get market data
const markets = await toolkit.getMarketData({ coins: ['BTC'] });

// Open a position with stop-loss and take-profit
const result = await toolkit.openPosition({
  coin: 'BTC',
  side: 'long',
  sizeUsd: 100,
  stopLossPercent: 3,
  takeProfitPercent: 6
});
```

### 2. AI Agent
```typescript
import { HyperliquidAgent } from '@hyperliquid/agent-sdk';
import OpenAI from 'openai';

const agent = new HyperliquidAgent({
  name: "My Trading Bot",
  model: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  toolkit,
  instructions: "Trade BTC based on momentum. Use 2% risk per trade."
});

await agent.start();
```

## Architecture

```
agent-sdk/
├── src/
│   ├── wallets/          # Secure wallet implementations
│   ├── toolkit/          # High-level trading actions
│   ├── agent/            # Agent orchestration
│   ├── safety/           # Risk management
│   └── types/            # TypeScript types
├── examples/             # Example bots
└── docs/                 # Documentation
```

## Security Best Practices

### ❌ Don't Do This
```typescript
// Insecure: Private key in code
const wallet = new EnvWallet("0x1234...");

// Insecure: No risk limits
const toolkit = new HyperliquidAgentToolkit({ wallet });
```

### ✅ Do This
```typescript
// Secure: Use KMS for production
const wallet = new KMSWallet({
  provider: 'aws',
  keyId: process.env.KMS_KEY_ID
});

// Safe: Always set risk limits
const toolkit = new HyperliquidAgentToolkit({
  wallet,
  riskConfig: {
    maxLeverage: 5,
    maxPositionSizeUsd: 1000,
    maxDailyLoss: 500
  }
});
```

## Use Cases

### Autonomous Trading Agents
Run fully autonomous bots that analyze markets and trade 24/7:
```bash
npm run example:autonomous
```

### Custom Trading Logic
Integrate the toolkit into your existing strategies:
```bash
npm run example:simple
```

### LangChain/Multi-Agent Systems
Use Hyperliquid tools in complex agent workflows:
```bash
npm run example:langchain
```

### Production Deployment
Enterprise security with Turnkey, TEE, and monitoring:
```bash
npm run example:production
```

See [examples/](./examples) for complete code.

## Documentation

- **[Quick Start](./docs/QUICKSTART.md)** - Get started in 5 minutes
- **[Architecture](./docs/ARCHITECTURE.md)** - In-depth design and patterns
- **[API Reference](./docs/API.md)** - Complete API documentation
- **[OpenAI Integration](./docs/OPENAI_INTEGRATION.md)** - Tool schema + execution wiring
- **[Security Best Practices](./docs/SECURITY.md)** - Production deployment guide
- **[Contributing](./CONTRIBUTING.md)** - How to contribute

## Comparison with Other Frameworks

| Framework | Purpose | Hyperliquid Integration |
|-----------|---------|------------------------|
| **LangChain** | General agent framework | ✅ Use toolkit as LangChain tools |
| **CrewAI** | Multi-agent orchestration | ✅ Use toolkit with CrewAI agents |
| **AutoGPT** | Autonomous GPT-4 agent | ✅ Integrate as custom tools |
| **This SDK** | **Hyperliquid-native agents** | ✅ **Built-in, optimized, production-ready** |

**Why use this SDK?**
- 🎯 **Purpose-built** for Hyperliquid (not a general framework)
- 🔒 **Security-first** design with MPC/KMS/TEE support
- 🛡️ **Trading-specific** risk management
- 📦 **Batteries included** - no glue code needed
- ⚡ **Faster** - native integration, no abstraction overhead

**When to use LangChain/CrewAI instead?**
- Multi-step workflows beyond trading
- Need to integrate multiple tools/APIs
- Complex agent coordination
- ➡️ **Best of both worlds:** Use this SDK as tools within LangChain/CrewAI!

## License

MIT

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

Built with ❤️ for the Hyperliquid ecosystem
