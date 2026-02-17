/**
 * High-level toolkit for Hyperliquid trading operations
 * Provides AI-friendly actions with built-in safety checks
 */

import {
  HttpTransport,
  InfoClient,
  ExchangeClient,
} from '@nktkas/hyperliquid';
import type {
  IWallet,
  Network,
  RiskConfig,
  MarketData,
  Position,
  OpenPositionParams,
  ClosePositionParams,
  ActionResult,
} from '../types/index.js';
import { RiskManager } from '../safety/risk-manager.js';
import { validateWalletConfig } from '../wallets/base.js';

export interface HyperliquidToolkitConfig {
  wallet: IWallet;
  network?: Network;
  riskConfig?: RiskConfig;
  defaultSlippagePercent?: number;
}

/**
 * High-level toolkit for trading on Hyperliquid
 * 
 * Provides:
 * - Simple, AI-friendly actions
 * - Built-in risk management
 * - Automatic stop-loss/take-profit
 * - Position tracking
 * - Error handling
 */
export class HyperliquidAgentToolkit {
  readonly #wallet: IWallet;
  readonly #network: Network;
  readonly #infoClient: InfoClient;
  readonly #exchangeClient: ExchangeClient;
  readonly #riskManager?: RiskManager;
  readonly #defaultSlippage: number;
  
  #assetMap: Record<string, { index: number; szDecimals: number }> | null = null;
  #spotAssetMap: Record<string, { index: number; pairName: string; szDecimals: number }> | null = null;

  constructor(config: HyperliquidToolkitConfig) {
    validateWalletConfig(config.wallet);
    
    this.#wallet = config.wallet;
    this.#network = config.network || 'mainnet';
    this.#defaultSlippage = config.defaultSlippagePercent || 1;

    const isTestnet = this.#network === 'testnet';
    const transport = new HttpTransport({ isTestnet });

    this.#infoClient = new InfoClient({ transport });
    this.#exchangeClient = new ExchangeClient({ 
      transport,
      wallet: this.#wallet 
    });

    if (config.riskConfig) {
      this.#riskManager = new RiskManager(config.riskConfig);
    }
  }

  // ============================================
  // Market Data Actions
  // ============================================

  /**
   * Get market data for specified coins
   */
  async getMarketData(params: { 
    coins?: string[] 
  } = {}): Promise<ActionResult<MarketData[]>> {
    try {
      const [mids, meta, assetCtxs] = await Promise.all([
        this.#infoClient.allMids(),
        this.#infoClient.meta(),
        this.#infoClient.metaAndAssetCtxs(),
      ]);

      const ctxs = assetCtxs[1];
      const filterCoins = params.coins?.map(c => c.toUpperCase());

      const markets: MarketData[] = meta.universe
        .filter(asset => !filterCoins || filterCoins.includes(asset.name))
        .map((asset, i) => {
          const ctx = ctxs[i];
          return {
            coin: asset.name,
            price: parseFloat(mids[asset.name] || '0'),
            change24h: 0, // TODO: Calculate from historical data
            volume24h: ctx ? parseFloat(String(ctx.dayNtlVlm || '0')) : 0,
            fundingRate: ctx ? parseFloat(String(ctx.funding || '0')) * 100 : 0,
            openInterest: ctx ? parseFloat(String(ctx.openInterest || '0')) : 0,
          };
        });

      return {
        success: true,
        data: markets,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get order book (L2 data) for a coin
   */
  async getOrderBook(params: { 
    coin: string;
    depth?: number;
  }): Promise<ActionResult<{ bids: [number, number][]; asks: [number, number][] }>> {
    try {
      const book = await this.#infoClient.l2Book({ 
        coin: params.coin,
        nSigFigs: 5 
      });

      if (!book) {
        throw new Error(`No order book available for ${params.coin}`);
      }

      const depth = params.depth || 10;
      
      return {
        success: true,
        data: {
          bids: book.levels[0].slice(0, depth).map(level => [parseFloat(level.px), parseFloat(level.sz)]),
          asks: book.levels[1].slice(0, depth).map(level => [parseFloat(level.px), parseFloat(level.sz)]),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  // ============================================
  // Position Management Actions
  // ============================================

  /**
   * Get current open positions
   */
  async getPositions(): Promise<ActionResult<Position[]>> {
    try {
      const state = await this.#infoClient.clearinghouseState({ 
        user: this.#wallet.address 
      });

      const mids = await this.#infoClient.allMids();

      const positions: Position[] = state.assetPositions
        .filter(p => parseFloat(p.position.szi) !== 0)
        .map(p => {
          const size = parseFloat(p.position.szi);
          const entryPrice = parseFloat(p.position.entryPx || '0');
          const currentPrice = parseFloat(mids[p.position.coin] || '0');
          const unrealizedPnl = parseFloat(p.position.unrealizedPnl || '0');
          const leverage = parseFloat(String(p.position.leverage?.value ?? '1'));
          
          return {
            coin: p.position.coin,
            side: size > 0 ? 'long' : 'short',
            size: Math.abs(size),
            entryPrice,
            currentPrice,
            leverage,
            unrealizedPnl,
            unrealizedPnlPercent: entryPrice > 0 ? (unrealizedPnl / (Math.abs(size) * entryPrice)) * 100 : 0,
            liquidationPrice: parseFloat(p.position.liquidationPx || '0') || undefined,
          };
        });

      return {
        success: true,
        data: positions,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get account balance and margin info
   */
  async getBalance(): Promise<ActionResult<{
    accountValue: number;
    availableBalance: number;
    marginUsed: number;
    withdrawable: number;
  }>> {
    try {
      const state = await this.#infoClient.clearinghouseState({ 
        user: this.#wallet.address 
      });

      return {
        success: true,
        data: {
          accountValue: parseFloat(state.marginSummary?.accountValue || '0'),
          availableBalance: parseFloat(state.crossMarginSummary?.accountValue || '0'),
          marginUsed: parseFloat(state.marginSummary?.totalMarginUsed || '0'),
          withdrawable: parseFloat(state.withdrawable || '0'),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  // ============================================
  // Trading Actions
  // ============================================

  /**
   * Open a new position with optional stop-loss and take-profit
   * Supports both perpetuals (default) and spot markets
   */
  async openPosition(params: OpenPositionParams): Promise<ActionResult<{ orderId: number }>> {
    try {
      const market = (params.market || 'perp').toLowerCase() as 'spot' | 'perp';
      const normalizedCoin = params.coin.toUpperCase();
      
      // Spot orders don't support stop-loss/take-profit or leverage
      if (market === 'spot') {
        if (params.stopLossPercent || params.stopLossPrice || 
            params.takeProfitPercent || params.takeProfitPrice) {
          console.warn('[Toolkit] Warning: Stop-loss/take-profit not supported for spot orders');
        }
        if (params.leverage && params.leverage !== 1) {
          console.warn('[Toolkit] Warning: Leverage not supported for spot orders');
        }
      }
      
      // Risk checks (only for perps with risk manager)
      if (this.#riskManager && market === 'perp') {
        const [positionsResult, balanceResult] = await Promise.all([
          this.getPositions(),
          this.getBalance(),
        ]);

        if (!positionsResult.success || !balanceResult.success) {
          throw new Error('Failed to fetch account data for risk checks');
        }

        const riskCheck = this.#riskManager.checkOpenPosition(
          params,
          positionsResult.data!,
          balanceResult.data!.availableBalance
        );

        if (!riskCheck.allowed) {
          return {
            success: false,
            error: `Risk check failed: ${riskCheck.reason}`,
            timestamp: Date.now(),
          };
        }

        if (riskCheck.warnings) {
          console.warn('[Toolkit] Risk warnings:', riskCheck.warnings);
        }
      }

      // Get asset index (spot = 10000+, perp = regular)
      const { index: assetIndex, pairName, szDecimals } = await this.getAssetIndex(normalizedCoin, market);
      
      // Determine order parameters
      const normalizedSide = params.side.toLowerCase();
      const isBuy = normalizedSide === 'long' || normalizedSide === 'buy';
      const leverage = params.leverage || 1;
      const isSpot = market === 'spot';
      
      const isLimitOrder = params.orderType === 'limit' && !!params.limitPrice;
      let bookTop: { bestBid: number; bestAsk: number } | null = null;

      if (!isLimitOrder || !!params.sizeUsd) {
        bookTop = await this.getBookTopLevels(pairName);
      }

      // Calculate order size
      let orderSize: string;
      if (params.sizeUsd) {
        const price = isLimitOrder
          ? params.limitPrice!
          : this.getMidPriceFromTop(bookTop);

        if (price === 0) throw new Error(`No price available for ${params.coin}`);
        orderSize = this.formatSize(params.sizeUsd / price, szDecimals, 'up');
      } else if (params.sizeCoin) {
        orderSize = this.formatSize(params.sizeCoin, szDecimals);
      } else {
        throw new Error('Either sizeUsd or sizeCoin must be specified');
      }

      // Set leverage (perps only)
      if (!isSpot) {
        await this.#exchangeClient.updateLeverage({
          asset: assetIndex,
          isCross: true,
          leverage,
        });
      }

      // Get price for the order
      let orderPrice: string;
      let orderType: 'Ioc' | 'Gtc' = 'Ioc';

      if (params.orderType === 'limit' && params.limitPrice) {
        orderPrice = params.limitPrice.toFixed(5);
        orderType = 'Gtc';
      } else {
        // Market order - use top-of-book and slippage buffer
        const { bestBid, bestAsk } = bookTop ?? await this.getBookTopLevels(pairName);
        
        const slippage = (params.slippagePercent || this.#defaultSlippage) / 100;
        const rawPrice = isBuy 
          ? bestAsk * (1 + slippage)
          : bestBid * (1 - slippage);
        orderPrice = parseFloat(rawPrice.toPrecision(5)).toString();
      }

      const orderResult = await this.#exchangeClient.order({
        orders: [{
          a: assetIndex,
          b: isBuy,
          p: orderPrice,
          s: orderSize,
          r: false,
          t: { limit: { tif: orderType } },
        }],
        grouping: 'na',
      });

      const status = this.extractFirstOrderStatus(orderResult);

      if (this.isErrorStatus(status)) {
        return {
          success: false,
          error: `Order failed: ${status.error}`,
          timestamp: Date.now(),
        };
      }

      const orderId = this.extractOrderId(status);

      const statusType = this.isRestingStatus(status) ? 'resting' : 'filled';
      console.log('[Toolkit] Order placed successfully:', { orderId, status: statusType });

      // Stop-loss and take-profit only for perps
      if (isSpot) {
        return {
          success: true,
          data: { orderId },
          timestamp: Date.now(),
        };
      }

      // Place stop-loss if specified (perps only)
      if (params.stopLossPrice || params.stopLossPercent) {
        const mids = await this.#infoClient.allMids();
        const currentPrice = parseFloat(mids[normalizedCoin] || '0');
        
        const stopPrice = params.stopLossPrice || 
          (isBuy 
            ? currentPrice * (1 - (params.stopLossPercent! / 100))
            : currentPrice * (1 + (params.stopLossPercent! / 100)));

        await this.#exchangeClient.order({
          orders: [{
            a: assetIndex,
            b: !isBuy, // Opposite side
            p: stopPrice.toFixed(5),
            s: orderSize,
            r: true,
            t: {
              trigger: {
                triggerPx: stopPrice.toFixed(5),
                isMarket: true,
                tpsl: 'sl',
              },
            },
          }],
          grouping: 'positionTpsl',
        });
      }

      // Place take-profit if specified
      if (params.takeProfitPrice || params.takeProfitPercent) {
        const mids = await this.#infoClient.allMids();
        const currentPrice = parseFloat(mids[normalizedCoin] || '0');
        
        const tpPrice = params.takeProfitPrice || 
          (isBuy 
            ? currentPrice * (1 + (params.takeProfitPercent! / 100))
            : currentPrice * (1 - (params.takeProfitPercent! / 100)));

        await this.#exchangeClient.order({
          orders: [{
            a: assetIndex,
            b: !isBuy, // Opposite side
            p: tpPrice.toFixed(5),
            s: orderSize,
            r: true,
            t: {
              trigger: {
                triggerPx: tpPrice.toFixed(5),
                isMarket: true,
                tpsl: 'tp',
              },
            },
          }],
          grouping: 'positionTpsl',
        });
      }

      return {
        success: true,
        data: { orderId },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[Toolkit] Error in openPosition:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Close an existing position
   */
  async closePosition(params: ClosePositionParams): Promise<ActionResult<{ orderId: number }>> {
    try {
      const normalizedCoin = params.coin.toUpperCase();
      const positionsResult = await this.getPositions();
      if (!positionsResult.success) {
        throw new Error('Failed to fetch positions');
      }

      const position = positionsResult.data!.find(p => p.coin.toUpperCase() === normalizedCoin);
      if (!position) {
        throw new Error(`No open position found for ${normalizedCoin}`);
      }

      const { index: assetIndex, szDecimals } = await this.getAssetIndex(normalizedCoin, 'perp');
      const closePercent = params.percent || 100;
      const closeSize = this.formatSize(position.size * closePercent / 100, szDecimals);
      
      // Opposite side of current position
      const isBuy = position.side === 'short';

      // Get market price with slippage
      const { bestBid, bestAsk } = await this.getBookTopLevels(normalizedCoin);
      const slippage = (params.slippagePercent || this.#defaultSlippage) / 100;
      const orderPrice = isBuy 
        ? bestAsk * (1 + slippage)
        : bestBid * (1 - slippage);

      const result = await this.#exchangeClient.order({
        orders: [{
          a: assetIndex,
          b: isBuy,
          p: parseFloat(orderPrice.toPrecision(5)).toString(),
          s: closeSize,
          r: true, // Reduce-only
          t: { limit: { tif: 'Ioc' } },
        }],
        grouping: 'na',
      });

      // Record trade for risk manager
      if (this.#riskManager && closePercent === 100) {
        this.#riskManager.recordTrade(position.unrealizedPnl);
      }

      const status = this.extractFirstOrderStatus(result);
      const orderId = this.extractOrderId(status);

      return {
        success: true,
        data: { orderId },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Cancel all open orders for a coin (or all coins)
   */
  async cancelOrders(params: { coin?: string } = {}): Promise<ActionResult<{ cancelled: number }>> {
    try {
      const orders = await this.#infoClient.openOrders({ user: this.#wallet.address });
      const coinFilter = params.coin?.toUpperCase();
      const filteredOrders = orders.filter((order) => {
        if (!coinFilter) return true;
        const orderCoin = order.coin.toUpperCase();
        return orderCoin === coinFilter || orderCoin.split('/')[0] === coinFilter;
      });
      
      const toCancel: { a: number; o: number }[] = [];

      for (const order of filteredOrders) {
        const assetIndex = await this.resolveOrderAssetIndex(order.coin);
        toCancel.push({ a: assetIndex, o: order.oid });
      }

      if (toCancel.length === 0) {
        return {
          success: true,
          data: { cancelled: 0 },
          timestamp: Date.now(),
        };
      }

      await this.#exchangeClient.cancel({ cancels: toCancel });

      return {
        success: true,
        data: { cancelled: toCancel.length },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private async getAssetIndex(coin: string, market: 'spot' | 'perp' = 'perp'): Promise<{ index: number; pairName: string; szDecimals: number }> {
    if (market === 'spot') {
      // Spot assets use 10000 + universe.index
      // Universe contains trading pairs like "PURR/USDC", "HYPE/USDC"
      if (!this.#spotAssetMap) {
        const spotMeta = await this.#infoClient.spotMeta();
        this.#spotAssetMap = {};
        const tokenByIndex = new Map(spotMeta.tokens.map(token => [token.index, token]));
        
        // Spot universe now includes canonical names and aliases like "@107".
        spotMeta.universe.forEach((pair) => {
          const baseToken = tokenByIndex.get(pair.tokens[0]);
          if (!baseToken) return;

          const spotInfo = {
            index: pair.index,
            pairName: pair.name,
            szDecimals: baseToken.szDecimals,
          };

          const tokenName = baseToken.name.toUpperCase();
          if (!this.#spotAssetMap![tokenName]) {
            this.#spotAssetMap![tokenName] = spotInfo;
          }
          this.#spotAssetMap![pair.name.toUpperCase()] = spotInfo;
        });
      }
      
      const normalized = coin.toUpperCase();
      const spotInfo = this.#spotAssetMap[normalized];
      
      if (!spotInfo) {
        const available = Object.keys(this.#spotAssetMap).slice(0, 20).join(', ');
        throw new Error(
          `Unknown spot asset: ${coin}. ` +
          `Available tokens: ${available}...`
        );
      }
      
      return { index: 10000 + spotInfo.index, pairName: spotInfo.pairName, szDecimals: spotInfo.szDecimals };
    }
    
    // Perp assets use regular index
    if (market === 'perp') {
      if (!this.#assetMap) {
        const meta = await this.#infoClient.meta();
        this.#assetMap = {};
        meta.universe.forEach((asset, index) => {
          this.#assetMap![asset.name] = {
            index,
            szDecimals: asset.szDecimals,
          };
        });
      }
      
      const perpInfo = this.#assetMap[coin.toUpperCase()];
      if (!perpInfo) throw new Error(`Unknown perp asset: ${coin}`);
      return { index: perpInfo.index, pairName: coin, szDecimals: perpInfo.szDecimals };
    }
    
    throw new Error(`Invalid market type: ${market}`);
  }

  private async resolveOrderAssetIndex(orderCoin: string): Promise<number> {
    const normalizedCoin = orderCoin.toUpperCase();

    if (normalizedCoin.includes('/')) {
      const { index } = await this.getAssetIndex(normalizedCoin, 'spot');
      return index;
    }

    try {
      const { index } = await this.getAssetIndex(normalizedCoin, 'perp');
      return index;
    } catch {
      const { index } = await this.getAssetIndex(normalizedCoin, 'spot');
      return index;
    }
  }

  private formatSize(size: number, decimals: number, rounding: 'down' | 'up' = 'down'): string {
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error('Order size must be greater than zero');
    }

    const factor = 10 ** decimals;
    const roundedRaw = rounding === 'up'
      ? Math.ceil(size * factor) / factor
      : Math.floor(size * factor) / factor;
    if (roundedRaw <= 0) {
      throw new Error(`Order size too small for asset precision (${decimals} decimals)`);
    }
    return roundedRaw.toFixed(decimals).replace(/\.?0+$/, '');
  }

  private async getBookTopLevels(coin: string): Promise<{ bestBid: number; bestAsk: number }> {
    const book = await this.#infoClient.l2Book({ coin, nSigFigs: 5 });
    if (!book) {
      throw new Error(`No order book available for ${coin}`);
    }

    const bestBid = parseFloat(book.levels[0]?.[0]?.px || '0');
    const bestAsk = parseFloat(book.levels[1]?.[0]?.px || '0');

    if (!bestBid || !bestAsk) {
      throw new Error(`No liquidity available for ${coin}`);
    }

    return { bestBid, bestAsk };
  }

  private getMidPriceFromTop(bookTop: { bestBid: number; bestAsk: number } | null): number {
    if (!bookTop) return 0;
    return (bookTop.bestBid + bookTop.bestAsk) / 2;
  }

  private extractFirstOrderStatus(orderResult: unknown): unknown {
    const statuses = (orderResult as { response?: { data?: { statuses?: unknown[] } } })?.response?.data?.statuses;
    if (!Array.isArray(statuses) || statuses.length === 0) {
      throw new Error('Order response is missing statuses');
    }
    return statuses[0];
  }

  private isErrorStatus(status: unknown): status is { error: string } {
    return typeof status === 'object' && status !== null && 'error' in status;
  }

  private isRestingStatus(status: unknown): boolean {
    if (typeof status !== 'object' || status === null) return false;
    return 'resting' in (status as Record<string, unknown>);
  }

  private extractOrderId(status: unknown): number {
    if (typeof status === 'object' && status !== null) {
      const statusRecord = status as Record<string, unknown>;
      const resting = statusRecord.resting as Record<string, unknown> | undefined;
      const filled = statusRecord.filled as Record<string, unknown> | undefined;

      if (resting && typeof resting === 'object' && 'oid' in resting) {
        return Number(resting.oid);
      }

      if (filled && typeof filled === 'object' && 'oid' in filled) {
        return Number(filled.oid);
      }
    }

    // "waitingForFill" / "waitingForTrigger" statuses may not include an OID.
    return 0;
  }

  /**
   * Get wallet address
   */
  getAddress(): `0x${string}` {
    return this.#wallet.address;
  }

  /**
   * Get network
   */
  getNetwork(): Network {
    return this.#network;
  }

  /**
   * Get risk manager stats (if enabled)
   */
  getRiskStats() {
    return this.#riskManager?.getStats();
  }
}
