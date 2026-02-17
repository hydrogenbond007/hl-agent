/**
 * Secure vault for storing sensitive agent data
 * Encrypted storage for API keys, wallet seeds, trading strategies, etc.
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export interface VaultConfig {
  /** Master password or key for encryption */
  masterKey: string;
  
  /** Storage backend */
  storage: 'memory' | 'file' | 'cloud';
  
  /** File path (if storage is 'file') */
  filePath?: string;
  
  /** Encryption algorithm */
  algorithm?: 'aes-256-gcm' | 'chacha20-poly1305';
}

export interface VaultEntry {
  key: string;
  value: string;
  encrypted: boolean;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Secure vault for storing agent secrets
 * All data is encrypted at rest with AES-256-GCM
 */
export class AgentVault {
  readonly #config: VaultConfig;
  readonly #entries = new Map<string, VaultEntry>();
  #encryptionKey: Buffer;
  #sealed = false;

  constructor(config: VaultConfig) {
    this.#config = {
      algorithm: 'aes-256-gcm',
      ...config
    };
    
    // Derive encryption key from master key
    this.#encryptionKey = createHash('sha256')
      .update(config.masterKey)
      .digest();
  }

  /**
   * Store a secret in the vault
   */
  async set(key: string, value: string, metadata?: Record<string, unknown>): Promise<void> {
    if (this.#sealed) {
      throw new Error('Vault is sealed');
    }

    const encrypted = this.#encrypt(value);
    
    const entry: VaultEntry = {
      key,
      value: encrypted,
      encrypted: true,
      createdAt: this.#entries.get(key)?.createdAt || Date.now(),
      updatedAt: Date.now(),
      metadata,
    };

    this.#entries.set(key, entry);
    
    if (this.#config.storage === 'file') {
      await this.#persist();
    }
  }

  /**
   * Retrieve a secret from the vault
   */
  async get(key: string): Promise<string | undefined> {
    const entry = this.#entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.encrypted) {
      return this.#decrypt(entry.value);
    }
    
    return entry.value;
  }

  /**
   * Check if a key exists in the vault
   */
  has(key: string): boolean {
    return this.#entries.has(key);
  }

  /**
   * Delete a secret from the vault
   */
  async delete(key: string): Promise<boolean> {
    if (this.#sealed) {
      throw new Error('Vault is sealed');
    }

    const deleted = this.#entries.delete(key);
    
    if (deleted && this.#config.storage === 'file') {
      await this.#persist();
    }
    
    return deleted;
  }

  /**
   * List all keys in the vault
   */
  keys(): string[] {
    return Array.from(this.#entries.keys());
  }

  /**
   * Get entry metadata without decrypting value
   */
  getMetadata(key: string): Record<string, unknown> | undefined {
    return this.#entries.get(key)?.metadata;
  }

  /**
   * Seal the vault (prevent modifications)
   */
  seal(): void {
    this.#sealed = true;
  }

  /**
   * Unseal the vault
   */
  unseal(): void {
    this.#sealed = false;
  }

  /**
   * Clear all entries (destructive!)
   */
  async clear(): Promise<void> {
    if (this.#sealed) {
      throw new Error('Vault is sealed');
    }

    this.#entries.clear();
    
    if (this.#config.storage === 'file') {
      await this.#persist();
    }
  }

  /**
   * Load vault from storage
   */
  async load(): Promise<void> {
    if (this.#config.storage === 'file') {
      await this.#loadFromFile();
    }
    // TODO: Implement cloud storage
  }

  // ============================================
  // Private Methods
  // ============================================

  #encrypt(plaintext: string): string {
    const iv = randomBytes(12); // GCM standard IV size
    const cipher = createCipheriv(
      this.#config.algorithm!,
      this.#encryptionKey,
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  #decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv(
      this.#config.algorithm!,
      this.#encryptionKey,
      iv
    );
    
    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async #persist(): Promise<void> {
    if (!this.#config.filePath) {
      throw new Error('No file path configured');
    }

    const { writeFile } = await import('fs/promises');
    
    const data = {
      version: 1,
      entries: Array.from(this.#entries.entries()),
      updatedAt: Date.now(),
    };

    await writeFile(
      this.#config.filePath,
      JSON.stringify(data, null, 2),
      'utf8'
    );
  }

  async #loadFromFile(): Promise<void> {
    if (!this.#config.filePath) {
      throw new Error('No file path configured');
    }

    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(this.#config.filePath, 'utf8');
      const data = JSON.parse(content);
      
      this.#entries.clear();
      for (const [key, entry] of data.entries) {
        this.#entries.set(key, entry);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, that's ok
        return;
      }
      throw error;
    }
  }
}
