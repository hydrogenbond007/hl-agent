# Hyperliquid Agent SDK

Toolkit and agent framework for building trading agents on Hyperliquid.

## Install

```bash
npm install @hyperliquid/agent-sdk
```

Optional peer deps (only install what you use):

```bash
npm install openai
npm install @anthropic-ai/sdk
npm install langchain
```

## Quick Start

```ts
import { EnvWallet, HyperliquidAgentToolkit } from '@hyperliquid/agent-sdk';

const wallet = new EnvWallet(process.env.HYPERLIQUID_PRIVATE_KEY!);
const toolkit = new HyperliquidAgentToolkit({
  wallet,
  network: 'mainnet',
  riskConfig: {
    maxLeverage: 5,
    maxPositionSizeUsd: 100,
  },
});

const markets = await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });
console.log(markets.data);

const order = await toolkit.openPosition({
  coin: 'ETH',
  market: 'perp',
  side: 'long',
  sizeUsd: 10,
});
console.log(order);
```

## OpenAI / Ollama Integration

```ts
import OpenAI from 'openai';
import { executeTool, getOpenAITools } from '@hyperliquid/agent-sdk';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  // For Ollama:
  // baseURL: 'http://localhost:11434/v1',
  // apiKey: 'ollama',
});

const tools = getOpenAITools();

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini', // or an Ollama model name
  messages: [{ role: 'user', content: 'Buy $10 HYPE spot' }],
  tools,
});

const toolCall = response.choices[0]?.message?.tool_calls?.[0];
if (toolCall?.function) {
  const result = await executeTool(
    toolCall.function.name,
    toolCall.function.arguments, // string or object
    toolkit,
  );
  console.log(result);
}
```

## What You Get

- High-level trading toolkit (`getMarketData`, `openPosition`, `closePosition`, `cancelOrders`)
- Spot and perp support
- Agent-friendly tool schemas and execution helpers
- Optional built-in agent framework and model adapters
- Multiple wallet backends (env, KMS, Turnkey, Privy)

## Examples

- `/examples/one-file-strategy.ts`
- `/examples/simple-trader.ts`
- `/examples/langchain-integration.ts`
- `/examples/autonomous-agent.ts`

## Docs

- [Quickstart](./docs/QUICKSTART.md)
- [API](./docs/API.md)
- [OpenAI Integration](./docs/OPENAI_INTEGRATION.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Wallets](./docs/WALLETS.md)
- [Contributing](./docs/CONTRIBUTING.md)

## License

MIT
