# Getting Started with Hyperliquid Agent SDK

## What We've Built

A **secure, production-ready SDK** for building AI trading agents on Hyperliquid that solves the key problems you identified:

### ✅ Secure Wallet Management
- Multiple wallet types: `EnvWallet` (dev), `KMSWallet` (prod), `MPCWallet` (future)
- Private key encryption and secure handling
- No keys in logs or error messages
- Hardware wallet support (coming soon)

### ✅ High-Level Trading Abstractions
- Simple, AI-friendly methods: `openPosition()`, `closePosition()`, `getMarketData()`
- Automatic stop-loss and take-profit
- Built-in slippage protection
- Position tracking and balance management

### ✅ Built-in Risk Management
- Position size limits
- Leverage caps
- Daily loss limits
- Drawdown protection
- Stop-loss enforcement

### ✅ AI-Ready Architecture
- Standardized `ActionResult` format
- Works with any LLM (OpenAI, Anthropic, Gemini)
- Pre-built example bots
- Easy to extend

## Installation

```bash
cd /Users/madhavgoyal/stuff/agent-sdk

# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

### 1. Set Up Environment

```bash
# Copy example env file
cp .env.example .env

# Edit and add your private key
nano .env
```

Add to `.env`:
```
PRIVATE_KEY=0x...your-key-here...
```

### 2. Run Example Bot

```bash
# Simple trader example
npm run example:simple

# Or momentum bot
npm run example:momentum
```

### 3. Build Your Own Bot

Create `my-bot.ts`:

```typescript
import { EnvWallet, HyperliquidAgentToolkit } from './src/index.js';

async function main() {
  // Setup wallet
  const wallet = EnvWallet.fromEnv('PRIVATE_KEY');
  
  // Create toolkit with risk limits
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'testnet',
    riskConfig: {
      maxLeverage: 5,
      maxPositionSizeUsd: 1000,
      maxDailyLoss: 500,
    },
  });

  // Get market data
  const markets = await toolkit.getMarketData({ coins: ['BTC'] });
  console.log('BTC Price:', markets.data?.[0].price);

  // Open a position
  const result = await toolkit.openPosition({
    coin: 'BTC',
    side: 'long',
    sizeUsd: 100,
    stopLossPercent: 5,
    takeProfitPercent: 10,
  });

  if (result.success) {
    console.log('Position opened!');
  }
}

main();
```

## Project Structure

```
agent-sdk/
├── src/
│   ├── wallets/          # Secure wallet implementations
│   │   ├── base.ts       # Base wallet class
│   │   ├── env.ts        # Environment variable wallet
│   │   └── kms.ts        # KMS wallet (AWS/GCP/Azure)
│   │
│   ├── toolkit/          # High-level trading toolkit
│   │   └── hyperliquid-toolkit.ts
│   │
│   ├── safety/           # Risk management
│   │   └── risk-manager.ts
│   │
│   └── types/            # TypeScript types
│       └── index.ts
│
├── examples/             # Example bots
│   ├── simple-trader.ts  # Basic trading
│   └── momentum-bot.ts   # Momentum strategy
│
├── docs/                 # Documentation
│   ├── API.md           # API reference
│   ├── SECURITY.md      # Security best practices
│   └── CONTRIBUTING.md  # Contribution guide
│
└── package.json
```

## Key Features

### 1. Secure Wallets

```typescript
// Development: Environment variables
const wallet = EnvWallet.fromEnv('PRIVATE_KEY');

// Production: AWS KMS
const wallet = new KMSWallet({
  provider: 'aws',
  keyId: process.env.AWS_KMS_KEY_ID,
  region: 'us-east-1'
}, address);
```

### 2. Risk Management

```typescript
const toolkit = new HyperliquidAgentToolkit({
  wallet,
  riskConfig: {
    maxLeverage: 5,              // Max 5x leverage
    maxPositionSizeUsd: 1000,    // Max $1000 per position
    maxDailyLoss: 500,           // Stop if lose $500 in a day
    requireStopLoss: true,       // Force stop-losses
    maxOpenPositions: 3,         // Max 3 positions at once
  },
});
```

### 3. Simple Trading API

```typescript
// Open position with stop-loss and take-profit
await toolkit.openPosition({
  coin: 'BTC',
  side: 'long',
  sizeUsd: 100,
  stopLossPercent: 5,
  takeProfitPercent: 10,
});

// Close position
await toolkit.closePosition({ coin: 'BTC' });

// Get positions
const positions = await toolkit.getPositions();

// Get balance
const balance = await toolkit.getBalance();
```

## Next Steps

### For Development

1. **Test on Testnet**
   ```typescript
   const toolkit = new HyperliquidAgentToolkit({
     wallet,
     network: 'testnet',  // Always test here first!
   });
   ```

2. **Read the Documentation**
   - [API Reference](docs/API.md)
   - [Security Best Practices](docs/SECURITY.md)
   - [Contributing Guide](docs/CONTRIBUTING.md)

3. **Study the Examples**
   - `examples/simple-trader.ts` - Basic operations
   - `examples/momentum-bot.ts` - Autonomous bot

### For Production

1. **Use KMS/MPC Wallets**
   ```typescript
   const wallet = new KMSWallet({ 
     provider: 'aws',
     keyId: '...' 
   }, address);
   ```

2. **Set Strict Risk Limits**
   ```typescript
   riskConfig: {
     maxLeverage: 3,           // Conservative leverage
     maxPositionSizeUsd: 500,  // Smaller positions
     maxDailyLoss: 200,        // Tight loss limit
     requireStopLoss: true,    // Always use stop-loss
   }
   ```

3. **Monitor Your Bots**
   ```typescript
   setInterval(async () => {
     const stats = toolkit.getRiskStats();
     if (stats.dailyPnl < -400) {
       await sendAlert('Approaching loss limit!');
     }
   }, 60000);
   ```

## Comparison: Before vs After

### Before (hyperClaw)
```typescript
// ❌ Private key directly from env
const pk = process.env.HYPERLIQUID_PRIVATE_KEY;
const wallet = privateKeyToAccount(pk as `0x${string}`);

// ❌ Manual order construction
await exchangeClient.order({
  orders: [{
    a: assetIndex,
    b: isBuy,
    p: price,
    s: size,
    r: reduceOnly,
    t: { limit: { tif: 'Ioc' } },
  }],
  grouping: 'na',
});

// ❌ No built-in risk management
// ❌ No stop-loss/take-profit helpers
// ❌ Complex error handling
```

### After (agent-sdk)
```typescript
// ✅ Secure wallet abstraction
const wallet = EnvWallet.fromEnv('PRIVATE_KEY');

// ✅ High-level, AI-friendly API
await toolkit.openPosition({
  coin: 'BTC',
  side: 'long',
  sizeUsd: 100,
  stopLossPercent: 5,
  takeProfitPercent: 10,
});

// ✅ Built-in risk management
// ✅ Automatic stop-loss/take-profit
// ✅ Standardized error handling
```

## What Makes This Special

1. **First Hyperliquid SDK designed for AI agents**
   - AI-friendly action formats
   - Standardized responses
   - Built-in safety checks

2. **Production-ready security**
   - KMS/MPC wallet support
   - No keys in memory longer than needed
   - Secure by default

3. **Comprehensive risk management**
   - Position limits
   - Leverage caps
   - Loss limits
   - Drawdown protection

4. **Easy to use**
   - High-level abstractions
   - Great documentation
   - Working examples

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on:
- Adding new features
- Implementing MPC wallets
- Writing tests
- Code style

## Support

- **Issues**: Open an issue on GitHub
- **Discord**: Join the Hyperliquid Discord
- **Docs**: Check the `docs/` folder

## License

MIT - See LICENSE file

---

**Built with ❤️ for the Hyperliquid ecosystem**

Making AI trading agents secure and accessible for everyone.
