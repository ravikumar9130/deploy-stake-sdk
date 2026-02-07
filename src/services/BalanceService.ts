import { BigNumberish, BigNumber, Contract } from 'ethers';
import { DeploySDK } from '../core/DeploySDK';
import { DeploySDKError, ErrorCode } from '../core/errors';
import { ERC20_ABI } from '../core/constants';

export class BalanceService {
  constructor(private sdk: DeploySDK) {}

  async getTokenBalance(
    tokenAddress: string,
    userAddress?: string
  ): Promise<BigNumber> {
    try {
      const address = userAddress || await this.sdk.getAddress();
      const contract = new Contract(tokenAddress, ERC20_ABI, this.sdk.provider);
      return await contract.balanceOf(address);
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to get token balance',
        error
      );
    }
  }

  async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, this.sdk.provider);
      return await contract.decimals();
    } catch (error) {
      return 18;
    }
  }

  async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, this.sdk.provider);
      return await contract.symbol();
    } catch (error) {
      return 'UNKNOWN';
    }
  }

  async getNativeBalance(userAddress?: string): Promise<BigNumber> {
    try {
      const address = userAddress || await this.sdk.getAddress();
      return await this.sdk.provider.getBalance(address);
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to get native balance',
        error
      );
    }
  }

  async hasSufficientBalance(
    tokenAddress: string,
    requiredAmount: BigNumberish
  ): Promise<boolean> {
    try {
      const balance = await this.getTokenBalance(tokenAddress);
      return balance.gte(requiredAmount);
    } catch (error) {
      return false;
    }
  }

  async hasSufficientNativeBalance(
    requiredAmount: BigNumberish
  ): Promise<boolean> {
    try {
      const balance = await this.getNativeBalance();
      return balance.gte(requiredAmount);
    } catch (error) {
      return false;
    }
  }
}