# Agent-SDK Codebase Index

**Purpose:** Understand what exists today and what’s still needed.

---

## 1. Project Structure

```
agent-sdk/
├── src/                    # Main source
│   ├── wallets/           # Wallet implementations (5 files)
│   ├── toolkit/           # Trading toolkit (2 toolkits)
│   ├── agent/             # Agent framework
│   ├── safety/            # Risk management
│   ├── security/          # Vault, TEE
│   ├── integrations/      # OpenAI tools, LangChain
│   └── types/             # Shared types
├── examples/              # 8 example scripts
├── tests/                 # 8 test/script files
├── docs/                   # 8 documentation files
└── package.json
```

---

## 2. What We Have (Implemented & Working)

### 2.1 Wallets

| Wallet        | File      | Status  | Notes                                                  |
|---------------|-----------|---------|--------------------------------------------------------|
| **EnvWallet** | env.ts    | Working | Private key from env; dev only                         |
| **TurnkeyWallet** | turnkey.ts | Working | MPC via Turnkey; full implementation                   |
| **PrivyWallet**  | privy.ts  | Working | Embedded wallets + social login                        |
| **KMSWallet**    | kms.ts    | Partial | Framework present; AWS/GCP/Azure DER→Eth incomplete   |
| **BaseWallet**   | base.ts   | Working | Validation, shared helpers                             |

### 2.2 Toolkit

| Class                      | File                    | Status  | Capabilities                                           |
|----------------------------|-------------------------|---------|--------------------------------------------------------|
| **HyperliquidAgentToolkit**| hyperliquid-toolkit.ts  | Working | Main trading API (652 lines)                           |
| **EnhancedHyperliquidToolkit** | enhanced-toolkit.ts | Working | Caching, simulation, advanced order types skeleton     |

**Core toolkit methods:**
- `getMarketData()` – Perp market data
- `getOrderBook()` – L2 book
- `getPositions()` – Open positions (perps)
- `getBalance()` – Account/margin
- `openPosition()` – Perp and spot (both implemented)
- `closePosition()` – Close perp/spot
- `cancelOrders()` – Cancel by coin or all
- `updateLeverage()` – Perp leverage
- Asset index resolution for perps and spot

### 2.3 Agent Framework

| Component         | File        | Status  | Notes                                    |
|-------------------|------------|---------|------------------------------------------|
| HyperliquidAgent  | agent.ts   | Working | Autonomous loop, tick logic              |
| OpenAIAdapter     | openai.ts  | Working | GPT function calling                     |
| AnthropicAdapter  | anthropic.ts | Working | Claude adapter                            |
| Model interface   | agent.ts   | Working | `AgentModelAdapter`                       |

**Agent features:**
- Autonomous execution (`start` / `stop`)
- Configurable tick interval
- Trade logging
- State (PnL, tick count, errors)
- Paper-trading mode
- Max actions per interval

### 2.4 Safety & Security

| Component     | File      | Status  | Notes                                  |
|---------------|------------|---------|----------------------------------------|
| RiskManager   | risk-manager.ts | Working | Pre-trade checks, limits, daily PnL  |
| AgentVault    | vault.ts   | Working | AES-256-GCM, memory/file storage        |
| TEE support   | tee.ts     | Stub    | initTEE, createTEEWallet; mostly TODOs  |

**RiskManager:**
- Max leverage, position size, daily loss
- Max drawdown, max open positions
- Mandatory stop-loss
- Daily PnL reset
- Trade log and win rate stats

### 2.5 Integrations

| Integration | File           | Status  | Notes                                      |
|-------------|----------------|---------|--------------------------------------------|
| OpenAI tools| openai-tools.ts| Working | Tool definitions + executeTool()            |
| LangChain   | langchain.ts   | Stub    | Throws; structure only                      |

**OpenAI tools:**
- `get_markets`, `get_positions`, `get_balance`
- `open_position`, `close_position`, `cancel_orders`
- JSON schema for params

### 2.6 Types

- Network, OrderSide, OrderType  
- IWallet, RiskConfig, MarketData, Position  
- OpenPositionParams, ClosePositionParams  
- ActionResult, AgentAction, TradeLog  
- AgentConfig, AgentState  
- KMSConfig, MPCConfig, HardwareWalletConfig  

---

## 3. Examples

| Example                | Command / File              | Purpose                           |
|------------------------|-----------------------------|-----------------------------------|
| simple-trader          | `example:simple`            | Basic toolkit usage               |
| momentum-bot           | `example:momentum`          | Custom momentum strategy          |
| one-file-strategy      | `example:onefile`           | One-file agent with OpenAI        |
| custom-logic-strategy  | `example:custom`            | Custom logic (non-LLM)             |
| autonomous-agent       | `example:autonomous`        | Full autonomous agent             |
| langchain-integration  | `example:langchain`         | LangChain + tools                 |
| secure-production      | `example:production`        | Production config patterns        |
| enhanced-features      | -                           | Enhanced toolkit features         |

---

## 4. Tests / Scripts

| File                  | Purpose                                   |
|-----------------------|--------------------------------------------|
| test-read-only.ts     | Direct Hyperliquid read-only API tests     |
| test-hyperliquid-api.ts | API connectivity checks                 |
| test-mainnet.ts       | Mainnet read-only tests                    |
| test-mainnet-trade.ts | Mainnet trading tests                      |
| test-spot-hype.ts     | Spot market tests                          |
| test-purr.ts          | Purr-specific test                        |
| check-spot-meta.ts    | Spot metadata checks                       |
| debug-spot.ts         | Spot debugging                             |

Note: These are scripts rather than structured unit/integration tests.

---

## 5. Gaps & TODOs

### 5.1 High Priority

| Item                 | Location          | Description                                   |
|----------------------|-------------------|-----------------------------------------------|
| Order ID extraction  | hyperliquid-toolkit.ts:524 | Return real order ID from place order response |
| change24h            | hyperliquid-toolkit.ts:100 | Compute 24h price change from history      |
| LangChain tools      | langchain.ts:37   | Implement DynamicStructuredTool wrappers      |
| KMS signing         | kms.ts            | Complete AWS/GCP/Azure DER→Ethereum signature |

### 5.2 Medium Priority

| Item              | Location              | Description                         |
|-------------------|------------------------|-------------------------------------|
| Trailing stops    | enhanced-toolkit.ts:238 | Replace stub with real logic       |
| TWAP execution    | enhanced-toolkit.ts:280 | Replace stub with real execution   |
| Vault cloud       | vault.ts:169           | Add cloud storage backend          |
| KMSWallet docs    | WALLETS.md             | Clarify KMS status vs placeholder  |

### 5.3 Lower Priority / Future

| Item               | Location   | Status  |
|--------------------|-----------|---------|
| TEE (SGX/Nitro/SEV)| tee.ts    | Stubs   |
| Hardware wallets   | -         | Planned |
| Fireblocks wallet  | WALLETS.md| Placeholder |
| Gemini adapter     | -         | Planned |
| Ollama/local model | -         | Planned |
| Backtesting        | -         | Roadmap |
| WebSocket live data| -         | Roadmap |

---

## 6. Dependencies

### Core

- `@nktkas/hyperliquid` ^0.31.0  
- `@noble/hashes` ^1.5.0  
- `viem` ^2.31.2  

### Optional (peer)

- `openai` (agent framework)
- `@anthropic-ai/sdk` (Claude adapter)
- `langchain` (integration)
- `@turnkey/*` (Turnkey MPC)
- `@privy-io/node` (Privy wallets)

---

## 7. API Summary

### Trading

```typescript
// Perp
await toolkit.openPosition({ coin: 'BTC', side: 'long', sizeUsd: 100, stopLossPercent: 5 });
await toolkit.closePosition({ coin: 'BTC' });

// Spot
await toolkit.openPosition({ coin: 'HYPE', side: 'buy', sizeUsd: 50, market: 'spot' });
```

### Agent

```typescript
const agent = new HyperliquidAgent(toolkit, config, new OpenAIAdapter({ apiKey }));
await agent.start();
```

### External frameworks

```typescript
const tools = getToolDefinitions();
const result = await executeTool('open_position', params, toolkit);
```

---

## 8. What’s Needed (By Role)

### For a production trading bot

1. Use Turnkey/Privy wallet (avoid EnvWallet).
2. Add KMS signing if you rely on KMS.
3. Implement monitoring and alerting.
4. Add proper unit/integration tests.

### For LangChain users

1. Implement LangChain tools in `langchain.ts`.

### For advanced order types

1. Implement trailing stops in `enhanced-toolkit.ts`.
2. Implement TWAP logic in `enhanced-toolkit.ts`.

### For full Hyperliquid coverage

1. Implement spot funding/deposits/withdrawals if needed.
2. Add WebSocket streams for live data.
3. Implement subaccounts / vaults if relevant.

---

## 9. Quick Reference

| Need                          | Use                                          |
|-------------------------------|-----------------------------------------------|
| Simple trading                | HyperliquidAgentToolkit + EnvWallet           |
| Production wallet             | TurnkeyWallet or PrivyWallet                  |
| AI-driven agent               | HyperliquidAgent + OpenAIAdapter              |
| Custom strategy               | HyperliquidAgentToolkit + custom logic        |
| LangChain                     | getToolDefinitions() + executeTool() (full LangChain pending) |
| Risk limits                   | HyperliquidToolkitConfig.riskConfig           |
| Secrets                       | AgentVault                                   |
| Caching, simulation           | EnhancedHyperliquidToolkit                    |

---

**Last indexed:** Feb 2026
