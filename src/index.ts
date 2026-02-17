/**
 * Hyperliquid Agent SDK
 * 
 * A secure, high-level toolkit for building AI trading agents on Hyperliquid DEX
 */

// ============================================
// Wallets
// ============================================
export { 
  BaseWallet,
  EnvWallet,
  KMSWallet,
  PrivyWallet,
  TurnkeyWallet,
  createPrivyWallet,
  validateWalletConfig 
} from './wallets/index.js';

export type { 
  PrivyWalletConfig,
  TurnkeyWalletConfig,
} from './wallets/index.js';

// ============================================
// Toolkit
// ============================================
export { 
  HyperliquidAgentToolkit,
  EnhancedHyperliquidToolkit 
} from './toolkit/index.js';

export type { HyperliquidToolkitConfig } from './toolkit/index.js';

// ============================================
// Agent Framework
// ============================================
export { 
  HyperliquidAgent,
  OpenAIAdapter,
  AnthropicAdapter,
  startAgentMonitorServer,
} from './agent/index.js';

export type { 
  AgentModelAdapter,
  AgentExecutionContext,
  OpenAIAdapterConfig,
  AnthropicAdapterConfig,
  AgentMonitorServer,
  AgentMonitorServerConfig,
} from './agent/index.js';

// ============================================
// Safety & Risk Management
// ============================================
export { 
  RiskManager 
} from './safety/index.js';

export type { RiskCheckResult } from './safety/index.js';

// ============================================
// Security
// ============================================
export { AgentVault } from './security/vault.js';
export type { VaultConfig, VaultEntry } from './security/vault.js';

export { 
  initTEE,
  createTEEWallet,
  verifyAgentTEE,
} from './security/tee.js';

export type { 
  TEEConfig,
  TEEEnvironment,
  TEEAttestation,
} from './security/tee.js';

// ============================================
// Integrations
// ============================================
export { 
  getToolDefinitions,
  getOpenAITools,
  getOpenAIFunctions,
  executeTool,
} from './integrations/openai-tools.js';

export type { 
  ToolDefinition,
  OpenAIToolDefinition,
  OpenAIFunctionDefinition,
} from './integrations/openai-tools.js';

// ============================================
// Types
// ============================================
export type {
  IWallet,
  Network,
  OrderSide,
  OrderType,
  RiskConfig,
  MarketData,
  Position,
  OpenPositionParams,
  ClosePositionParams,
  ActionResult,
  AgentAction,
  TradeLog,
  AgentConfig,
  AgentState,
  KMSConfig,
  MPCConfig,
  HardwareWalletConfig,
} from './types/index.js';

// ============================================
// Package Info
// ============================================
export const VERSION = '0.1.0';
export const SDK_NAME = '@hyperliquid/agent-sdk';
