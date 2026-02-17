# Contributing to Hyperliquid Agent SDK

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Git
- A Hyperliquid testnet account

### Setup

```bash
# Clone the repo
git clone https://github.com/your-org/agent-sdk.git
cd agent-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

Follow the project structure:

```
src/
├── wallets/      # Wallet implementations
├── toolkit/      # Trading actions
├── safety/       # Risk management
├── agent/        # Agent orchestration (future)
└── types/        # TypeScript types
```

### 3. Write Tests

```typescript
// tests/toolkit.test.ts
import { HyperliquidAgentToolkit, EnvWallet } from '../src';

describe('HyperliquidAgentToolkit', () => {
  it('should fetch market data', async () => {
    const wallet = new EnvWallet(process.env.TEST_PRIVATE_KEY!);
    const toolkit = new HyperliquidAgentToolkit({ 
      wallet,
      network: 'testnet' 
    });
    
    const result = await toolkit.getMarketData({ coins: ['BTC'] });
    expect(result.success).toBe(true);
  });
});
```

### 4. Run Checks

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run build

# Test
npm test
```

### 5. Commit Your Changes

Use conventional commits:

```bash
git commit -m "feat: add support for hardware wallets"
git commit -m "fix: correct stop-loss calculation"
git commit -m "docs: update security best practices"
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### TypeScript

```typescript
// Use explicit types
function calculatePnl(entry: number, exit: number, size: number): number {
  return (exit - entry) * size;
}

// Use interfaces for objects
interface TradeParams {
  coin: string;
  size: number;
  side: 'long' | 'short';
}

// Use async/await (not promises.then)
async function trade(params: TradeParams): Promise<Result> {
  const result = await toolkit.openPosition(params);
  return result;
}
```

### Naming Conventions

- Classes: `PascalCase`
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Private fields: `#camelCase` (with #)
- Types/Interfaces: `PascalCase`

### Documentation

```typescript
/**
 * Opens a new position with optional stop-loss and take-profit
 * 
 * @param params - Position parameters
 * @returns Result with order ID or error
 * 
 * @example
 * ```typescript
 * const result = await toolkit.openPosition({
 *   coin: 'BTC',
 *   side: 'long',
 *   sizeUsd: 100,
 *   stopLossPercent: 5
 * });
 * ```
 */
async openPosition(params: OpenPositionParams): Promise<ActionResult> {
  // Implementation
}
```

## What to Contribute

### High Priority

- [ ] MPC wallet implementation (Fireblocks, Qredo, Turnkey)
- [ ] Hardware wallet support (Ledger, Trezor)
- [ ] More trading strategies (grid, mean reversion)
- [ ] AI agent orchestration layer
- [ ] Backtesting framework
- [ ] Web3Auth integration
- [ ] Better error messages
- [ ] Performance optimizations

### Medium Priority

- [ ] More examples
- [ ] Video tutorials
- [ ] Advanced risk metrics
- [ ] Portfolio rebalancing
- [ ] Multi-coin strategies
- [ ] Telegram/Discord bot integration
- [ ] Dashboard/UI for monitoring

### Always Welcome

- Bug fixes
- Documentation improvements
- Test coverage
- Performance improvements
- Security enhancements

## Security

**Never commit:**
- Private keys
- API keys
- Credentials
- `.env` files

**Always:**
- Report security issues privately (security@yourorg.com)
- Follow security best practices
- Review code for vulnerabilities
- Use `npm audit` before releasing

## Testing

### Unit Tests

```typescript
// Test individual functions
describe('RiskManager', () => {
  it('should reject positions exceeding max size', () => {
    const manager = new RiskManager({
      maxLeverage: 5,
      maxPositionSizeUsd: 1000,
    });
    
    const result = manager.checkOpenPosition(
      { coin: 'BTC', side: 'long', sizeUsd: 2000 },
      [],
      10000
    );
    
    expect(result.allowed).toBe(false);
  });
});
```

### Integration Tests

```typescript
// Test with real API (testnet)
describe('HyperliquidAgentToolkit (integration)', () => {
  it('should open and close a position', async () => {
    const wallet = EnvWallet.fromEnv('TEST_PRIVATE_KEY');
    const toolkit = new HyperliquidAgentToolkit({ 
      wallet,
      network: 'testnet' 
    });
    
    // Open
    const openResult = await toolkit.openPosition({
      coin: 'BTC',
      side: 'long',
      sizeUsd: 10,
    });
    expect(openResult.success).toBe(true);
    
    // Close
    const closeResult = await toolkit.closePosition({ coin: 'BTC' });
    expect(closeResult.success).toBe(true);
  });
});
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v0.2.0`
4. Push: `git push --tags`
5. Publish: `npm publish`

## Community

- Discord: [discord.gg/hyperliquid](https://discord.gg/hyperliquid)
- Twitter: [@hyperliquid](https://twitter.com/hyperliquid)
- GitHub: [github.com/hyperliquid](https://github.com/hyperliquid)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or ask in Discord!
