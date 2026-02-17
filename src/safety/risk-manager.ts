/**
 * Risk management and safety checks
 */

import type { RiskConfig, Position, OpenPositionParams } from '../types/index.js';

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
}

/**
 * Risk manager enforces trading limits and safety rules
 */
export class RiskManager {
  #config: RiskConfig;
  #dailyPnl = 0;
  #dailyPnlResetTime = Date.now();
  #tradesLog: Array<{ timestamp: number; pnl: number }> = [];

  constructor(config: RiskConfig) {
    this.#config = this.validateConfig(config);
  }

  private validateConfig(config: RiskConfig): RiskConfig {
    if (config.maxLeverage <= 0 || config.maxLeverage > 50) {
      throw new Error('maxLeverage must be between 1 and 50');
    }
    
    if (config.maxPositionSizeUsd <= 0) {
      throw new Error('maxPositionSizeUsd must be positive');
    }
    
    if (config.maxDailyLoss && config.maxDailyLoss <= 0) {
      throw new Error('maxDailyLoss must be positive');
    }
    
    if (config.maxDrawdownPercent && (config.maxDrawdownPercent <= 0 || config.maxDrawdownPercent > 100)) {
      throw new Error('maxDrawdownPercent must be between 0 and 100');
    }
    
    if (config.maxOpenPositions && config.maxOpenPositions <= 0) {
      throw new Error('maxOpenPositions must be positive');
    }
    
    return config;
  }

  /**
   * Check if opening a new position is allowed
   */
  checkOpenPosition(
    params: OpenPositionParams,
    currentPositions: Position[],
    accountBalance: number
  ): RiskCheckResult {
    const warnings: string[] = [];

    // Check leverage
    if (params.leverage && params.leverage > this.#config.maxLeverage) {
      return {
        allowed: false,
        reason: `Leverage ${params.leverage}x exceeds maximum ${this.#config.maxLeverage}x`,
      };
    }

    // Check position size
    const positionSizeUsd = params.sizeUsd || 0;
    if (positionSizeUsd > this.#config.maxPositionSizeUsd) {
      return {
        allowed: false,
        reason: `Position size $${positionSizeUsd} exceeds maximum $${this.#config.maxPositionSizeUsd}`,
      };
    }

    // Check max open positions
    if (this.#config.maxOpenPositions) {
      const existingPosition = currentPositions.find(p => p.coin === params.coin);
      const effectivePositionCount = existingPosition 
        ? currentPositions.length 
        : currentPositions.length + 1;

      if (effectivePositionCount > this.#config.maxOpenPositions) {
        return {
          allowed: false,
          reason: `Already at maximum ${this.#config.maxOpenPositions} open positions`,
        };
      }
    }

    // Check daily loss limit
    if (this.#config.maxDailyLoss) {
      this.updateDailyPnl();
      if (Math.abs(this.#dailyPnl) >= this.#config.maxDailyLoss) {
        return {
          allowed: false,
          reason: `Daily loss limit reached: $${Math.abs(this.#dailyPnl).toFixed(2)} / $${this.#config.maxDailyLoss}`,
        };
      }

      const potentialLoss = positionSizeUsd * 0.1; // Assume max 10% loss per trade
      if (Math.abs(this.#dailyPnl) + potentialLoss >= this.#config.maxDailyLoss) {
        warnings.push(`Close to daily loss limit: $${Math.abs(this.#dailyPnl).toFixed(2)} / $${this.#config.maxDailyLoss}`);
      }
    }

    // Check drawdown
    if (this.#config.maxDrawdownPercent) {
      const totalUnrealizedPnl = currentPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
      const drawdownPercent = (Math.abs(totalUnrealizedPnl) / accountBalance) * 100;
      
      if (drawdownPercent >= this.#config.maxDrawdownPercent) {
        return {
          allowed: false,
          reason: `Drawdown ${drawdownPercent.toFixed(1)}% exceeds maximum ${this.#config.maxDrawdownPercent}%`,
        };
      }

      if (drawdownPercent >= this.#config.maxDrawdownPercent * 0.8) {
        warnings.push(`Close to drawdown limit: ${drawdownPercent.toFixed(1)}% / ${this.#config.maxDrawdownPercent}%`);
      }
    }

    // Check stop-loss requirement
    if (this.#config.requireStopLoss && !params.stopLossPrice && !params.stopLossPercent) {
      return {
        allowed: false,
        reason: 'Stop-loss is required but not provided',
      };
    }

    // Check account balance
    const marginRequired = positionSizeUsd / (params.leverage || 1);
    if (marginRequired > accountBalance * 0.9) {
      return {
        allowed: false,
        reason: `Insufficient margin: required $${marginRequired.toFixed(2)}, available $${accountBalance.toFixed(2)}`,
      };
    }

    if (marginRequired > accountBalance * 0.7) {
      warnings.push(`High margin usage: ${((marginRequired / accountBalance) * 100).toFixed(1)}%`);
    }

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Record a trade for tracking purposes
   */
  recordTrade(pnl: number): void {
    this.updateDailyPnl();
    this.#dailyPnl += pnl;
    this.#tradesLog.push({ timestamp: Date.now(), pnl });
    
    // Keep only last 1000 trades
    if (this.#tradesLog.length > 1000) {
      this.#tradesLog = this.#tradesLog.slice(-1000);
    }
  }

  /**
   * Reset daily PnL counter if a new day has started
   */
  private updateDailyPnl(): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    if (now - this.#dailyPnlResetTime >= dayMs) {
      this.#dailyPnl = 0;
      this.#dailyPnlResetTime = now;
    }
  }

  /**
   * Get current daily PnL
   */
  getDailyPnl(): number {
    this.updateDailyPnl();
    return this.#dailyPnl;
  }

  /**
   * Get risk config
   */
  getConfig(): Readonly<RiskConfig> {
    return { ...this.#config };
  }

  /**
   * Update risk config
   */
  updateConfig(config: Partial<RiskConfig>): void {
    this.#config = this.validateConfig({ ...this.#config, ...config });
  }

  /**
   * Calculate position risk metrics
   */
  calculatePositionRisk(position: Position): {
    riskAmount: number;
    riskPercent: number;
    rewardRatio?: number;
  } {
    const positionValue = Math.abs(position.size * position.currentPrice);
    
    let riskAmount = 0;
    let rewardAmount = 0;

    if (position.stopLoss) {
      const stopDistance = Math.abs(position.currentPrice - position.stopLoss);
      riskAmount = Math.abs(position.size) * stopDistance;
    }

    if (position.takeProfit) {
      const profitDistance = Math.abs(position.takeProfit - position.currentPrice);
      rewardAmount = Math.abs(position.size) * profitDistance;
    }

    const riskPercent = (riskAmount / positionValue) * 100;
    const rewardRatio = riskAmount > 0 && rewardAmount > 0 
      ? rewardAmount / riskAmount 
      : undefined;

    return { riskAmount, riskPercent, rewardRatio };
  }

  /**
   * Get risk statistics
   */
  getStats(): {
    dailyPnl: number;
    totalTrades: number;
    avgPnl: number;
    winRate: number;
  } {
    this.updateDailyPnl();
    
    const dailyTrades = this.#tradesLog.filter(t => 
      Date.now() - t.timestamp < 24 * 60 * 60 * 1000
    );

    const totalPnl = dailyTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winningTrades = dailyTrades.filter(t => t.pnl > 0).length;

    return {
      dailyPnl: this.#dailyPnl,
      totalTrades: dailyTrades.length,
      avgPnl: dailyTrades.length > 0 ? totalPnl / dailyTrades.length : 0,
      winRate: dailyTrades.length > 0 ? (winningTrades / dailyTrades.length) * 100 : 0,
    };
  }
}
