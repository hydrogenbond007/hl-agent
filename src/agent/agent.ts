/**
 * Autonomous agent that can trade on Hyperliquid
 * Integrates with LLM providers (OpenAI, Anthropic, etc.)
 */

import type { HyperliquidAgentToolkit } from '../toolkit/hyperliquid-toolkit.js';
import type { 
  AgentConfig, 
  AgentState, 
  TradeLog,
  AgentAction 
} from '../types/index.js';

export interface AgentExecutionContext {
  /** Current market conditions */
  markets?: unknown;
  /** Open positions */
  positions?: unknown;
  /** Account balance */
  balance?: unknown;
  /** Recent trade history */
  recentTrades?: TradeLog[];
}

export interface AgentModelAdapter {
  /**
   * Generate next action(s) based on current context
   * Should return structured actions that the agent can execute
   */
  generateActions(
    instructions: string,
    context: AgentExecutionContext,
    options?: { maxActions?: number }
  ): Promise<AgentAction[]>;
}

/**
 * Autonomous trading agent
 * 
 * Can run in two modes:
 * 1. Autonomous: Continuously monitors and trades based on strategy
 * 2. On-demand: Executes specific actions when requested
 */
export class HyperliquidAgent {
  readonly #toolkit: HyperliquidAgentToolkit;
  readonly #config: AgentConfig;
  readonly #modelAdapter: AgentModelAdapter;
  readonly #state: AgentState;
  readonly #tradeLogs: TradeLog[] = [];
  
  #intervalHandle?: NodeJS.Timeout;
  #isExecuting = false;

  constructor(
    toolkit: HyperliquidAgentToolkit,
    config: AgentConfig,
    modelAdapter: AgentModelAdapter
  ) {
    this.#toolkit = toolkit;
    this.#config = config;
    this.#modelAdapter = modelAdapter;
    
    this.#state = {
      name: config.name,
      isRunning: false,
      startedAt: null,
      lastTickAt: null,
      nextTickAt: null,
      tickCount: 0,
      totalTrades: 0,
      totalPnl: 0,
      dailyPnl: 0,
      errors: [],
    };
  }

  /**
   * Start autonomous execution
   */
  async start(): Promise<void> {
    if (this.#state.isRunning) {
      throw new Error('Agent is already running');
    }

    console.log(`[Agent:${this.#config.name}] Starting autonomous execution`);
    
    this.#state.isRunning = true;
    this.#state.startedAt = Date.now();
    
    const intervalMs = this.#config.intervalMs || 60_000; // Default: 1 minute
    
    // Execute immediately
    await this.#tick();
    
    // Schedule periodic execution
    this.#intervalHandle = setInterval(() => {
      this.#tick().catch(err => {
        console.error(`[Agent:${this.#config.name}] Tick error:`, err);
        this.#state.errors.push(err.message);
      });
    }, intervalMs);
  }

  /**
   * Stop autonomous execution
   */
  async stop(): Promise<void> {
    if (!this.#state.isRunning) {
      return;
    }

    console.log(`[Agent:${this.#config.name}] Stopping autonomous execution`);
    
    if (this.#intervalHandle) {
      clearInterval(this.#intervalHandle);
      this.#intervalHandle = undefined;
    }
    
    this.#state.isRunning = false;
    this.#state.nextTickAt = null;
  }

  /**
   * Execute one tick of the agent loop
   */
  async #tick(): Promise<void> {
    if (this.#isExecuting) {
      console.warn(`[Agent:${this.#config.name}] Skipping tick - already executing`);
      return;
    }

    this.#isExecuting = true;
    
    try {
      this.#state.tickCount++;
      this.#state.lastTickAt = Date.now();
      
      // Gather current context
      const context = await this.#gatherContext();
      
      // Generate actions using LLM
      const maxActions = this.#config.maxActionsPerInterval || 3;
      const actions = await this.#modelAdapter.generateActions(
        this.#config.instructions,
        context,
        { maxActions }
      );

      // Execute each action
      for (const action of actions) {
        await this.#executeAction(action);
      }
      
      // Update next tick time
      const intervalMs = this.#config.intervalMs || 60_000;
      this.#state.nextTickAt = Date.now() + intervalMs;
      
    } catch (error) {
      console.error(`[Agent:${this.#config.name}] Error during tick:`, error);
      this.#state.errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      this.#isExecuting = false;
    }
  }

  /**
   * Gather current market context for decision making
   */
  async #gatherContext(): Promise<AgentExecutionContext> {
    const [marketsResult, positionsResult, balanceResult] = await Promise.all([
      this.#toolkit.getMarketData(),
      this.#toolkit.getPositions(),
      this.#toolkit.getBalance(),
    ]);

    return {
      markets: marketsResult.success ? marketsResult.data : undefined,
      positions: positionsResult.success ? positionsResult.data : undefined,
      balance: balanceResult.success ? balanceResult.data : undefined,
      recentTrades: this.#tradeLogs.slice(-10),
    };
  }

  /**
   * Execute a single agent action
   */
  async #executeAction(action: AgentAction): Promise<void> {
    console.log(`[Agent:${this.#config.name}] Executing action:`, action.type);

    // Paper trading mode
    if (this.#config.paperTrading) {
      console.log(`[Agent:${this.#config.name}] Paper trading - action simulated:`, action);
      return;
    }

    let result;
    
    switch (action.type) {
      case 'get_markets':
        result = await this.#toolkit.getMarketData(action.params as any);
        break;
        
      case 'get_positions':
        result = await this.#toolkit.getPositions();
        break;
        
      case 'open_position':
        result = await this.#toolkit.openPosition(action.params as any);
        if (result.success) {
          this.#state.totalTrades++;
        }
        break;
        
      case 'close_position':
        result = await this.#toolkit.closePosition(action.params as any);
        if (result.success) {
          this.#state.totalTrades++;
        }
        break;
        
      case 'cancel_orders':
        result = await this.#toolkit.cancelOrders(action.params as any);
        break;
        
      case 'get_balance':
        result = await this.#toolkit.getBalance();
        break;
        
      default:
        console.warn(`[Agent:${this.#config.name}] Unknown action type:`, action.type);
        return;
    }

    // Log trade
    const log: TradeLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      action: action.type === 'open_position' ? 'open' : 
              action.type === 'close_position' ? 'close' : 'modify',
      coin: (action.params as any).coin || 'unknown',
      success: result.success,
      error: result.error,
      reason: action.metadata?.reasoning,
    };
    
    this.#tradeLogs.push(log);
  }

  /**
   * Execute a single action on-demand (not autonomous)
   */
  async executeAction(action: AgentAction): Promise<void> {
    if (this.#state.isRunning) {
      throw new Error('Cannot execute manual actions while agent is running autonomously');
    }
    
    await this.#executeAction(action);
  }

  /**
   * Get current agent state
   */
  getState(): Readonly<AgentState> {
    return { ...this.#state };
  }

  /**
   * Get trade logs
   */
  getTradeLogs(limit?: number): readonly TradeLog[] {
    if (limit) {
      return this.#tradeLogs.slice(-limit);
    }
    return [...this.#tradeLogs];
  }

  /**
   * Get agent configuration
   */
  getConfig(): Readonly<AgentConfig> {
    return { ...this.#config };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    await this.stop();
  }
}
