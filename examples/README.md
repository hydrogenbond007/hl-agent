# Examples

Example bots demonstrating the Hyperliquid Agent SDK.

## Prerequisites

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your PRIVATE_KEY
```

## Examples

### 1. Simple Trader (`simple-trader.ts`)

Basic example showing core features:
- Wallet setup
- Risk configuration
- Market data fetching
- Opening/closing positions
- Balance checking

```bash
npm run example:simple
```

### 2. Momentum Bot (`momentum-bot.ts`)

Autonomous trading bot that:
- Monitors BTC price momentum
- Opens long positions on strong upward momentum
- Closes positions when momentum weakens
- Uses strict risk management

```bash
npm run example:momentum
```

## Running Examples

```bash
# Run with ts-node
npx ts-node examples/simple-trader.ts

# Or compile and run
npm run build
node dist/examples/simple-trader.js
```

## Safety Notes

⚠️ **These examples are for educational purposes only!**

- Always test on testnet first
- Never risk more than you can afford to lose
- Use proper risk management
- Monitor your bots regularly
- Start with small position sizes

## Next Steps

1. Study the examples
2. Modify the strategies
3. Add your own indicators
4. Test thoroughly on testnet
5. Monitor carefully on mainnet

## Creating Your Own Bot

```typescript
import { EnvWallet, HyperliquidAgentToolkit } from '@hyperliquid/agent-sdk';

async function myBot() {
  const wallet = EnvWallet.fromEnv('PRIVATE_KEY');
  
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'testnet',
    riskConfig: {
      maxLeverage: 5,
      maxPositionSizeUsd: 1000,
      maxDailyLoss: 500,
    },
  });

  // Your trading logic here...
}
```

## Advanced Usage

See the [documentation](../docs/) for:
- Custom indicators
- Multi-coin strategies
- Grid trading
- Mean reversion
- Machine learning integration
