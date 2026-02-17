# Wallet Integration Guide

This guide covers all wallet types supported by the Hyperliquid Agent SDK and how to integrate them properly.

## Overview

The SDK supports multiple wallet types with a unified interface:

- **EnvWallet** - Environment variables (development only)
- **TurnkeyWallet** - Institutional MPC with policy engine
- **PrivyWallet** - Embedded wallets with social login
- **FireblocksWallet** - Enterprise MPC with insurance
- **KMSWallet** - Cloud key management (AWS, GCP, Azure)

## Installation

```bash
# Core SDK
npm install @hyperliquid/agent-sdk

# For Turnkey
npm install @turnkey/http @turnkey/api-key-stamper @turnkey/viem

# For Privy
npm install @privy-io/server-auth

# For Fireblocks
npm install fireblocks-sdk
```

## Wallet Types

### 1. EnvWallet (Development Only)

Simple wallet using private key from environment variable.

```typescript
import { EnvWallet } from '@hyperliquid/agent-sdk';

const wallet = new EnvWallet(process.env.PRIVATE_KEY!);
console.log(wallet.address); // 0x...
```

**⚠️ Security Warning:**
- Private key is stored in memory unencrypted
- Exposed in process dumps and logs
- **Never use in production!**

### 2. TurnkeyWallet (Recommended for Production)

Institutional-grade MPC wallet with policy engine.

```typescript
import { TurnkeyWallet } from '@hyperliquid/agent-sdk';

const wallet = new TurnkeyWallet({
  organizationId: process.env.TURNKEY_ORG_ID!,
  privateKeyId: process.env.TURNKEY_KEY_ID!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE!,
  apiBaseUrl: 'https://api.turnkey.com', // optional
});

await wallet.initialize();
console.log(wallet.address); // 0x...
```

**Setup Steps:**

1. **Create Turnkey Organization:**
   - Go to https://app.turnkey.com
   - Create a new organization
   - Note your Organization ID

2. **Create Private Key:**
   - In Turnkey dashboard, create a new wallet
   - Create a private key within that wallet
   - Note the Private Key ID

3. **Generate API Keys:**
   ```bash
   # Using Turnkey CLI
   npx @turnkey/cli generate-api-key
   ```
   - Save the public and private API keys securely

4. **Set Environment Variables:**
   ```bash
   TURNKEY_ORG_ID=your-org-id
   TURNKEY_KEY_ID=your-key-id
   TURNKEY_API_PUBLIC=your-api-public-key
   TURNKEY_API_PRIVATE=your-api-private-key
   ```

**Features:**
- Private keys never leave Turnkey's secure infrastructure
- Policy engine for spending limits and approvals
- Quorum-based multi-sig support
- Audit logs and compliance features
- Works with Viem and Ethers

**Advanced Usage:**

```typescript
// Access underlying Turnkey client for advanced operations
const client = wallet.getTurnkeyClient();

// Use Viem account directly
const viemAccount = wallet.getViemAccount();
import { createWalletClient, http } from 'viem';
import { arbitrum } from 'viem/chains';

const viemWalletClient = createWalletClient({
  account: viemAccount,
  chain: arbitrum,
  transport: http()
});
```

### 3. PrivyWallet (Best for User-Facing Apps)

Embedded wallets with social login - no seed phrases.

```typescript
import { PrivyWallet } from '@hyperliquid/agent-sdk';

const wallet = new PrivyWallet({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
  userId: 'user-123',
  environment: 'production', // or 'staging'
});

await wallet.initialize();
```

**Setup:**
1. Create app at https://dashboard.privy.io
2. Get App ID and App Secret
3. Create embedded wallets for users

**Status:** 🚧 Privy integration is a placeholder. Full implementation coming soon.

### 4. FireblocksWallet (Enterprise)

Enterprise MPC with insurance and compliance.

```typescript
import { FireblocksWallet } from '@hyperliquid/agent-sdk';

const wallet = new FireblocksWallet({
  apiKey: process.env.FIREBLOCKS_API_KEY!,
  apiSecret: process.env.FIREBLOCKS_API_SECRET!,
  vaultAccountId: process.env.FIREBLOCKS_VAULT_ID!,
  baseUrl: 'https://api.fireblocks.io', // optional
  assetId: 'ETH_TEST', // Arbitrum asset
});

await wallet.initialize();
```

**Status:** 🚧 Fireblocks integration is a placeholder. Full implementation coming soon.

### 5. KMSWallet (Cloud Key Management)

Use AWS KMS, GCP KMS, or Azure Key Vault.

```typescript
import { KMSWallet } from '@hyperliquid/agent-sdk';

// AWS KMS
const wallet = new KMSWallet({
  provider: 'aws',
  keyId: process.env.AWS_KMS_KEY_ID!,
  region: 'us-east-1',
});

// GCP KMS
const wallet = new KMSWallet({
  provider: 'gcp',
  keyId: process.env.GCP_KMS_KEY_ID!,
  credentials: {
    projectId: 'my-project',
    // ... GCP credentials
  },
});

await wallet.initialize();
```

**Status:** 🚧 KMS integration is a placeholder. Full implementation coming soon.

## Wallet Interface

All wallets implement the same interface:

```typescript
interface IWallet {
  readonly address: `0x${string}`;
  readonly type: 'env' | 'kms' | 'mpc' | 'hardware';
  
  signTypedData(params: {
    domain: { ... };
    types: { ... };
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<`0x${string}`>;
  
  dispose?(): Promise<void>;
}
```

## Usage with Toolkit

```typescript
import { HyperliquidAgentToolkit } from '@hyperliquid/agent-sdk';

const toolkit = new HyperliquidAgentToolkit({
  wallet, // Any wallet type
  network: 'testnet',
  riskConfig: {
    maxLeverage: 5,
    maxPositionSizeUsd: 1000,
  }
});

// Now you can trade
await toolkit.openPosition({
  coin: 'BTC',
  side: 'long',
  sizeUsd: 100
});
```

## Security Best Practices

### Development
✅ **Do:**
- Use `EnvWallet` with testnet
- Keep private keys in `.env` file (gitignored)
- Use separate keys for dev/staging/prod

❌ **Don't:**
- Commit private keys to git
- Use production keys in development
- Share private keys

### Staging
✅ **Do:**
- Use `TurnkeyWallet` or `KMSWallet`
- Use testnet with real signing infrastructure
- Test all security features

❌ **Don't:**
- Use `EnvWallet`
- Store keys in code or logs

### Production
✅ **Do:**
- Use `TurnkeyWallet`, `FireblocksWallet`, or `PrivyWallet`
- Enable all security policies
- Use hardware security modules (HSM)
- Implement multi-sig approvals
- Enable audit logging
- Set up monitoring and alerts

❌ **Don't:**
- Use `EnvWallet` or `KMSWallet` directly
- Store private keys anywhere
- Skip policy configuration
- Deploy without testing

## TEE Integration

For maximum security, run agents in Trusted Execution Environments:

```typescript
import { initTEE, createTEEWallet } from '@hyperliquid/agent-sdk';

// Initialize TEE
const tee = await initTEE({ provider: 'nitro' });

if (tee) {
  // Create wallet with keys sealed in enclave
  const wallet = await createTEEWallet(tee, privateKey);
  
  // Get attestation for external verification
  const attestation = await tee.getAttestation();
  console.log('Running in secure enclave:', attestation);
}
```

## Migration Between Wallet Types

### From EnvWallet to Turnkey

```typescript
// 1. Export private key from EnvWallet
const privateKey = process.env.PRIVATE_KEY;

// 2. Import into Turnkey
// Use Turnkey dashboard to import the private key securely
// Or use Turnkey CLI:
// npx @turnkey/cli import-private-key

// 3. Update your code
const wallet = new TurnkeyWallet({
  organizationId: process.env.TURNKEY_ORG_ID!,
  privateKeyId: 'imported-key-id',
  // ... other config
});
```

### From Turnkey to Fireblocks

Turnkey and Fireblocks both support secure key export/import:
1. Use Turnkey's export functionality
2. Import into Fireblocks vault
3. Update wallet configuration

## Troubleshooting

### "Wallet not initialized"

Make sure to call `initialize()` for MPC wallets:

```typescript
const wallet = new TurnkeyWallet(config);
await wallet.initialize(); // Required!
```

### "Cannot find module @turnkey/http"

Install Turnkey peer dependencies:

```bash
npm install @turnkey/http @turnkey/api-key-stamper @turnkey/viem
```

### "Invalid signature"

Check that:
1. Wallet address matches the expected address
2. Chain ID in typed data matches your network
3. API keys are correct and not expired

### Turnkey API errors

Common issues:
- **401 Unauthorized:** Check API keys
- **403 Forbidden:** Check organization ID and permissions
- **404 Not Found:** Check private key ID exists

Enable debug logging:

```typescript
const wallet = new TurnkeyWallet({
  ...config,
  // Add debug: true if supported
});
```

## Future Wallet Types

Coming soon:
- **HardwareWallet** (Ledger, Trezor)
- **MultiSigWallet** (Gnosis Safe, custom)
- **SmartContractWallet** (Account abstraction)
- **ShamirWallet** (Shamir secret sharing)

## Resources

- [Turnkey Documentation](https://docs.turnkey.com)
- [Privy Documentation](https://docs.privy.io)
- [Fireblocks Documentation](https://developers.fireblocks.com)
- [Hyperliquid Agent SDK Examples](../examples/)
