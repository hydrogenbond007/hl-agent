/**
 * OpenAI function calling tool definitions
 * These allow external LLM frameworks to use the Hyperliquid toolkit
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export interface OpenAIFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface OpenAIToolDefinition {
  type: 'function';
  function: OpenAIFunctionDefinition;
}

interface InjectableSkill {
  id: string;
  name: string;
  category: 'execution' | 'risk' | 'yield' | 'analytics';
  description: string;
  priceUsd: number;
  capabilities: string[];
}

const NUMERIC_FIELDS = new Set([
  'sizeUsd',
  'sizeCoin',
  'leverage',
  'stopLossPercent',
  'stopLossPrice',
  'takeProfitPercent',
  'takeProfitPrice',
  'slippagePercent',
  'limitPrice',
  'percent',
  'depth',
  'initialUsd',
  'amountUsd',
  'amountToken',
  'maxSpendUsd',
]);

const INJECTABLE_SKILLS: InjectableSkill[] = [
  {
    id: 'hl.spot-executor.v1',
    name: 'Spot Executor',
    category: 'execution',
    description: 'Executes spot entries/exits with minimum notional and slippage checks.',
    priceUsd: 19,
    capabilities: ['spot-entry', 'spot-exit', 'slippage-guard'],
  },
  {
    id: 'hl.perp-executor.v1',
    name: 'Perp Executor',
    category: 'execution',
    description: 'Executes perp orders with leverage, reduce-only close, and TP/SL support.',
    priceUsd: 29,
    capabilities: ['perp-entry', 'perp-close', 'tp-sl-orders'],
  },
  {
    id: 'hl.risk-guard.v1',
    name: 'Risk Guard',
    category: 'risk',
    description: 'Blocks unsafe actions using max leverage, exposure, and drawdown limits.',
    priceUsd: 25,
    capabilities: ['max-leverage', 'position-limits', 'drawdown-kill-switch'],
  },
  {
    id: 'hl.vault-allocator.v1',
    name: 'Vault Allocator',
    category: 'yield',
    description: 'Automates vault discovery and allocation flows with deposit/withdraw rules.',
    priceUsd: 22,
    capabilities: ['vault-discovery', 'vault-allocate', 'vault-rebalance'],
  },
  {
    id: 'hl.staking-manager.v1',
    name: 'Staking Manager',
    category: 'yield',
    description: 'Handles staking deposits, delegation, undelegation, and reward claims.',
    priceUsd: 18,
    capabilities: ['staking-deposit', 'delegate', 'claim-rewards'],
  },
];

function normalizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (NUMERIC_FIELDS.has(key)) {
        const parsed = Number(trimmed);
        normalized[key] = Number.isFinite(parsed) ? parsed : value;
      } else {
        normalized[key] = trimmed;
      }
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function coerceToolParams(params: unknown): Record<string, unknown> {
  if (!params) return {};

  if (typeof params === 'string') {
    const trimmed = params.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  if (typeof params === 'object') {
    return params as Record<string, unknown>;
  }

  return {};
}

function normalizeOpenPositionParams(params: Record<string, unknown>): Record<string, unknown> {
  const normalized = normalizeParams(params);

  if (typeof normalized.coin === 'string') {
    normalized.coin = normalized.coin.trim().toUpperCase();
  }

  if (typeof normalized.side === 'string') {
    normalized.side = normalized.side.trim().toLowerCase();
  }

  if (typeof normalized.market === 'string') {
    normalized.market = normalized.market.trim().toLowerCase();
  }

  if (typeof normalized.orderType === 'string') {
    normalized.orderType = normalized.orderType.trim().toLowerCase();
  }

  return normalized;
}

/**
 * Get tool definitions compatible with OpenAI function calling
 * Can be used with LangChain, LlamaIndex, or directly with OpenAI SDK
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'buy_skill',
      description: 'List and purchase injectable skills for the Maitrix tools section. Call without skillId to view available skills.',
      parameters: {
        type: 'object',
        properties: {
          skillId: {
            type: 'string',
            description: 'Skill ID to purchase and inject (leave empty to list skills).',
          },
          targetAgent: {
            type: 'string',
            description: 'Optional Maitrix agent/workspace target for injection.',
          },
          maxSpendUsd: {
            type: 'number',
            description: 'Optional spending cap in USD. Purchase fails if price exceeds this cap.',
          },
          autoInject: {
            type: 'boolean',
            description: 'If true, returns an injection-ready payload for Maitrix tools.',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_markets',
      description: 'Get current market data for cryptocurrencies on Hyperliquid. Returns price, volume, funding rate, and open interest.',
      parameters: {
        type: 'object',
        properties: {
          coins: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of coin symbols to get data for (e.g., ["BTC", "ETH"]). Leave empty for all markets.',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_positions',
      description: 'Get all currently open positions with PnL, entry price, and leverage information.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_balance',
      description: 'Get account balance, available funds, and margin usage.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'open_position',
      description: 'Open a perp or spot order on Hyperliquid. Supports market/limit and optional TP/SL for perps.',
      parameters: {
        type: 'object',
        properties: {
          coin: {
            type: 'string',
            description: 'Coin symbol or spot pair (e.g., "BTC", "ETH", "HYPE", "HYPE/USDC")',
          },
          side: {
            type: 'string',
            enum: ['long', 'short', 'buy', 'sell'],
            description: 'Position side: long/buy or short/sell',
          },
          market: {
            type: 'string',
            enum: ['perp', 'spot'],
            description: 'Market type: perp (default) or spot',
          },
          sizeUsd: {
            type: 'number',
            description: 'Order size in USD notionals (use sizeUsd or sizeCoin)',
          },
          sizeCoin: {
            type: 'number',
            description: 'Order size in coin units (use sizeUsd or sizeCoin)',
          },
          orderType: {
            type: 'string',
            enum: ['market', 'limit'],
            description: 'Order type (default market)',
          },
          limitPrice: {
            type: 'number',
            description: 'Limit order price; required for limit orders',
          },
          leverage: {
            type: 'number',
            description: 'Leverage multiplier for perps only (e.g., 5 for 5x)',
          },
          stopLossPrice: {
            type: 'number',
            description: 'Absolute stop-loss trigger price (perps only)',
          },
          stopLossPercent: {
            type: 'number',
            description: 'Stop-loss percentage from entry (perps only)',
          },
          takeProfitPrice: {
            type: 'number',
            description: 'Absolute take-profit trigger price (perps only)',
          },
          takeProfitPercent: {
            type: 'number',
            description: 'Take-profit percentage from entry (perps only)',
          },
          slippagePercent: {
            type: 'number',
            description: 'Maximum acceptable slippage (default 1%)',
          },
        },
        required: ['coin', 'side'],
      },
    },
    {
      name: 'close_position',
      description: 'Close an existing position partially or fully.',
      parameters: {
        type: 'object',
        properties: {
          coin: {
            type: 'string',
            description: 'Coin symbol of the position to close',
          },
          percent: {
            type: 'number',
            description: 'Percentage of position to close (default 100 = full close)',
          },
          slippagePercent: {
            type: 'number',
            description: 'Maximum acceptable slippage (default 1%)',
          },
        },
        required: ['coin'],
      },
    },
    {
      name: 'cancel_orders',
      description: 'Cancel open limit orders.',
      parameters: {
        type: 'object',
        properties: {
          coin: {
            type: 'string',
            description: 'Cancel orders for specific coin (leave empty to cancel all)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_orderbook',
      description: 'Get level 2 order book with bids and asks.',
      parameters: {
        type: 'object',
        properties: {
          coin: {
            type: 'string',
            description: 'Coin symbol',
          },
          depth: {
            type: 'number',
            description: 'Number of levels to return (default 10)',
          },
        },
        required: ['coin'],
      },
    },
    {
      name: 'get_vault_summaries',
      description: 'Get recent vault summaries.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_vault_details',
      description: 'Get details for a specific vault address.',
      parameters: {
        type: 'object',
        properties: {
          vaultAddress: {
            type: 'string',
            description: 'Vault address (0x...)',
          },
        },
        required: ['vaultAddress'],
      },
    },
    {
      name: 'get_user_vaults',
      description: 'Get vault equities/deposits for a user (defaults to connected wallet).',
      parameters: {
        type: 'object',
        properties: {
          user: {
            type: 'string',
            description: 'User address (optional)',
          },
        },
        required: [],
      },
    },
    {
      name: 'create_vault',
      description: 'Create a new vault with an initial USD deposit.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Vault name' },
          description: { type: 'string', description: 'Vault description' },
          initialUsd: { type: 'number', description: 'Initial deposit amount in USD' },
        },
        required: ['name', 'description', 'initialUsd'],
      },
    },
    {
      name: 'vault_transfer',
      description: 'Deposit to or withdraw from a vault.',
      parameters: {
        type: 'object',
        properties: {
          vaultAddress: { type: 'string', description: 'Vault address (0x...)' },
          isDeposit: { type: 'boolean', description: 'True to deposit, false to withdraw' },
          amountUsd: { type: 'number', description: 'Amount in USD' },
        },
        required: ['vaultAddress', 'isDeposit', 'amountUsd'],
      },
    },
    {
      name: 'get_staking_summary',
      description: 'Get staking summary for a user (defaults to connected wallet).',
      parameters: {
        type: 'object',
        properties: {
          user: { type: 'string', description: 'User address (optional)' },
        },
        required: [],
      },
    },
    {
      name: 'get_staking_rewards',
      description: 'Get staking rewards history for a user (defaults to connected wallet).',
      parameters: {
        type: 'object',
        properties: {
          user: { type: 'string', description: 'User address (optional)' },
        },
        required: [],
      },
    },
    {
      name: 'staking_deposit',
      description: 'Deposit native token into staking balance.',
      parameters: {
        type: 'object',
        properties: {
          amountToken: { type: 'number', description: 'Amount in token units (e.g., HYPE)' },
        },
        required: ['amountToken'],
      },
    },
    {
      name: 'staking_withdraw',
      description: 'Withdraw native token from staking balance.',
      parameters: {
        type: 'object',
        properties: {
          amountToken: { type: 'number', description: 'Amount in token units (e.g., HYPE)' },
        },
        required: ['amountToken'],
      },
    },
    {
      name: 'delegate_stake',
      description: 'Delegate or undelegate staked tokens to a validator.',
      parameters: {
        type: 'object',
        properties: {
          validator: { type: 'string', description: 'Validator address (0x...)' },
          amountToken: { type: 'number', description: 'Amount in token units (e.g., HYPE)' },
          isUndelegate: { type: 'boolean', description: 'Set true to undelegate' },
        },
        required: ['validator', 'amountToken'],
      },
    },
    {
      name: 'claim_rewards',
      description: 'Claim available rewards.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}

/**
 * OpenAI Chat Completions / Responses API `tools` format.
 */
export function getOpenAITools(): OpenAIToolDefinition[] {
  return getToolDefinitions().map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: tool.parameters.type,
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    },
  }));
}

/**
 * Legacy OpenAI function-calling format.
 */
export function getOpenAIFunctions(): OpenAIFunctionDefinition[] {
  return getToolDefinitions().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: tool.parameters.type,
      properties: tool.parameters.properties,
      required: tool.parameters.required,
    },
  }));
}

/**
 * Get tool definitions in LangChain format
 */
export function getLangChainTools(): any[] {
  // TODO: Implement actual LangChain tool wrappers
  // This would return DynamicStructuredTool instances
  throw new Error('LangChain integration not yet implemented');
}

/**
 * Execute a tool by name with parameters
 * This is the handler that external frameworks should call
 */
export async function executeTool(
  toolName: string,
  params: Record<string, unknown> | string,
  toolkit: any // HyperliquidAgentToolkit
): Promise<any> {
  const safeParams = normalizeParams(coerceToolParams(params));

  switch (toolName) {
    case 'buy_skill':
      return executeBuySkillTool(safeParams);
    case 'get_markets':
      return toolkit.getMarketData(safeParams);
    case 'get_positions':
      return toolkit.getPositions();
    case 'get_balance':
      return toolkit.getBalance();
    case 'open_position':
      return toolkit.openPosition(normalizeOpenPositionParams(safeParams));
    case 'close_position':
      return toolkit.closePosition(safeParams);
    case 'cancel_orders':
      return toolkit.cancelOrders(safeParams);
    case 'get_orderbook':
      return toolkit.getOrderBook(safeParams);
    case 'get_vault_summaries':
      return toolkit.getVaultSummaries();
    case 'get_vault_details':
      return toolkit.getVaultDetails(safeParams);
    case 'get_user_vaults':
      return toolkit.getUserVaults(safeParams);
    case 'create_vault':
      return toolkit.createVault(safeParams);
    case 'vault_transfer':
      return toolkit.vaultTransfer(safeParams);
    case 'get_staking_summary':
      return toolkit.getStakingSummary(safeParams);
    case 'get_staking_rewards':
      return toolkit.getStakingRewards(safeParams);
    case 'staking_deposit':
      return toolkit.stakingDeposit(safeParams);
    case 'staking_withdraw':
      return toolkit.stakingWithdraw(safeParams);
    case 'delegate_stake':
      return toolkit.delegateStake(safeParams);
    case 'claim_rewards':
      return toolkit.claimRewards();
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function executeBuySkillTool(params: Record<string, unknown>): {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
} {
  const timestamp = Date.now();
  const requestedSkillId = typeof params.skillId === 'string'
    ? params.skillId.trim().toLowerCase()
    : '';

  if (!requestedSkillId) {
    return {
      success: true,
      data: {
        mode: 'catalog',
        skills: INJECTABLE_SKILLS,
        count: INJECTABLE_SKILLS.length,
        message: 'Pass skillId to buy and get an injection payload for the Maitrix tools section.',
      },
      timestamp,
    };
  }

  const selected = INJECTABLE_SKILLS.find(skill => skill.id.toLowerCase() === requestedSkillId);
  if (!selected) {
    return {
      success: false,
      error: `Unknown skillId "${requestedSkillId}". Available skillIds: ${INJECTABLE_SKILLS.map(skill => skill.id).join(', ')}`,
      timestamp,
    };
  }

  if (typeof params.maxSpendUsd === 'number' && Number.isFinite(params.maxSpendUsd) && params.maxSpendUsd < selected.priceUsd) {
    return {
      success: false,
      error: `Skill ${selected.id} costs ${selected.priceUsd} USD which is above maxSpendUsd=${params.maxSpendUsd}.`,
      timestamp,
    };
  }

  const targetAgent = typeof params.targetAgent === 'string' && params.targetAgent.trim()
    ? params.targetAgent.trim()
    : 'default-agent';
  const autoInject = params.autoInject === true;

  return {
    success: true,
    data: {
      mode: 'purchase',
      purchased: true,
      skill: selected,
      targetAgent,
      autoInject,
      invoice: {
        currency: 'USDC',
        amountUsd: selected.priceUsd,
      },
      maitrixInjection: {
        tool: 'buy_skill',
        skillId: selected.id,
        targetAgent,
        enabledCapabilities: selected.capabilities,
      },
      message: autoInject
        ? 'Use maitrixInjection directly in the Maitrix tools section.'
        : 'Set autoInject=true to receive an injection-ready configuration payload.',
    },
    timestamp,
  };
}
