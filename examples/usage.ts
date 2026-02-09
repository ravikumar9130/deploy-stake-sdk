import { DeploySDK } from './core/DeploySDK';
import { PrivyAdapter, ExternalWalletAdapter, PrivyConnectedWallet } from './wallet-adapters';
import { COLLATERAL_ASSETS, STAKE_TOKENS, ChainId, ErrorCode } from './core';

// Example 1: Basic initialization with Privy (pass a connected wallet from useWallets())
async function exampleWithPrivy(wallet: PrivyConnectedWallet) {
  const sdk = new DeploySDK({
    apiUrl: 'https://your-api-url.com', // provide your backend API URL
    chainId: ChainId.ETHEREUM,
  });

  const adapter = new PrivyAdapter(wallet);
  await sdk.initialize(adapter);

  console.log('Connected address:', await sdk.getAddress());
  return sdk;
}

// Example 2: Basic initialization with MetaMask (browser only; requires window.ethereum)
async function exampleWithMetaMask() {
  const ethereum = (window as any).ethereum;
  
  const sdk = new DeploySDK({
    apiUrl: 'https://your-api-url.com', // provide your backend API URL
    chainId: ChainId.ETHEREUM,
  });

  const adapter = new ExternalWalletAdapter(ethereum);
  await sdk.initialize(adapter);

  return sdk;
}

// Example 2b: Initialize with any EIP-1193 provider (use in React Native: WalletConnect, Privy RN, or custom)
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}
async function exampleWithInjectedProvider(provider: EthereumProvider) {
  const sdk = new DeploySDK({
    apiUrl: 'https://your-api-url.com', // provide your backend API URL
    chainId: ChainId.ETHEREUM,
  });
  const adapter = new ExternalWalletAdapter(provider as any);
  await sdk.initialize(adapter);
  console.log('Connected address:', await sdk.getAddress());
  return sdk;
}

// Example 3: Mint dUSD
async function exampleMint(sdk: DeploySDK) {
  try {
    // Check balance first
    const hasBalance = await sdk.balances.hasSufficientBalance(
      COLLATERAL_ASSETS.USDC.address,
      '1000000000' // 1000 USDC
    );

    if (!hasBalance) {
      console.error('Insufficient USDC balance');
      return;
    }

    // Ensure allowance
    await sdk.allowance.ensureAllowance(
      COLLATERAL_ASSETS.USDC.address,
      COLLATERAL_ASSETS.USDC.mintingContract,
      '1000000000'
    );

    // Create, sign, and submit order
    const result = await sdk.mint.mint(
      COLLATERAL_ASSETS.USDC,
      '1000000000', // 1000 USDC
      '1000000000000000000000', // 1000 dUSD
      { expiryMinutes: 10 }
    );

    if (result.success) {
      console.log('Mint successful! TX:', result.txHash);
    }
  } catch (error) {
    console.error('Mint failed:', error);
  }
}

// Example 4: Stake dUSD
async function exampleStake(sdk: DeploySDK) {
  try {
    const token = STAKE_TOKENS.dUSD;
    const amount = '1000000000000000000000'; // 1000 dUSD

    // Preview stake
    const preview = await sdk.stake.previewStake(token, amount);
    console.log(`Staking ${amount} dUSD will give you ${preview.shares} sDUSD shares`);

    // Check dUSD balance
    const hasBalance = await sdk.balances.hasSufficientBalance(token.address, amount);
    if (!hasBalance) {
      console.error('Insufficient dUSD balance');
      return;
    }

    // Approve staking contract
    await sdk.allowance.ensureAllowance(
      token.address,
      token.stakingContract!,
      amount
    );

    // Stake
    const result = await sdk.stake.stake({
      token,
      amount,
    });

    if (result.success) {
      console.log('Stake successful! TX:', result.txHash);
      console.log('Shares received:', result.sharesReceived);
    }
  } catch (error) {
    console.error('Stake failed:', error);
  }
}

// Example 5: Full unstake flow with cooldown
async function exampleUnstake(sdk: DeploySDK) {
  try {
    const token = STAKE_TOKENS.dUSD;
    const sharesAmount = '500000000000000000000'; // 500 sDUSD

    // Get current position
    const position = await sdk.stake.getPosition(token);
    console.log('Current staked amount:', position.stakedAmount);

    // Check if there's an active cooldown
    const cooldownStatus = await sdk.unstake.getCooldownStatus(token);
    
    if (cooldownStatus.canUnstake) {
      // Cooldown complete, can unstake
      console.log('Cooldown complete! Unstaking now...');
      
      const result = await sdk.unstake.unstake({
        token,
        sharesAmount,
      });

      if (result.success) {
        console.log('Unstake successful! TX:', result.txHash);
        console.log('Assets withdrawn:', result.assetsWithdrawn);
      }
    } else if (cooldownStatus.cooldownEnd > 0) {
      // Cooldown in progress
      console.log('Cooldown in progress. Ends at:', new Date(cooldownStatus.cooldownEnd));
    } else {
      // No cooldown, need to initiate
      console.log('Initiating cooldown...');
      
      const cooldownResult = await sdk.unstake.initiateCooldown(token, sharesAmount);
      
      if (cooldownResult.success) {
        console.log('Cooldown initiated! TX:', cooldownResult.txHash);
        console.log('Cooldown ends at:', new Date(cooldownResult.cooldownEnd!));
        console.log('Please wait 90 days before unstaking.');
      }
    }
  } catch (error) {
    console.error('Unstake failed:', error);
  }
}

// Example 6: Redeem dUSD for USDC
async function exampleRedeem(sdk: DeploySDK) {
  try {
    const token = STAKE_TOKENS.dUSD;
    const redeemAmount = '1000000000000000000000'; // 1000 dUSD
    const collateralAsset = COLLATERAL_ASSETS.USDC;

    // Check dUSD balance
    const hasBalance = await sdk.balances.hasSufficientBalance(token.address, redeemAmount);
    if (!hasBalance) {
      console.error('Insufficient dUSD balance');
      return;
    }

    // Ensure allowance for minter contract
    await sdk.allowance.ensureAllowance(
      token.address,
      token.mintingContract,
      redeemAmount
    );

    // Redeem
    const result = await sdk.redeem.redeem(
      token,
      redeemAmount,
      collateralAsset.address,
      '1000000000', // 1000 USDC
      { expiryMinutes: 10 }
    );

    if (result.success) {
      console.log('Redeem successful! TX:', result.txHash);
    }
  } catch (error) {
    console.error('Redeem failed:', error);
  }
}

// Example 7: Event handling
async function exampleWithEvents(sdk: DeploySDK) {
  sdk.on('initialized', (data) => {
    console.log('SDK initialized for:', data.address);
  });

  sdk.on('error', (error) => {
    console.error('SDK error:', error);
  });

  sdk.on('chainChanged', (data) => {
    console.log('Switched to chain:', data.chainId);
  });

  sdk.on('disconnected', () => {
    console.log('Wallet disconnected');
  });
}

// Example 8: Error handling
async function exampleWithErrorHandling(sdk: DeploySDK) {
  try {
    await sdk.mint.mint(
      COLLATERAL_ASSETS.USDC,
      '1000000000',
      '1000000000000000000000'
    );
  } catch (error: any) {
    if (error.code === ErrorCode.INSUFFICIENT_BALANCE) {
      console.error('You need more USDC to complete this transaction');
    } else if (error.code === ErrorCode.INSUFFICIENT_ALLOWANCE) {
      console.error('Please approve USDC spending first');
    } else if (error.code === ErrorCode.SIGNATURE_FAILED) {
      console.error('Signature rejected. Please try again.');
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}

// Example 9: Chain switching
async function exampleChainSwitching(sdk: DeploySDK) {
  try {
    await sdk.switchChain(ChainId.ARBITRUM);
    console.log('Switched to Arbitrum');
  } catch (error) {
    console.error('Failed to switch chain:', error);
  }
}

// Example 10: Get staking info
async function exampleGetStakingInfo(sdk: DeploySDK) {
  const token = STAKE_TOKENS.dUSD;
  
  // Get current APY
  const apy = await sdk.stake.getAPY(token);
  console.log(`Current APY: ${apy.toFixed(2)}%`);
  
  // Get user's position
  const position = await sdk.stake.getPosition(token);
  console.log('Staked amount:', position.stakedAmount);
  console.log('Staked value:', position.stakedValue);
  console.log('Can unstake:', position.canUnstake);
  
  // Preview stake
  const preview = await sdk.stake.previewStake(token, '1000000000000000000000');
  console.log('1000 dUSD would give you', preview.shares, 'sDUSD shares');
}

export {
  exampleWithPrivy,
  exampleWithMetaMask,
  exampleWithInjectedProvider,
  exampleMint,
  exampleStake,
  exampleUnstake,
  exampleRedeem,
  exampleWithEvents,
  exampleWithErrorHandling,
  exampleChainSwitching,
  exampleGetStakingInfo,
};