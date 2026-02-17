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
]);

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
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
