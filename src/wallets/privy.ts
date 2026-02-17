/**
 * Privy wallet implementation
 * https://docs.privy.io/
 * 
 * Requires: npm install @privy-io/node
 */

import { BaseWallet } from './base.js';

export interface PrivyWalletConfig {
  appId: string;
  appSecret: string;
  /** 
   * Wallet ID from Privy (not the address)
   * Get this from wallet creation or user's embedded wallet
   */
  walletId: string;
}

/**
 * Wallet implementation using Privy's embedded wallets
 * 
 * Privy provides:
 * - Social login + embedded wallets
 * - No seed phrase management
 * - Email/SMS recovery
 * - Policy-based access control
 * - Server-side signing
 * 
 * Note: This uses Privy's server SDK (@privy-io/node)
 * Install with: npm install @privy-io/node
 */
export class PrivyWallet extends BaseWallet {
  readonly type = 'mpc' as const;
  readonly #config: PrivyWalletConfig;
  #privyClient?: any; // PrivyClient from @privy-io/node
  #cachedAddress?: `0x${string}`;
  #walletId: string;

  constructor(config: PrivyWalletConfig) {
    super();
    this.#config = config;
    this.#walletId = config.walletId;
  }

  get address(): `0x${string}` {
    if (!this.#cachedAddress) {
      throw new Error('Privy wallet not initialized. Call initialize() first.');
    }
    return this.#cachedAddress;
  }

  /**
   * Initialize Privy wallet connection
   * 
   * This uses the official Privy SDK:
   * - @privy-io/node for server-side operations
   * - Wallet API for signing operations
   */
  async initialize(): Promise<void> {
    this.checkDisposed();

    try {
      // Dynamic import of Privy package (peer dependency)
      const { PrivyClient } = await import('@privy-io/node');

      // Create Privy client
      this.#privyClient = new PrivyClient({
        appId: this.#config.appId,
        appSecret: this.#config.appSecret,
      });

      // Get wallet details to fetch address
      // In Privy, you need the wallet ID (not address) to perform operations
      // The wallet should already exist (created via client SDK or server API)
      
      // For now, we'll fetch the wallet info to get the address
      // Note: Privy's wallet API doesn't have a direct "getWallet" method in the docs
      // You typically store the wallet ID and address when creating the wallet
      
      // Since we need the address and Privy uses wallet IDs for operations,
      // we'll need to either:
      // 1. Accept address as config (when wallet already exists)
      // 2. Create a new wallet here
      
      // For this implementation, we'll create a wallet if it doesn't exist
      // In production, you'd typically pass the existing wallet ID
      
      console.log(`[PrivyWallet] Initialized with wallet ID: ${this.#walletId}`);
      
      // Note: You need to provide the address separately or fetch it from your database
      // Privy wallets are identified by ID, not address
      // The address is returned when creating the wallet
      
      // Placeholder: In a real implementation, you'd fetch this from your database
      // or require it in the config
      throw new Error(
        'Privy wallet requires the wallet address to be provided in config. ' +
        'Get the address when creating the wallet with privy.walletApi.createWallet()'
      );

    } catch (error: any) {
      if (error.message?.includes('Cannot find module')) {
        throw new Error(
          'Privy package not installed. Run: npm install @privy-io/node'
        );
      }
      throw error;
    }
  }

  /**
   * Initialize with existing wallet address
   * Use this when you already have the wallet ID and address
   */
  async initializeWithAddress(address: `0x${string}`): Promise<void> {
    this.checkDisposed();

    if (!this.validateAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }

    try {
      const { PrivyClient } = await import('@privy-io/node');

      this.#privyClient = new PrivyClient({
        appId: this.#config.appId,
        appSecret: this.#config.appSecret,
      });

      this.#cachedAddress = address;
      console.log(`[PrivyWallet] Initialized: ${address}`);
    } catch (error: any) {
      if (error.message?.includes('Cannot find module')) {
        throw new Error(
          'Privy package not installed. Run: npm install @privy-io/node'
        );
      }
      throw error;
    }
  }

  /**
   * Sign typed data using Privy's wallet API
   * 
   * Uses eth_signTypedData_v4 endpoint
   */
  async signTypedData(params: {
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
  }): Promise<`0x${string}`> {
    this.checkDisposed();

    if (!this.#privyClient) {
      throw new Error('Privy wallet not initialized');
    }

    if (!this.#cachedAddress) {
      throw new Error('Privy wallet address not set');
    }

    try {
      // Use Privy's eth_signTypedData_v4 endpoint
      // https://docs.privy.io/api-reference/wallets/ethereum/eth-signtypeddata-v4
      
      const result = await this.#privyClient.walletApi.ethereum.signTypedData({
        walletId: this.#walletId,
        chainId: params.domain.chainId || 1,
        typedData: {
          domain: params.domain,
          types: params.types,
          primaryType: params.primaryType,
          message: params.message,
        },
      });

      return result.signature as `0x${string}`;
    } catch (error: any) {
      throw new Error(`Failed to sign typed data with Privy: ${error.message}`);
    }
  }

  /**
   * Get the Privy client for advanced operations
   */
  getPrivyClient(): any {
    if (!this.#privyClient) {
      throw new Error('Privy wallet not initialized');
    }
    return this.#privyClient;
  }

  /**
   * Get the wallet ID
   */
  getWalletId(): string {
    return this.#walletId;
  }

  async dispose(): Promise<void> {
    this.#cachedAddress = undefined;
    this.#privyClient = undefined;
    await super.dispose();
  }
}

/**
 * Helper to create a new Privy wallet
 * Use this when you need to create a wallet for a new user
 */
export async function createPrivyWallet(config: {
  appId: string;
  appSecret: string;
  chainType?: 'ethereum' | 'solana';
}): Promise<{ walletId: string; address: string; chainType: string }> {
  try {
    const { PrivyClient } = await import('@privy-io/node');

    const privy = new PrivyClient({
      appId: config.appId,
      appSecret: config.appSecret,
    });

    const wallet = await privy.walletApi.createWallet({
      chainType: config.chainType || 'ethereum',
    });

    return {
      walletId: wallet.id,
      address: wallet.address,
      chainType: wallet.chainType,
    };
  } catch (error: any) {
    if (error.message?.includes('Cannot find module')) {
      throw new Error(
        'Privy package not installed. Run: npm install @privy-io/node'
      );
    }
    throw new Error(`Failed to create Privy wallet: ${error.message}`);
  }
}
