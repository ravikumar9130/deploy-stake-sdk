import { BigNumberish, BigNumber, Contract } from 'ethers';
import { DeploySDK } from '../core/DeploySDK';
import { DeploySDKError, ErrorCode } from '../core/errors';
import { ERC20_ABI } from '../core/constants';

export class AllowanceService {
  constructor(private sdk: DeploySDK) {}

  async getAllowance(
    tokenAddress: string,
    spenderAddress: string,
    ownerAddress?: string
  ): Promise<BigNumber> {
    try {
      const owner = ownerAddress || await this.sdk.getAddress();
      const contract = new Contract(tokenAddress, ERC20_ABI, this.sdk.provider);
      return await contract.allowance(owner, spenderAddress);
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to get allowance',
        error
      );
    }
  }

  async approve(
    tokenAddress: string,
    spenderAddress: string,
    amount: BigNumberish
  ): Promise<any> {
    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, this.sdk.signer);
      const tx = await contract.approve(spenderAddress, amount);
      return await tx.wait();
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.TRANSACTION_FAILED,
        'Failed to approve allowance',
        error
      );
    }
  }

  async approveMax(
    tokenAddress: string,
    spenderAddress: string
  ): Promise<any> {
    const maxUint256 = BigNumber.from(2).pow(256).sub(1);
    return this.approve(tokenAddress, spenderAddress, maxUint256);
  }

  async hasSufficientAllowance(
    tokenAddress: string,
    spenderAddress: string,
    requiredAmount: BigNumberish
  ): Promise<boolean> {
    try {
      const allowance = await this.getAllowance(tokenAddress, spenderAddress);
      return allowance.gte(requiredAmount);
    } catch (error) {
      return false;
    }
  }

  async ensureAllowance(
    tokenAddress: string,
    spenderAddress: string,
    requiredAmount: BigNumberish,
    options?: { approveMax?: boolean }
  ): Promise<boolean> {
    const hasAllowance = await this.hasSufficientAllowance(
      tokenAddress,
      spenderAddress,
      requiredAmount
    );

    if (hasAllowance) {
      return true;
    }

    if (options?.approveMax) {
      await this.approveMax(tokenAddress, spenderAddress);
    } else {
      await this.approve(tokenAddress, spenderAddress, requiredAmount);
    }

    return true;
  }
}