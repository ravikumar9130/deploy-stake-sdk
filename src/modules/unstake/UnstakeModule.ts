import { BigNumberish, Contract } from 'ethers';
import { DeploySDK } from '../../core/DeploySDK';
import { DeploySDKError, ErrorCode } from '../../core/errors';
import { StakeToken } from '../../core/types';
import { ERC4626_ABI } from '../../core/constants';
import { UnstakeParams, UnstakeResult, CooldownResult, CooldownStatus } from './types';

export class UnstakeModule {
  constructor(private sdk: DeploySDK) {}

  async initiateCooldown(
    token: StakeToken, 
    sharesAmount: BigNumberish
  ): Promise<CooldownResult> {
    try {
      if (!token.stakingContract) {
        throw new DeploySDKError(
          ErrorCode.VALIDATION_ERROR,
          `Token ${token.symbol} does not support staking`
        );
      }

      const vaultContract = new Contract(
        token.stakingContract,
        ERC4626_ABI,
        this.sdk.signer
      );

      const tx = await vaultContract.cooldownShares(sharesAmount);

      const receipt = await tx.wait();
      
      const cooldownEnd = Date.now() + (token.cooldownPeriod || 90 * 24 * 60 * 60 * 1000);
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        cooldownEnd,
      };
    } catch (error) {
      if (error instanceof DeploySDKError) throw error;
      
      throw new DeploySDKError(
        ErrorCode.COOLDOWN_FAILED,
        'Failed to initiate cooldown',
        error
      );
    }
  }

  async unstake(params: UnstakeParams): Promise<UnstakeResult> {
    try {
      const { token, sharesAmount, receiver } = params;
      
      if (!token.stakingContract) {
        throw new DeploySDKError(
          ErrorCode.VALIDATION_ERROR,
          `Token ${token.symbol} does not support staking`
        );
      }

      const cooldownStatus = await this.getCooldownStatus(token);
      if (!cooldownStatus.canUnstake) {
        throw new DeploySDKError(
          ErrorCode.VALIDATION_ERROR,
          `Cannot unstake. Cooldown ends at ${new Date(cooldownStatus.cooldownEnd).toLocaleString()}`
        );
      }
      
      const vaultContract = new Contract(
        token.stakingContract,
        ERC4626_ABI,
        this.sdk.signer
      );

      const receiverAddress = receiver || await this.sdk.getAddress();
      const owner = await this.sdk.getAddress();

      const tx = await vaultContract.redeem(sharesAmount, receiverAddress, owner);

      const receipt = await tx.wait();
      
      let assetsWithdrawn: string | undefined;
      const withdrawEvent = receipt.events?.find(
        (e: any) => e.event === 'Withdraw'
      );
      if (withdrawEvent) {
        assetsWithdrawn = withdrawEvent.args?.assets?.toString();
      }
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        assetsWithdrawn,
      };
    } catch (error) {
      if (error instanceof DeploySDKError) throw error;
      
      throw new DeploySDKError(
        ErrorCode.UNSTAKE_FAILED,
        'Failed to unstake tokens',
        error
      );
    }
  }

  async getCooldownStatus(token: StakeToken, userAddress?: string): Promise<CooldownStatus> {
    if (!token.stakingContract) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        `Token ${token.symbol} does not support staking`
      );
    }

    const address = userAddress || await this.sdk.getAddress();
    
    const vaultContract = new Contract(
      token.stakingContract,
      ERC4626_ABI,
      this.sdk.provider
    );

    try {
      const cooldown = await vaultContract.cooldowns(address);
      const cooldownEnd = cooldown.cooldownEnd.toNumber() * 1000;
      
      return {
        cooldownEnd,
        sharesInCooldown: cooldown.underlyingAmount.toString(),
        canUnstake: cooldownEnd > 0 && cooldownEnd <= Date.now(),
      };
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to fetch cooldown status',
        error
      );
    }
  }

  async previewUnstake(token: StakeToken, sharesAmount: BigNumberish): Promise<string> {
    if (!token.stakingContract) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        `Token ${token.symbol} does not support staking`
      );
    }

    const vaultContract = new Contract(
      token.stakingContract,
      ERC4626_ABI,
      this.sdk.provider
    );

    try {
      const assets = await vaultContract.convertToAssets(sharesAmount);
      return assets.toString();
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to preview unstake',
        error
      );
    }
  }
}