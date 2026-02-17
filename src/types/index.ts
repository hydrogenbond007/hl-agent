/**
 * Core types for Hyperliquid Agent SDK
 */

export type Network = 'mainnet' | 'testnet';

export type OrderSide = 'long' | 'short' | 'buy' | 'sell';

export type OrderType = 'market' | 'limit' | 'stop-loss' | 'take-profit';

/**
 * Wallet interface - all wallet types must implement this
 */
export interface IWallet {
  readonly address: `0x${string}`;
  readonly type: 'env' | 'kms' | 'mpc' | 'hardware';
  
  signTypedData(params: {
    domain: {
      name?: string;
      version?: string;
      chainId?: number;
      verifyingContract?: `0x${string}`;
      salt?: `0x${string}`;
    };
    types: {
      [key: string]: {
        name: string;
        type: string;
      }[];
    };
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<`0x${string}`>;
  
  /** Optional: cleanup resources */
  dispose?(): Promise<void>;
}

/**
 * Risk management configuration
 */
export interface RiskConfig {
  /** Maximum leverage allowed (e.g., 10 = 10x) */
  maxLeverage: number;
  
  /** Maximum position size in USD */
  maxPositionSizeUsd: number;
  
  /** Maximum daily loss in USD */
  maxDailyLoss?: number;
  
  /** Maximum drawdown percentage before stopping */
  maxDrawdownPercent?: number;
  
  /** Require stop-loss on all positions */
  requireStopLoss?: boolean;
  
  /** Maximum number of open positions */
  maxOpenPositions?: number;
}

/**
 * Market data
 */
export interface MarketData {
  coin: string;
  price: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
  bid?: number;
  ask?: number;
  spread?: number;
}

/**
 * Position data
 */
export interface Position {
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

/**
 * Order parameters for opening a position
 */
export interface OpenPositionParams {
  coin: string;
  side: OrderSide;
  
  /** Market type: 'perp' for perpetuals, 'spot' for spot trading */
  market?: 'spot' | 'perp';
  
  /** Position size in USD or in coin units */
  sizeUsd?: number;
  sizeCoin?: number;
  
  /** Leverage (defaults to account leverage, perps only) */
  leverage?: number;
  
  /** Stop-loss price or percentage below entry (perps only) */
  stopLossPrice?: number;
  stopLossPercent?: number;
  
  /** Take-profit price or percentage above entry (perps only) */
  takeProfitPrice?: number;
  takeProfitPercent?: number;
  
  /** Max slippage percentage (default 1%) */
  slippagePercent?: number;
  
  /** Order type (default: market) */
  orderType?: OrderType;
  
  /** Limit price (required if orderType is 'limit') */
  limitPrice?: number;
}

/**
 * Order parameters for closing a position
 */
export interface ClosePositionParams {
  coin: string;
  
  /** Percentage of position to close (default: 100) */
  percent?: number;
  
  /** Max slippage percentage (default 1%) */
  slippagePercent?: number;
}

/**
 * Action result
 */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  gasUsed?: number;
  timestamp: number;
}

/**
 * Agent action - standardized format for AI agents
 */
export interface AgentAction {
  type: 'get_markets' | 'get_positions' | 'open_position' | 'close_position' | 
        'set_leverage' | 'get_balance' | 'cancel_orders';
  params: Record<string, unknown>;
  metadata?: {
    reasoning?: string;
    confidence?: number;
  };
}

/**
 * Trade log entry
 */
export interface TradeLog {
  id: string;
  timestamp: number;
  action: 'open' | 'close' | 'modify';
  coin: string;
  side?: OrderSide;
  size?: number;
  price?: number;
  pnl?: number;
  pnlPercent?: number;
  reason?: string;
  success: boolean;
  error?: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent name/identifier */
  name: string;
  
  /** Trading instructions/strategy description */
  instructions: string;
  
  /** Risk configuration */
  riskConfig: RiskConfig;
  
  /** Execution interval in milliseconds */
  intervalMs?: number;
  
  /** Maximum actions per interval */
  maxActionsPerInterval?: number;
  
  /** Enable paper trading mode */
  paperTrading?: boolean;
}

/**
 * Agent state
 */
export interface AgentState {
  name: string;
  isRunning: boolean;
  startedAt: number | null;
  lastTickAt: number | null;
  nextTickAt: number | null;
  tickCount: number;
  totalTrades: number;
  totalPnl: number;
  dailyPnl: number;
  errors: string[];
}

/**
 * KMS provider configuration
 */
export interface KMSConfig {
  provider: 'aws' | 'gcp' | 'azure';
  keyId: string;
  region?: string;
  credentials?: unknown;
}

/**
 * MPC provider configuration
 */
export interface MPCConfig {
  provider: 'fireblocks' | 'qredo' | 'turnkey';
  vaultId: string;
  apiKey: string;
  apiSecret?: string;
  baseUrl?: string;
}

/**
 * Hardware wallet configuration
 */
export interface HardwareWalletConfig {
  type: 'ledger' | 'trezor';
  derivationPath: string;
  transport?: 'usb' | 'bluetooth';
}
