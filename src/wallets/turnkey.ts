/**
 * Turnkey wallet implementation
 * https://docs.turnkey.com/
 * 
 * Requires: npm install @turnkey/http @turnkey/api-key-stamper @turnkey/viem
 */

import { BaseWallet } from './base.js';

export interface TurnkeyWalletConfig {
  apiBaseUrl?: string;
  organizationId: string;
  privateKeyId: string;
  apiPublicKey: string;
  apiPrivateKey: string;
}

/**
 * Wallet implementation using Turnkey's key management infrastructure
 * 
 * Turnkey provides:
 * - Secure key custody with policy engine
 * - Quorum-based signing
 * - Hardware-backed security
 * - Programmable policies (spending limits, allowlists)
 * 
 * Note: This implementation uses Turnkey's actual SDK packages.
 * Install with: npm install @turnkey/http @turnkey/api-key-stamper @turnkey/viem
 */
export class TurnkeyWallet extends BaseWallet {
  readonly type = 'mpc' as const;
  readonly #config: TurnkeyWalletConfig;
  #turnkeyClient?: any; // TurnkeyClient from @turnkey/http
  #viemAccount?: any; // TurnkeyViemAccount from @turnkey/viem
  #cachedAddress?: `0x${string}`;

  constructor(config: TurnkeyWalletConfig) {
    super();
    this.#config = {
      apiBaseUrl: config.apiBaseUrl || 'https://api.turnkey.com',
      ...config
    };
  }

  get address(): `0x${string}` {
    if (!this.#cachedAddress) {
      throw new Error('Turnkey wallet not initialized. Call initialize() first.');
    }
    return this.#cachedAddress;
  }

  /**
   * Initialize Turnkey wallet connection
   * 
   * This uses the official Turnkey SDK:
   * - @turnkey/http for API communication
   * - @turnkey/api-key-stamper for authentication
   * - @turnkey/viem for signing operations
   */
  async initialize(): Promise<void> {
    this.checkDisposed();

    try {
      // Dynamic import of Turnkey packages (peer dependencies)
      const { TurnkeyClient } = await import('@turnkey/http');
      const { ApiKeyStamper } = await import('@turnkey/api-key-stamper');
      const { createAccount } = await import('@turnkey/viem');

      // Create API key stamper for authentication
      const stamper = new ApiKeyStamper({
        apiPublicKey: this.#config.apiPublicKey,
        apiPrivateKey: this.#config.apiPrivateKey,
      });

      // Create Turnkey HTTP client
      this.#turnkeyClient = new TurnkeyClient(
        { baseUrl: this.#config.apiBaseUrl },
        stamper
      );

      // Create Viem account for signing
      // This account can sign transactions and typed data
      this.#viemAccount = await createAccount({
        client: this.#turnkeyClient,
        organizationId: this.#config.organizationId,
        privateKeyId: this.#config.privateKeyId,
      });

      // Get the wallet address
      this.#cachedAddress = this.#viemAccount.address as `0x${string}`;

      console.log(`[TurnkeyWallet] Initialized successfully: ${this.#cachedAddress}`);
    } catch (error: any) {
      if (error.message?.includes('Cannot find module')) {
        throw new Error(
          'Turnkey packages not installed. Run: npm install @turnkey/http @turnkey/api-key-stamper @turnkey/viem'
        );
      }
      throw new Error(`Failed to initialize Turnkey wallet: ${error.message}`);
    }
  }

  /**
   * Sign typed data using Turnkey's secure signing infrastructure
   * 
   * This uses Turnkey's Viem account which supports EIP-712 typed data signing
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

    if (!this.#viemAccount) {
      throw new Error('Turnkey wallet not initialized');
    }

    try {
      // Use Turnkey's Viem account to sign typed data
      // This internally makes an API call to Turnkey to sign with the private key
      // The private key never leaves Turnkey's secure infrastructure
      const signature = await this.#viemAccount.signTypedData(params);
      
      return signature as `0x${string}`;
    } catch (error: any) {
      throw new Error(`Failed to sign typed data with Turnkey: ${error.message}`);
    }
  }

  /**
   * Get the Turnkey client for advanced operations
   */
  getTurnkeyClient(): any {
    if (!this.#turnkeyClient) {
      throw new Error('Turnkey wallet not initialized');
    }
    return this.#turnkeyClient;
  }

  /**
   * Get the Viem account for direct Viem integration
   */
  getViemAccount(): any {
    if (!this.#viemAccount) {
      throw new Error('Turnkey wallet not initialized');
    }
    return this.#viemAccount;
  }

  async dispose(): Promise<void> {
    this.#cachedAddress = undefined;
    this.#turnkeyClient = undefined;
    this.#viemAccount = undefined;
    await super.dispose();
  }
}
