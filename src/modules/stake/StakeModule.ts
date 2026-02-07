import { BigNumberish, Contract, BigNumber } from 'ethers';
import { DeploySDK } from '../../core/DeploySDK';
import { DeploySDKError, ErrorCode } from '../../core/errors';
import { StakeToken } from '../../core/types';
import { ERC4626_ABI } from '../../core/constants';
import { StakeParams, StakeResult, StakingPosition, StakePreview } from './types';

export class StakeModule {
  constructor(private sdk: DeploySDK) {}

  async stake(params: StakeParams): Promise<StakeResult> {
    try {
      const { token, amount, receiver } = params;
      
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

      const receiverAddress = receiver || await this.sdk.getAddress();
      
      const tx = await vaultContract.deposit(amount, receiverAddress);

      const receipt = await tx.wait();
      
      let sharesReceived: string | undefined;
      const depositEvent = receipt.events?.find(
        (e: any) => e.event === 'Deposit'
      );
      if (depositEvent) {
        sharesReceived = depositEvent.args?.shares?.toString();
      }
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        sharesReceived,
      };
    } catch (error) {
      if (error instanceof DeploySDKError) throw error;
      
      throw new DeploySDKError(
        ErrorCode.STAKE_FAILED,
        'Failed to stake tokens',
        error
      );
    }
  }

  async getPosition(token: StakeToken, userAddress?: string): Promise<StakingPosition> {
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
      const [shares, assets, cooldown] = await Promise.all([
        vaultContract.balanceOf(address),
        vaultContract.convertToAssets(await vaultContract.balanceOf(address)),
        vaultContract.cooldowns(address).catch(() => ({ cooldownEnd: BigNumber.from(0), underlyingAmount: BigNumber.from(0) })),
      ]);

      const cooldownEnd = cooldown.cooldownEnd.toNumber() * 1000;

      return {
        tokenKey: token.key,
        stakedAmount: shares.toString(),
        stakedValue: assets.toString(),
        cooldownEnd: cooldownEnd > 0 ? cooldownEnd : undefined,
        canUnstake: cooldownEnd === 0 || cooldownEnd <= Date.now(),
      };
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to fetch staking position',
        error
      );
    }
  }

  async previewStake(token: StakeToken, amount: BigNumberish): Promise<StakePreview> {
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
      const shares = await vaultContract.convertToShares(amount);
      return {
        shares: shares.toString(),
        assets: amount.toString(),
      };
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to preview stake',
        error
      );
    }
  }

  async getAPY(token: StakeToken): Promise<number> {
    if (!token.stakingContract) {
      return 0;
    }

    const vaultContract = new Contract(
      token.stakingContract,
      ERC4626_ABI,
      this.sdk.provider
    );

    try {
      const [totalAssets, totalSupply] = await Promise.all([
        vaultContract.totalAssets(),
        vaultContract.totalSupply(),
      ]);

      if (totalSupply.isZero()) {
        return 0;
      }

      const sharePrice = totalAssets.mul(BigNumber.from(10).pow(18)).div(totalSupply);
      const basePrice = BigNumber.from(10).pow(18);
      
      if (sharePrice.lte(basePrice)) {
        return 0;
      }

      const yieldPerShare = sharePrice.sub(basePrice);
      const dailyYield = yieldPerShare.mul(365);
      const apy = dailyYield.mul(10000).div(basePrice).toNumber() / 100;
      
      return apy;
    } catch (error) {
      return 0;
    }
  }
}