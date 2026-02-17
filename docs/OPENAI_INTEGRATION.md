# OpenAI Integration (Short Guide)

Use these helpers to keep tool schemas and execution consistent across OpenAI formats.

## 1) Register tools

```ts
import { getOpenAITools } from '@hyperliquid/agent-sdk';

const tools = getOpenAITools(); // [{ type: "function", function: {...} }]
```

Use `getOpenAIFunctions()` only if you need legacy function-calling format.

## 2) Execute tool calls

```ts
import { executeTool } from '@hyperliquid/agent-sdk';

for (const call of toolCalls) {
  const toolName = call.function.name;
  const args = call.function.arguments; // string or object

  const result = await executeTool(toolName, args, toolkit);
  // send result back to model
}
```

`executeTool()` normalizes common model output issues:
- number-like strings (`"10"`) -> numbers (`10`)
- symbol casing (`"eth"` -> `"ETH"`)
- side/market/order type casing (`"BUY"` -> `"buy"`, `"SPOT"` -> `"spot"`)

## 3) Recommended params for `open_position`

- `coin`: perp symbol (`"ETH"`) or spot symbol/pair (`"HYPE"` / `"HYPE/USDC"` / alias pair)
- `side`: `long | short | buy | sell`
- `market`: `perp | spot`
- size: pass one of `sizeUsd` or `sizeCoin`
- optional: `orderType`, `limitPrice`, `slippagePercent`, TP/SL fields (perps)

## 4) Production note

Before submitting orders, keep a small pre-check layer for:
- min notional
- available margin
- risk limits
