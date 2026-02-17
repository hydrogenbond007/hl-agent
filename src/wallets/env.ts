/**
 * Environment variable wallet - simplest but least secure
 * Use only for development and testing
 */

import { privateKeyToAccount } from 'viem/accounts';
import type { PrivateKeyAccount } from 'viem/accounts';
import { BaseWallet } from './base.js';

/**
 * Wallet that signs with a private key from environment variable
 * 
 * ⚠️ WARNING: Not recommended for production
 * - Private keys in env vars are exposed in logs and process dumps
 * - Use KMSWallet or MPCWallet for production
 * 
 * @example
 * ```typescript
 * const wallet = new EnvWallet(process.env.PRIVATE_KEY);
 * ```
 */
export class EnvWallet extends BaseWallet {
  readonly type = 'env' as const;
  readonly address: `0x${string}`;
  
  #account: PrivateKeyAccount;

  constructor(privateKey: string) {
    super();
    
    if (!privateKey) {
      throw new Error('Private key is required');
    }

    if (!this.validatePrivateKey(privateKey)) {
      throw new Error(
        'Invalid private key format. Expected 64 hex characters with optional 0x prefix'
      );
    }

    const key = this.ensureHexPrefix(privateKey);
    
    try {
      this.#account = privateKeyToAccount(key);
      this.address = this.#account.address;
    } catch (error) {
      throw new Error(
        `Failed to create account from private key: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Warn in production
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        `[EnvWallet] WARNING: Using private key from environment in production. ` +
        `Consider using KMSWallet or MPCWallet for better security.`
      );
    }
  }

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
    
    try {
      const signature = await this.#account.signTypedData({
        domain: params.domain,
        types: params.types,
        primaryType: params.primaryType,
        message: params.message,
      });
      return signature;
    } catch (error) {
      throw new Error(
        `Failed to sign typed data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clear the account from memory (best effort)
   */
  override async dispose(): Promise<void> {
    // TypeScript private field - best we can do
    (this.#account as any) = null;
    await super.dispose();
  }

  /**
   * Create wallet from environment variable name
   */
  static fromEnv(varName = 'PRIVATE_KEY'): EnvWallet {
    const key = process.env[varName];
    if (!key) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
    return new EnvWallet(key);
  }
}
