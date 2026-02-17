# Hyperliquid Agent SDK - Architecture

## Overview

The Hyperliquid Agent SDK is designed to make building autonomous trading agents on Hyperliquid DEX **secure, simple, and production-ready**. It provides:

1. **Multi-wallet support** with enterprise-grade security
2. **Clean agentic APIs** compatible with any LLM framework
3. **Dual execution modes**: Built-in agent framework + external SDK integration
4. **TEE support** for secure enclave execution
5. **Built-in risk management** and safety guardrails

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (Your Trading Bot / Agent / Integration)                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Framework Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ HyperliquidAgent│ OpenAIAdapter │ AnthropicAdapter│      │
│  │  (Autonomous)   │ (GPT-4, etc.) │ (Claude, etc.)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Integration Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ OpenAI Tools │  │  LangChain   │  │  CrewAI      │      │
│  │ (Functions)  │  │  Integration │  │  Integration │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Toolkit Layer                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │         HyperliquidAgentToolkit                    │     │
│  │  - getMarketData()    - openPosition()             │     │
│  │  - getPositions()     - closePosition()            │     │
│  │  - getBalance()       - cancelOrders()             │     │
│  │  - getOrderBook()                                  │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Safety & Security Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ RiskManager  │  │  AgentVault  │  │  TEE Support │      │
│  │ (Guardrails) │  │  (Secrets)   │  │  (Enclaves)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Wallet Layer                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │   Env    │ │   KMS    │ │   MPC    │ │ Hardware │       │
│  │  Wallet  │ │  Wallet  │ │  Wallet  │ │  Wallet  │       │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤       │
│  │Dev/Basic │ │AWS/GCP/  │ │Privy/    │ │ Ledger/  │       │
│  │          │ │  Azure   │ │Turnkey/  │ │  Trezor  │       │
│  │          │ │          │ │Fireblocks│ │          │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Hyperliquid DEX (@nktkas/hyperliquid)          │
│  ┌────────────────┐           ┌────────────────┐           │
│  │  InfoClient    │           │ ExchangeClient │           │
│  │  (Read-Only)   │           │ (Write/Trade)  │           │
│  └────────────────┘           └────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Wallet Layer

**Purpose:** Secure key management with multiple backend options

**Implementations:**
- `EnvWallet` - Environment variable (dev/testing only)
- `KMSWallet` - Cloud KMS (AWS, GCP, Azure)
- `PrivyWallet` - Embedded wallets with social login
- `TurnkeyWallet` - Institutional key management
- `FireblocksWallet` - MPC with insurance
- `HardwareWallet` - Ledger/Trezor (coming soon)

**Interface:**
```typescript
interface IWallet {
  readonly address: `0x${string}`;
  readonly type: 'env' | 'kms' | 'mpc' | 'hardware';
  signTypedData(params): Promise<`0x${string}`>;
  dispose?(): Promise<void>;
}
```

### 2. Toolkit Layer

**Purpose:** High-level trading actions with built-in safety

**Key Features:**
- AI-friendly action interface
- Automatic stop-loss/take-profit
- Position size calculations
- Slippage protection
- Risk checks before execution

**Example:**
```typescript
const toolkit = new HyperliquidAgentToolkit({
  wallet,
  riskConfig: {
    maxLeverage: 10,
    maxPositionSizeUsd: 1000,
    maxDailyLoss: 500
  }
});

await toolkit.openPosition({
  coin: 'BTC',
  side: 'long',
  sizeUsd: 100,
  stopLossPercent: 3,
  takeProfitPercent: 6
});
```

### 3. Safety & Security Layer

#### RiskManager
- Position size limits
- Leverage caps
- Daily loss tracking
- PnL monitoring
- Trading cooldowns

#### AgentVault
- Encrypted storage for secrets
- AES-256-GCM encryption
- File/memory/cloud backends
- Seal/unseal capability

#### TEE Support
- Intel SGX support
- AWS Nitro Enclaves
- AMD SEV
- Remote attestation
- Key sealing in enclave

### 4. Agent Framework Layer

**Purpose:** Built-in autonomous agent execution

**Modes:**
1. **Autonomous Mode:** Agent runs continuously on a schedule
2. **On-Demand Mode:** Execute specific actions manually

**Model Adapters:**
- `OpenAIAdapter` - GPT-4, GPT-3.5, etc.
- `AnthropicAdapter` - Claude 3.5 Sonnet, etc.
- Custom adapters via `AgentModelAdapter` interface

**Example:**
```typescript
const agent = new HyperliquidAgent(
  toolkit,
  {
    name: "BTC Momentum Trader",
    instructions: "Trade BTC based on momentum. Use 2% risk per trade.",
    riskConfig: { maxLeverage: 5, maxPositionSizeUsd: 1000 },
    intervalMs: 60_000, // 1 minute
  },
  new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY })
);

await agent.start(); // Runs autonomously
```

### 5. Integration Layer

**Purpose:** Use Hyperliquid toolkit with external frameworks

#### OpenAI Function Calling
```typescript
import { getToolDefinitions, executeTool } from '@hyperliquid/agent-sdk';

const tools = getToolDefinitions();
// Use with OpenAI SDK, LangChain, LlamaIndex, etc.
```

#### LangChain Integration
```typescript
import { createLangChainTools } from '@hyperliquid/agent-sdk/integrations/langchain';

const tools = createLangChainTools(toolkit);
const executor = await initializeAgentExecutorWithOptions(tools, llm);
```

#### Custom Integration
```typescript
import { executeTool } from '@hyperliquid/agent-sdk';

const result = await executeTool('open_position', {
  coin: 'BTC',
  side: 'long',
  sizeUsd: 100
}, toolkit);
```

## Usage Patterns

### Pattern 1: Direct Agent (Built-in Framework)

Best for: Simple bots, getting started quickly

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
    instructions: "Trade conservatively, 1% risk per trade",
    riskConfig: { maxLeverage: 3, maxPositionSizeUsd: 500 }
  },
  new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! })
);

await agent.start();
```

### Pattern 2: External Framework Integration

Best for: Complex multi-agent systems, existing LangChain/CrewAI setup

```typescript
import { HyperliquidAgentToolkit, getToolDefinitions } from '@hyperliquid/agent-sdk';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';

const toolkit = new HyperliquidAgentToolkit({ wallet });
const tools = getToolDefinitions();

// Use with LangChain
const llm = new ChatOpenAI({ modelName: 'gpt-4' });
const executor = await initializeAgentExecutorWithOptions(
  tools,
  llm,
  { agentType: 'openai-functions' }
);

await executor.call({ input: "What's the current BTC price?" });
```

### Pattern 3: Manual Control

Best for: Custom logic, non-LLM strategies, precise control

```typescript
import { HyperliquidAgentToolkit } from '@hyperliquid/agent-sdk';

const toolkit = new HyperliquidAgentToolkit({ wallet });

// Implement your own logic
const markets = await toolkit.getMarketData({ coins: ['BTC'] });
if (markets.success && markets.data![0].price < 50000) {
  await toolkit.openPosition({
    coin: 'BTC',
    side: 'long',
    sizeUsd: 100,
    stopLossPercent: 3
  });
}
```

## Security Best Practices

### 1. Wallet Security

❌ **Never do this:**
```typescript
// Hardcoded private key
const wallet = new EnvWallet('0x1234...');
```

✅ **Do this:**
```typescript
// Production: Use KMS or MPC
const wallet = new TurnkeyWallet({
  organizationId: process.env.TURNKEY_ORG_ID!,
  privateKeyId: process.env.TURNKEY_KEY_ID!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE!,
});
await wallet.initialize();
```

### 2. Risk Management

✅ **Always set risk limits:**
```typescript
const toolkit = new HyperliquidAgentToolkit({
  wallet,
  riskConfig: {
    maxLeverage: 5,
    maxPositionSizeUsd: 1000,
    maxDailyLoss: 500,
    requireStopLoss: true,
    maxOpenPositions: 3
  }
});
```

### 3. Secret Management

✅ **Use AgentVault for sensitive data:**
```typescript
import { AgentVault } from '@hyperliquid/agent-sdk';

const vault = new AgentVault({
  masterKey: process.env.VAULT_MASTER_KEY!,
  storage: 'file',
  filePath: './secure/vault.enc'
});

await vault.set('OPENAI_API_KEY', process.env.OPENAI_API_KEY!);
await vault.set('STRATEGY_PARAMS', JSON.stringify(params));

// Later...
const apiKey = await vault.get('OPENAI_API_KEY');
```

### 4. TEE Deployment

✅ **Run agents in secure enclaves:**
```typescript
import { initTEE, createTEEWallet } from '@hyperliquid/agent-sdk';

// Initialize TEE
const tee = await initTEE({ provider: 'nitro' });

if (tee) {
  // Create wallet that seals keys in enclave
  const wallet = await createTEEWallet(tee, privateKey);
  
  // Get attestation for external verification
  const attestation = await tee.getAttestation();
  console.log('Agent running in TEE:', attestation);
}
```

## Deployment Modes

### Development
- `EnvWallet` with testnet
- Paper trading enabled
- Verbose logging
- No TEE required

### Staging
- `KMSWallet` (AWS/GCP)
- Small position sizes
- Real testnet trades
- Risk limits enforced

### Production
- `TurnkeyWallet` or `FireblocksWallet`
- TEE deployment (Nitro Enclaves)
- Insurance coverage
- Multi-signature policies
- Real-time monitoring
- Automated alerts

## Observability

All components emit structured logs and metrics:

```typescript
// Agent state
const state = agent.getState();
console.log(`Total trades: ${state.totalTrades}`);
console.log(`Total PnL: ${state.totalPnl}`);

// Trade logs
const logs = agent.getTradeLogs(10); // Last 10 trades
for (const log of logs) {
  console.log(`${log.action} ${log.coin} - ${log.success ? 'SUCCESS' : 'FAIL'}`);
}

// Risk stats
const riskStats = toolkit.getRiskStats();
console.log(`Daily PnL: ${riskStats?.dailyPnl}`);
```

## Extension Points

### Custom Model Adapter

```typescript
import type { AgentModelAdapter } from '@hyperliquid/agent-sdk';

class MyCustomAdapter implements AgentModelAdapter {
  async generateActions(instructions, context, options) {
    // Your custom logic here
    // Could be a local model, rule-based system, etc.
    return [];
  }
}

const agent = new HyperliquidAgent(
  toolkit,
  config,
  new MyCustomAdapter()
);
```

### Custom Wallet Type

```typescript
import { BaseWallet } from '@hyperliquid/agent-sdk';

class MyCustomWallet extends BaseWallet {
  readonly type = 'custom' as any;
  readonly address: `0x${string}`;
  
  async signTypedData(params) {
    // Your signing logic
  }
}
```

## Performance Considerations

- **Rate Limiting:** Hyperliquid has rate limits; toolkit handles this internally
- **Caching:** Market data and asset indices are cached
- **Concurrent Requests:** Multiple positions can be opened in parallel
- **Memory:** Agent trade logs are kept in memory (configurable limit coming)

## Roadmap

- [ ] LangChain tool wrappers (full implementation)
- [ ] Hardware wallet support (Ledger, Trezor)
- [ ] TEE implementations (SGX, Nitro, SEV)
- [ ] Multi-agent coordination
- [ ] Advanced order types (TWAP, Iceberg, etc.)
- [ ] Backtesting framework
- [ ] Real-time dashboards
- [ ] Telegram/Discord integrations
- [ ] Multi-DEX support (dYdX, GMX, etc.)
