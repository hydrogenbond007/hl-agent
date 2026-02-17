/**
 * Momentum Trading Bot Example
 * 
 * This bot:
 * - Monitors BTC price momentum
 * - Opens long positions when momentum is strong
 * - Closes positions when momentum weakens
 * - Uses strict risk management
 */

import { 
  EnvWallet, 
  HyperliquidAgentToolkit,
  type MarketData,
} from '../src/index.js';

class MomentumBot {
  private toolkit: HyperliquidAgentToolkit;
  private isRunning = false;
  private priceHistory: number[] = [];
  private readonly HISTORY_SIZE = 20;

  constructor(toolkit: HyperliquidAgentToolkit) {
    this.toolkit = toolkit;
  }

  /**
   * Calculate simple momentum indicator
   */
  private calculateMomentum(): number {
    if (this.priceHistory.length < 10) return 0;
    
    const recent = this.priceHistory.slice(-10);
    const older = this.priceHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  /**
   * Main trading logic
   */
  private async tick() {
    console.log('\n🔄 Tick:', new Date().toISOString());

    try {
      // 1. Get BTC price
      const marketResult = await this.toolkit.getMarketData({ coins: ['BTC'] });
      if (!marketResult.success || !marketResult.data) {
        console.error('Failed to get market data');
        return;
      }

      const btc = marketResult.data[0];
      this.priceHistory.push(btc.price);
      
      if (this.priceHistory.length > this.HISTORY_SIZE) {
        this.priceHistory.shift();
      }

      console.log(`BTC: $${btc.price.toFixed(2)} | Funding: ${btc.fundingRate.toFixed(4)}%`);

      // 2. Calculate momentum
      const momentum = this.calculateMomentum();
      console.log(`Momentum: ${momentum.toFixed(2)}%`);

      // 3. Check current position
      const positionsResult = await this.toolkit.getPositions();
      const btcPosition = positionsResult.data?.find(p => p.coin === 'BTC');

      // 4. Trading logic
      if (!btcPosition) {
        // No position - check if we should enter
        if (momentum > 2) { // Strong upward momentum
          console.log('📈 Strong momentum detected! Opening long position...');
          
          const result = await this.toolkit.openPosition({
            coin: 'BTC',
            side: 'long',
            sizeUsd: 100,
            leverage: 3,
            stopLossPercent: 3,
            takeProfitPercent: 6,
          });

          if (result.success) {
            console.log('✅ Position opened!');
          } else {
            console.error('❌ Failed to open position:', result.error);
          }
        } else {
          console.log('⏸️  No entry signal');
        }
      } else {
        // Have position - check if we should exit
        console.log(`Current position PnL: $${btcPosition.unrealizedPnl.toFixed(2)} (${btcPosition.unrealizedPnlPercent.toFixed(2)}%)`);
        
        if (momentum < -1) { // Momentum weakening
          console.log('📉 Momentum weakening, closing position...');
          
          const result = await this.toolkit.closePosition({ coin: 'BTC' });
          
          if (result.success) {
            console.log('✅ Position closed!');
          } else {
            console.error('❌ Failed to close position:', result.error);
          }
        } else {
          console.log('🔒 Holding position');
        }
      }

      // 5. Show risk stats
      const stats = this.toolkit.getRiskStats();
      if (stats) {
        console.log(`Daily PnL: $${stats.dailyPnl.toFixed(2)} | Trades: ${stats.totalTrades} | Win Rate: ${stats.winRate.toFixed(1)}%`);
      }

    } catch (error) {
      console.error('Error in tick:', error);
    }
  }

  /**
   * Start the bot
   */
  async start(intervalSeconds = 60) {
    this.isRunning = true;
    console.log('🤖 Momentum Bot Started!');
    console.log(`Interval: ${intervalSeconds}s`);
    
    while (this.isRunning) {
      await this.tick();
      
      // Wait for next tick
      await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
    }
  }

  /**
   * Stop the bot
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Bot Stopped');
  }
}

async function main() {
  const wallet = EnvWallet.fromEnv('PRIVATE_KEY');
  
  const toolkit = new HyperliquidAgentToolkit({
    wallet,
    network: 'testnet',
    riskConfig: {
      maxLeverage: 5,
      maxPositionSizeUsd: 500,
      maxDailyLoss: 200,
      requireStopLoss: true,
      maxOpenPositions: 1,
    },
  });

  const bot = new MomentumBot(toolkit);

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\n⚠️  Shutting down...');
    bot.stop();
    await wallet.dispose();
    process.exit(0);
  });

  // Start bot (60 second intervals)
  await bot.start(60);
}

main().catch(console.error);
