# API Documentation

## HyperliquidAgentToolkit

The main interface for trading operations.

### Constructor

```typescript
new HyperliquidAgentToolkit(config: HyperliquidToolkitConfig)
```

**Config:**

```typescript
interface HyperliquidToolkitConfig {
  wallet: IWallet;
  network?: 'mainnet' | 'testnet';
  riskConfig?: RiskConfig;
  defaultSlippagePercent?: number;
}
```

**Example:**

```typescript
const toolkit = new HyperliquidAgentToolkit({
  wallet: new EnvWallet(process.env.PRIVATE_KEY),
  network: 'testnet',
  riskConfig: {
    maxLeverage: 5,
    maxPositionSizeUsd: 1000,
  },
  defaultSlippagePercent: 1,
});
```

---

## Market Data Methods

### getMarketData()

Get market data for specified coins.

```typescript
async getMarketData(params?: { 
  coins?: string[] 
}): Promise<ActionResult<MarketData[]>>
```

**Returns:**

```typescript
interface MarketData {
  coin: string;
  price: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
}
```

**Example:**

```typescript
const result = await toolkit.getMarketData({ coins: ['BTC', 'ETH'] });

if (result.success) {
  result.data.forEach(market => {
    console.log(`${market.coin}: $${market.price}`);
  });
}
```

---

### getOrderBook()

Get order book depth.

```typescript
async getOrderBook(params: { 
  coin: string;
  depth?: number;
}): Promise<ActionResult<{
  bids: [number, number][];
  asks: [number, number][];
}>>
```

**Example:**

```typescript
const result = await toolkit.getOrderBook({ 
  coin: 'BTC',
  depth: 10 
});

if (result.success) {
  console.log('Best bid:', result.data.bids[0]);
  console.log('Best ask:', result.data.asks[0]);
}
```

---

## Position Management Methods

### getPositions()

Get all open positions.

```typescript
async getPositions(): Promise<ActionResult<Position[]>>
```

**Returns:**

```typescript
interface Position {
  coin: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  liquidationPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}
```

**Example:**

```typescript
const result = await toolkit.getPositions();

if (result.success) {
  result.data.forEach(pos => {
    console.log(`${pos.coin} ${pos.side}: PnL ${pos.unrealizedPnl}`);
  });
}
```

---

### getBalance()

Get account balance and margin.

```typescript
async getBalance(): Promise<ActionResult<{
  accountValue: number;
  availableBalance: number;
  marginUsed: number;
  withdrawable: number;
}>>
```

**Example:**

```typescript
const result = await toolkit.getBalance();

if (result.success) {
  console.log('Available:', result.data.availableBalance);
  console.log('Margin Used:', result.data.marginUsed);
}
```

---

## Trading Methods

### openPosition()

Open a new position with optional stop-loss and take-profit.

```typescript
async openPosition(params: OpenPositionParams): Promise<ActionResult<{ orderId: number }>>
```

**Params:**

```typescript
interface OpenPositionParams {
  coin: string;
  side: 'long' | 'short' | 'buy' | 'sell';
  
  // Position size (one required)
  sizeUsd?: number;
  sizeCoin?: number;
  
  leverage?: number;
  
  // Stop-loss (optional)
  stopLossPrice?: number;
  stopLossPercent?: number;
  
  // Take-profit (optional)
  takeProfitPrice?: number;
  takeProfitPercent?: number;
  
  slippagePercent?: number;
  orderType?: 'market' | 'limit';
  limitPrice?: number;
}
```

**Example:**

```typescript
// Market order with stop-loss and take-profit
const result = await toolkit.openPosition({
  coin: 'BTC',
  side: 'long',
  sizeUsd: 100,
  leverage: 3,
  stopLossPercent: 5,
  takeProfitPercent: 10,
});

// Limit order
const result = await toolkit.openPosition({
  coin: 'ETH',
  side: 'short',
  sizeCoin: 0.5,
  orderType: 'limit',
  limitPrice: 3500,
  stopLossPrice: 3600,
});
```

---

### closePosition()

Close an open position.

```typescript
async closePosition(params: ClosePositionParams): Promise<ActionResult<{ orderId: number }>>
```

**Params:**

```typescript
interface ClosePositionParams {
  coin: string;
  percent?: number; // Default: 100
  slippagePercent?: number;
}
```

**Example:**

```typescript
// Close 100% of position
await toolkit.closePosition({ coin: 'BTC' });

// Close 50% of position
await toolkit.closePosition({ 
  coin: 'BTC',
  percent: 50 
});
```

---

### cancelOrders()

Cancel open orders.

```typescript
async cancelOrders(params?: { 
  coin?: string 
}): Promise<ActionResult<{ cancelled: number }>>
```

**Example:**

```typescript
// Cancel all orders for BTC
await toolkit.cancelOrders({ coin: 'BTC' });

// Cancel all orders
await toolkit.cancelOrders();
```

---

## Utility Methods

### getAddress()

Get wallet address.

```typescript
getAddress(): `0x${string}`
```

---

### getNetwork()

Get current network.

```typescript
getNetwork(): 'mainnet' | 'testnet'
```

---

### getRiskStats()

Get risk management statistics.

```typescript
getRiskStats(): {
  dailyPnl: number;
  totalTrades: number;
  avgPnl: number;
  winRate: number;
} | undefined
```

---

## Wallets

### EnvWallet

Basic wallet for development.

```typescript
new EnvWallet(privateKey: string)
```

**Static Methods:**

```typescript
// Load from environment variable
EnvWallet.fromEnv(varName?: string): EnvWallet
```

**Example:**

```typescript
// From string
const wallet = new EnvWallet("0x...");

// From env var
const wallet = EnvWallet.fromEnv('PRIVATE_KEY');
```

---

### KMSWallet

Production-grade wallet using cloud KMS.

```typescript
new KMSWallet(config: KMSConfig, address: `0x${string}`)
```

**Config:**

```typescript
interface KMSConfig {
  provider: 'aws' | 'gcp' | 'azure';
  keyId: string;
  region?: string;
  credentials?: unknown;
}
```

**Example:**

```typescript
// AWS KMS
const wallet = new KMSWallet({
  provider: 'aws',
  keyId: 'arn:aws:kms:us-east-1:123456789012:key/...',
  region: 'us-east-1'
}, '0x...');

// GCP KMS
const wallet = new KMSWallet({
  provider: 'gcp',
  keyId: 'projects/my-project/locations/us/keyRings/...'
}, '0x...');
```

---

## Risk Manager

Enforce trading limits.

```typescript
new RiskManager(config: RiskConfig)
```

**Config:**

```typescript
interface RiskConfig {
  maxLeverage: number;
  maxPositionSizeUsd: number;
  maxDailyLoss?: number;
  maxDrawdownPercent?: number;
  requireStopLoss?: boolean;
  maxOpenPositions?: number;
}
```

**Example:**

```typescript
const riskManager = new RiskManager({
  maxLeverage: 5,
  maxPositionSizeUsd: 1000,
  maxDailyLoss: 500,
  requireStopLoss: true,
});

// Check if position is allowed
const check = riskManager.checkOpenPosition(
  { coin: 'BTC', side: 'long', sizeUsd: 100 },
  currentPositions,
  accountBalance
);

if (!check.allowed) {
  console.error('Position rejected:', check.reason);
}
```

---

## Types

### ActionResult

Standard response format.

```typescript
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
```

---

### Network

```typescript
type Network = 'mainnet' | 'testnet';
```

---

### OrderSide

```typescript
type OrderSide = 'long' | 'short' | 'buy' | 'sell';
```

---

### OrderType

```typescript
type OrderType = 'market' | 'limit' | 'stop-loss' | 'take-profit';
```

---

## Error Handling

All methods return `ActionResult`:

```typescript
const result = await toolkit.openPosition(params);

if (result.success) {
  // Success!
  console.log('Order placed:', result.data);
} else {
  // Error
  console.error('Failed:', result.error);
}
```

**Never throws exceptions** - always check `result.success`.

---

## Rate Limits

Hyperliquid has rate limits:
- 1200 requests per minute (mainnet)
- Unlimited (testnet)

The SDK does not implement rate limiting - implement your own:

```typescript
import pLimit from 'p-limit';

const limit = pLimit(10); // Max 10 concurrent requests

await Promise.all(
  coins.map(coin => 
    limit(() => toolkit.getMarketData({ coins: [coin] }))
  )
);
```
