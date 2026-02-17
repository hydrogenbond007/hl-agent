# Two Ways to Use the Hyperliquid Agent SDK

This SDK is designed for **two distinct use cases**. Choose the one that fits your needs:

---

## Mode 1: All-in-One Agent Framework 🤖

**"I just want to write my trading strategy and run it."**

### What You Get
- Built-in agent orchestration
- LLM integration (OpenAI, Anthropic)
- Autonomous execution
- Monitoring and logging
- State management
- Error recovery

### When to Use This
- ✅ You want to write strategies, not infrastructure
- ✅ You're okay with using OpenAI/Anthropic
- ✅ You want autonomous execution
- ✅ You don't have an existing agent framework

### How It Works

**Step 1: Write Your Strategy (Plain English)**

```typescript
// strategy.ts
const STRATEGY = `
You are a BTC momentum trader.

RULES:
- Only trade BTC
- Enter long when price breaks 24h high with volume
- Use 3% stop loss and 6% take profit
- Max 2% risk per trade
- No trading if daily loss > $50

Be conservative.
`;
```

**Step 2: Configure & Run**

```typescript
import { 
  HyperliquidAgent, 
  HyperliquidAgentToolkit,
  OpenAIAdapter, 
  EnvWallet 
} from '@hyperliquid/agent-sdk';

// Setup
const wallet = new EnvWallet(process.env.PRIVATE_KEY!);
const toolkit = new HyperliquidAgentToolkit({ 
  wallet,
  riskConfig: {
    maxLeverage: 3,
    maxPositionSizeUsd: 100,
  }
});

// Create agent with your strategy
const agent = new HyperliquidAgent(
  toolkit,
  {
    name: "My Bot",
    instructions: STRATEGY,  // ← Your strategy!
    riskConfig: { maxLeverage: 3, maxPositionSizeUsd: 100 },
    intervalMs: 60_000, // Check every minute
  },
  new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! })
);

// Start!
await agent.start();
```

**Step 3: Monitor**

```typescript
// Check state
const state = agent.getState();
console.log(`Trades: ${state.totalTrades}, PnL: $${state.totalPnl}`);

// View logs
const logs = agent.getTradeLogs(10);
```

### Full Examples
- [One-file strategy](../examples/one-file-strategy.ts) - Complete example
- [Autonomous agent](../examples/autonomous-agent.ts) - With monitoring
- [Production setup](../examples/secure-production.ts) - With Turnkey wallet

### What's Included
```
Your Strategy (plain English)
         ↓
    Agent Framework ← We provide this
         ↓
    LLM Adapter (OpenAI/Anthropic) ← We provide this
         ↓
    Toolkit (trading operations) ← We provide this
         ↓
    Wallet (Turnkey/Privy) ← We provide this
         ↓
    Hyperliquid DEX
```

---

## Mode 2: Toolkit for Your Agent 🔧

**"I already have an agent framework. I just need Hyperliquid operations."**

### What You Get
- Clean, high-level Hyperliquid API
- Built-in risk management
- Secure wallet abstractions
- OpenAI function calling format
- Direct toolkit access

### When to Use This
- ✅ You have an existing agent (LangChain, CrewAI, custom)
- ✅ You want full control over orchestration
- ✅ You need Hyperliquid-specific operations
- ✅ You might not even use an LLM

### Option A: With Your LLM Framework

```typescript
import { 
  HyperliquidAgentToolkit, 
  getToolDefinitions,
  executeTool
} from '@hyperliquid/agent-sdk';

// Setup toolkit
const toolkit = new HyperliquidAgentToolkit({ wallet });

// Get tool definitions for your framework
const tools = getToolDefinitions();

// Use with LangChain
import { ChatOpenAI } from '@langchain/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';

const llm = new ChatOpenAI({ modelName: 'gpt-4' });
const executor = await initializeAgentExecutorWithOptions(
  tools,  // ← Our tools
  llm,
  { agentType: 'openai-functions' }
);

// Run your agent
await executor.call({ input: "What's the BTC price?" });

// When tools are called, route to our toolkit:
await executeTool(toolName, params, toolkit);
```

### Option B: Custom Logic (No LLM)

```typescript
import { HyperliquidAgentToolkit } from '@hyperliquid/agent-sdk';

const toolkit = new HyperliquidAgentToolkit({ wallet });

// Your own logic - technical indicators, ML models, etc.
async function myStrategy() {
  const markets = await toolkit.getMarketData({ coins: ['BTC'] });
  const btc = markets.data![0];
  
  // Your logic here
  const shouldBuy = myCustomIndicator(btc);
  
  if (shouldBuy) {
    await toolkit.openPosition({
      coin: 'BTC',
      side: 'long',
      sizeUsd: 100,
      stopLossPercent: 3,
    });
  }
}

// Run on your own schedule
setInterval(myStrategy, 60_000);
```

### Option C: Direct API Calls

```typescript
// No agent, just clean API
const toolkit = new HyperliquidAgentToolkit({ wallet });

// Get data
const markets = await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });
const positions = await toolkit.getPositions();
const balance = await toolkit.getBalance();

// Trade
await toolkit.openPosition({
  coin: 'BTC',
  side: 'long',
  sizeUsd: 100,
  stopLossPercent: 3,
  takeProfitPercent: 6,
});

// Close
await toolkit.closePosition({ coin: 'BTC' });
```

### Full Examples
- [Custom logic](../examples/custom-logic-strategy.ts) - No LLM
- [LangChain integration](../examples/langchain-integration.ts) - With framework
- [Simple trader](../examples/simple-trader.ts) - Direct API

### What's Included
```
Your Agent Framework
         ↓
    Toolkit (trading operations) ← We provide this
         ↓
    Wallet (Turnkey/Privy) ← We provide this
         ↓
    Hyperliquid DEX
```

---

## Comparison

| Feature | Mode 1: Agent Framework | Mode 2: Toolkit Only |
|---------|-------------------------|----------------------|
| **Agent orchestration** | ✅ Built-in | ❌ You handle |
| **LLM integration** | ✅ OpenAI/Anthropic | ❌ You handle (or none) |
| **Trading operations** | ✅ Included | ✅ Included |
| **Risk management** | ✅ Included | ✅ Included |
| **Wallet abstraction** | ✅ Included | ✅ Included |
| **Monitoring/logging** | ✅ Built-in | ❌ You implement |
| **Autonomous execution** | ✅ Built-in | ❌ You implement |
| **Flexibility** | 🟡 Opinionated | ✅ Full control |
| **Setup complexity** | ✅ Simple | 🟡 More work |
| **Best for** | Quick start, strategies | Custom agents, integration |

---

## Can I Mix Both Modes?

**Yes!** You can use the toolkit directly even if you're using the agent framework:

```typescript
// Use the agent framework
const agent = new HyperliquidAgent(toolkit, config, modelAdapter);
await agent.start();

// But also access the toolkit directly
const markets = await toolkit.getMarketData({ coins: ['BTC'] });

// Or execute specific actions manually
await agent.stop();
await toolkit.closePosition({ coin: 'BTC' }); // Manual override
await agent.start();
```

---

## Which Mode Should I Choose?

### Choose **Mode 1 (Agent Framework)** if:
- 🎯 You want to get started quickly
- 📝 You want to write strategies in plain English
- 🤖 You're okay with OpenAI/Anthropic
- 🚀 You want autonomous execution out of the box
- 📊 You want built-in monitoring and logging

### Choose **Mode 2 (Toolkit Only)** if:
- 🔧 You have an existing agent framework
- 🎛️ You want full control over orchestration
- 💻 You want to write custom logic in TypeScript
- 🧩 You're integrating with LangChain/CrewAI/etc.
- 🔬 You don't need an LLM at all

---

## Both Modes Share

Regardless of which mode you choose, you get:

✅ **Secure Wallets**
- Turnkey MPC
- Privy embedded wallets
- KMS support

✅ **Risk Management**
- Position size limits
- Leverage caps
- Stop-loss enforcement
- Daily loss tracking

✅ **Trading Operations**
- Market data
- Position management
- Order execution
- Balance tracking

✅ **Production Features**
- Error handling
- Rate limiting
- Transaction logging
- State recovery

---

## Next Steps

### For Mode 1 (Agent Framework):
1. Read [One-File Strategy Example](../examples/one-file-strategy.ts)
2. Read [Quickstart Guide](./QUICKSTART.md)
3. Check [Agent Configuration](./API.md#agent-configuration)

### For Mode 2 (Toolkit Only):
1. Read [Custom Logic Example](../examples/custom-logic-strategy.ts)
2. Read [Toolkit API Reference](./API.md#toolkit-api)
3. Check [Integration Guide](./ARCHITECTURE.md#integration-layer)

### For Both:
- [Wallet Setup](./WALLETS.md)
- [Security Best Practices](./SECURITY.md)
- [Architecture Overview](./ARCHITECTURE.md)
