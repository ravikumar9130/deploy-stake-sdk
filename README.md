# Deploy SDK

Complete DeFi interaction library for the Deploy platform with support for mint, stake, unstake, and redeem operations.

## Platform support

The SDK works in **React (web)** and **React Native**. Same API in both; you only change how you obtain the wallet provider (browser: `window.ethereum` or Privy; React Native: WalletConnect, Privy React Native, or any EIP-1193 provider passed into `ExternalWalletAdapter`).

## Installation

```bash
npm install deploy-sdk-js ethers
```

## Quick Start

### 1. Initialize SDK with Privy

```typescript
import { DeploySDK, PrivyAdapter, COLLATERAL_ASSETS, STAKE_TOKENS } from 'deploy-sdk-js';
import { usePrivy } from '@privy-io/react-auth';

function App() {
  const privy = usePrivy();
  
  const sdk = new DeploySDK({
    apiUrl: 'https://your-api-url.com', // provide your backend API URL
    chainId: 1, // Ethereum mainnet
  });

  const connectWallet = async () => {
    const adapter = new PrivyAdapter(privy);
    await sdk.initialize(adapter);
    console.log('Connected:', await sdk.getAddress());
  };
}
```

### 2. Initialize SDK with MetaMask (React / browser)

In the browser, use `window.ethereum` with `ExternalWalletAdapter`:

```typescript
import { DeploySDK, ExternalWalletAdapter } from 'deploy-sdk-js';

const ethereum = window.ethereum;
const adapter = new ExternalWalletAdapter(ethereum);

const sdk = new DeploySDK({
  apiUrl: 'https://your-api-url.com', // provide your backend API URL
  chainId: 1,
});

await sdk.initialize(adapter);
```

### 3. Initialize SDK in React Native

In React Native there is no `window.ethereum`. Get an EIP-1193 provider from your wallet stack (e.g. WalletConnect, Privy React Native) and pass it to `ExternalWalletAdapter`:

```typescript
import { DeploySDK, ExternalWalletAdapter } from 'deploy-sdk-js';

// provider: from WalletConnect, Privy React Native, or your custom injector
const adapter = new ExternalWalletAdapter(provider);
const sdk = new DeploySDK({
  apiUrl: 'https://your-api-url.com', // provide your backend API URL
  chainId: 1,
});

await sdk.initialize(adapter);
```

### 4. Mint dUSD

```typescript
import { COLLATERAL_ASSETS } from 'deploy-sdk-js';

const mintDUSD = async () => {
  // Mint 1000 dUSD using USDC
  const result = await sdk.mint.mint(
    COLLATERAL_ASSETS.USDC,
    '1000000000', // 1000 USDC (6 decimals)
    '1000000000000000000000', // 1000 dUSD (18 decimals)
    { expiryMinutes: 10 }
  );
  
  console.log('Mint successful:', result.txHash);
};
```

### 5. Stake dUSD

```typescript
import { STAKE_TOKENS } from 'deploy-sdk-js';

const stakeDUSD = async () => {
  // Stake 1000 dUSD
  const result = await sdk.stake.stake({
    token: STAKE_TOKENS.dUSD,
    amount: '1000000000000000000000', // 1000 dUSD
  });
  
  console.log('Staked:', result.sharesReceived, 'sDUSD shares');
};
```

### 6. Unstake (with Cooldown)

```typescript
const unstakeProcess = async () => {
  // Step 1: Initiate cooldown
  const cooldownResult = await sdk.unstake.initiateCooldown(
    STAKE_TOKENS.dUSD,
    '500000000000000000000' // 500 sDUSD shares
  );
  
  console.log('Cooldown initiated. Ends at:', new Date(cooldownResult.cooldownEnd!));
  
  // Step 2: Wait for cooldown to complete
  // ... wait 90 days ...
  
  // Step 3: Unstake
  const unstakeResult = await sdk.unstake.unstake({
    token: STAKE_TOKENS.dUSD,
    sharesAmount: '500000000000000000000',
  });
  
  console.log('Unstaked:', unstakeResult.assetsWithdrawn, 'dUSD');
};
```

### 7. Redeem dUSD for USDC

```typescript
const redeemDUSD = async () => {
  const result = await sdk.redeem.redeem(
    STAKE_TOKENS.dUSD,
    '1000000000000000000000', // 1000 dUSD
    COLLATERAL_ASSETS.USDC.address,
    '1000000000', // 1000 USDC
    { expiryMinutes: 10 }
  );
  
  console.log('Redeem successful:', result.txHash);
};
```

## SDK Events

```typescript
sdk.on('initialized', (data) => {
  console.log('SDK initialized for address:', data.address);
});

sdk.on('error', (error) => {
  console.error('SDK error:', error);
});

sdk.on('chainChanged', (data) => {
  console.log('Chain changed to:', data.chainId);
});

sdk.on('disconnected', () => {
  console.log('Wallet disconnected');
});
```

## Utility Services

### Allowance Management

```typescript
// Check allowance
const allowance = await sdk.allowance.getAllowance(
  COLLATERAL_ASSETS.USDC.address,
  COLLATERAL_ASSETS.USDC.mintingContract
);

// Approve tokens
await sdk.allowance.approve(
  COLLATERAL_ASSETS.USDC.address,
  COLLATERAL_ASSETS.USDC.mintingContract,
  '1000000000'
);

// Approve max
await sdk.allowance.approveMax(
  COLLATERAL_ASSETS.USDC.address,
  COLLATERAL_ASSETS.USDC.mintingContract
);

// Ensure allowance (approves if needed)
await sdk.allowance.ensureAllowance(
  COLLATERAL_ASSETS.USDC.address,
  COLLATERAL_ASSETS.USDC.mintingContract,
  '1000000000'
);
```

### Balance Management

```typescript
// Get token balance
const balance = await sdk.balances.getTokenBalance(
  STAKE_TOKENS.dUSD.address
);

// Get native ETH balance
const ethBalance = await sdk.balances.getNativeBalance();

// Check sufficient balance
const hasEnough = await sdk.balances.hasSufficientBalance(
  STAKE_TOKENS.dUSD.address,
  '1000000000000000000000'
);
```

## Error Handling

```typescript
import { DeploySDKError, ErrorCode } from 'deploy-sdk-js';

try {
  await sdk.mint.mint(...);
} catch (error) {
  if (error instanceof DeploySDKError) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
  
    switch (error.code) {
      case ErrorCode.INSUFFICIENT_BALANCE:
        // Handle insufficient balance
        break;
      case ErrorCode.INSUFFICIENT_ALLOWANCE:
        // Handle insufficient allowance
        break;
      case ErrorCode.SIGNATURE_FAILED:
        // Handle signature failure
        break;
    }
  }
}
```

## API Reference

### DeploySDK

Main SDK class that provides access to all modules and services.

**Constructor Options:**

- `chainId`: Chain ID (default: 1)
- `apiUrl`: Backend API URL
- `rpcUrl`: Custom RPC URL

### MintModule

Handles minting dUSD using EIP-712 signed orders.

**Methods:**

- `createOrder()`: Create a mint order
- `signOrder()`: Sign a mint order
- `submitOrder()`: Submit signed order to backend
- `mint()`: Full mint flow (create + sign + submit)
- `estimateGas()`: Estimate gas for mint

### StakeModule

Handles ERC4626 vault staking operations.

**Methods:**

- `stake()`: Stake tokens into vault
- `getPosition()`: Get user's staking position
- `previewStake()`: Preview shares received for stake
- `getAPY()`: Calculate current APY

### UnstakeModule

Handles ERC4626 vault unstaking with cooldown.

**Methods:**

- `initiateCooldown()`: Start cooldown period
- `unstake()`: Unstake tokens after cooldown
- `getCooldownStatus()`: Check cooldown status
- `previewUnstake()`: Preview assets received for shares

### RedeemModule

Handles redeeming dUSD for collateral using EIP-712 signed orders.

**Methods:**

- `createOrder()`: Create a redeem order
- `signOrder()`: Sign a redeem order
- `submitOrder()`: Submit signed order to backend
- `redeem()`: Full redeem flow (create + sign + submit)
- `estimateGas()`: Estimate gas for redeem

## Supported Tokens

### Collateral Assets

- **USDC**: USD Coin (6 decimals)
- **USDT**: Tether USD (6 decimals)

### Stake Tokens

- **dUSD**: Deploy USD (stake to sDUSD)

## License

MIT
