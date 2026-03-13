import { BigNumberish, Contract } from 'ethers';
import { DeploySDK } from '../../core/DeploySDK';
import { DeploySDKError, ErrorCode } from '../../core/errors';
import { StakeToken } from '../../core/types';
import { EIP712_TYPES_ORDER, MINTER_ABI } from '../../core/constants';
import { RedeemOrder, RedeemResult, RedeemOptions } from './types';

export class RedeemModule {
  constructor(private sdk: DeploySDK) {}

  async createOrder(
    token: StakeToken,
    redeemAmount: BigNumberish,
    collateralAsset: string,
    collateralAmount: BigNumberish,
    options?: RedeemOptions
  ): Promise<RedeemOrder> {
    const address = await this.sdk.getAddress();
    
    const orderId = `redeem-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const expiry = Math.floor(Date.now() / 1000) + 
      (options?.expiryMinutes || 5) * 60;
    
    const minterAddress = token.mintingContract;
    
    const order: RedeemOrder = {
      orderId,
      orderType: 1,
      expiry,
      nonce: Date.now(),
      benefactor: options?.benefactor || address,
      beneficiary: options?.beneficiary || address,
      collateralAsset,
      collateralAmount: collateralAmount.toString(),
      dAssetAmount: redeemAmount.toString(),
      minterAddress,
    };

    return order;
  }

  async signOrder(order: RedeemOrder): Promise<string> {
    const signer = this.sdk.signer;
    
    const domain = {
      name: 'DeployMinting',
      version: '1',
      chainId: await this.sdk.getChainId(),
      verifyingContract: order.minterAddress,
    };

    const value = {
      order_id: order.orderId,
      order_type: order.orderType,
      expiry: order.expiry,
      nonce: order.nonce,
      benefactor: order.benefactor,
      beneficiary: order.beneficiary,
      collateral_asset: order.collateralAsset,
      collateral_amount: order.collateralAmount,
      dAsset_amount: order.dAssetAmount,
    };

    try {
      const signTypedData = (signer as any).signTypedData ?? (signer as any)._signTypedData;
      if (typeof signTypedData !== 'function') {
        throw new Error('Signer does not support EIP-712 signTypedData (ethers v5 or v6 required)');
      }
      const signature = await signTypedData.call(signer, domain, EIP712_TYPES_ORDER, value);
      return signature;
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.SIGNATURE_FAILED,
        'Failed to sign redeem order',
        error
      );
    }
  }

  async submitOrder(order: RedeemOrder, signature: string): Promise<RedeemResult> {
    try {
      const response = await fetch(`${this.sdk.config.apiUrl}/api/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: {
            order_id: order.orderId,
            order_type: order.orderType,
            expiry: order.expiry,
            nonce: order.nonce,
            benefactor: order.benefactor,
            beneficiary: order.beneficiary,
            collateral_asset: order.collateralAsset,
            collateral_amount: order.collateralAmount,
            dAsset_amount: order.dAssetAmount,
          },
          signature: {
            signature_type: 0,
            signature_bytes: signature,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new DeploySDKError(
          ErrorCode.API_ERROR,
          error.message || 'Failed to submit redeem order'
        );
      }

      const result = await response.json() as { txHash?: string; status?: string };
      
      return {
        success: true,
        orderId: order.orderId,
        txHash: result.txHash,
        status: result.status,
      };
    } catch (error) {
      if (error instanceof DeploySDKError) throw error;
      
      throw new DeploySDKError(
        ErrorCode.API_ERROR,
        'Failed to submit redeem order',
        error
      );
    }
  }

  async redeem(
    token: StakeToken,
    redeemAmount: BigNumberish,
    collateralAsset: string,
    collateralAmount: BigNumberish,
    options?: RedeemOptions
  ): Promise<RedeemResult> {
    try {
      const order = await this.createOrder(
        token,
        redeemAmount,
        collateralAsset,
        collateralAmount,
        options
      );

      const signature = await this.signOrder(order);
      
      return await this.submitOrder(order, signature);
    } catch (error) {
      if (error instanceof DeploySDKError) throw error;
      
      throw new DeploySDKError(
        ErrorCode.REDEEM_FAILED,
        'Failed to redeem tokens',
        error
      );
    }
  }

  async estimateGas(
    token: StakeToken,
    redeemAmount: BigNumberish,
    collateralAsset: string,
    collateralAmount: BigNumberish,
    signature: string
  ): Promise<bigint> {
    const minterContract = new Contract(
      token.mintingContract,
      MINTER_ABI,
      this.sdk.provider
    );

    const order = {
      order_id: `redeem-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      order_type: 1,
      expiry: Math.floor(Date.now() / 1000) + 300,
      nonce: Date.now(),
      benefactor: await this.sdk.getAddress(),
      beneficiary: await this.sdk.getAddress(),
      collateral_asset: collateralAsset,
      collateral_amount: collateralAmount.toString(),
      dAsset_amount: redeemAmount.toString(),
    };

    try {
      const gasEstimate = await minterContract.estimateGas.redeem(
        order,
        { signature_type: 0, signature_bytes: signature }
      );
      return gasEstimate.toBigInt();
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.TRANSACTION_FAILED,
        'Failed to estimate gas for redeem',
        error
      );
    }
  }
}