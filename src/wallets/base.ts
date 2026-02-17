/**
 * Base wallet implementation with security utilities
 */

import type { IWallet } from '../types/index.js';

/**
 * Abstract base wallet class with common security features
 */
export abstract class BaseWallet implements IWallet {
  abstract readonly address: `0x${string}`;
  abstract readonly type: 'env' | 'kms' | 'mpc' | 'hardware';
  
  protected disposed = false;

  abstract signTypedData(params: {
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
  }): Promise<`0x${string}`>;

  /**
   * Validate Ethereum address format
   */
  protected validateAddress(address: string): address is `0x${string}` {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  /**
   * Validate private key format
   */
  protected validatePrivateKey(key: string): key is `0x${string}` {
    return /^(0x)?[0-9a-fA-F]{64}$/.test(key);
  }

  /**
   * Ensure private key has 0x prefix
   */
  protected ensureHexPrefix(key: string): `0x${string}` {
    return key.startsWith('0x') ? key as `0x${string}` : `0x${key}` as `0x${string}`;
  }

  /**
   * Check if wallet has been disposed
   */
  protected checkDisposed(): void {
    if (this.disposed) {
      throw new Error(`Wallet ${this.type} has been disposed`);
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.disposed = true;
  }
}

/**
 * Validate wallet configuration at runtime
 */
export function validateWalletConfig(wallet: IWallet): void {
  if (!wallet.address || !/^0x[0-9a-fA-F]{40}$/.test(wallet.address)) {
    throw new Error('Invalid wallet address');
  }
  
  if (!['env', 'kms', 'mpc', 'hardware'].includes(wallet.type)) {
    throw new Error(`Unknown wallet type: ${wallet.type}`);
  }
  
  if (typeof wallet.signTypedData !== 'function') {
    throw new Error('Wallet must implement signTypedData method');
  }
}
