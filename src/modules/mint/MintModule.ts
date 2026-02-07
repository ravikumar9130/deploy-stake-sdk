import { BigNumberish, Contract } from 'ethers';
import { DeploySDK } from '../../core/DeploySDK';
import { DeploySDKError, ErrorCode } from '../../core/errors';
import { CollateralAsset } from '../../core/types';
import { EIP712_TYPES_ORDER, MINTER_ABI } from '../../core/constants';
import { MintOrder, MintResult, MintOptions } from './types';

export class MintModule {
  constructor(private sdk: DeploySDK) {}

  async createOrder(
    collateralAsset: CollateralAsset,
    collateralAmount: BigNumberish,
    dAssetAmount: BigNumberish,
    options?: MintOptions
  ): Promise<MintOrder> {
    const address = await this.sdk.getAddress();
    
    const orderId = crypto.randomUUID();
    const expiry = Math.floor(Date.now() / 1000) + 
      (options?.expiryMinutes || 5) * 60;
    
    const minterAddress = collateralAsset.mintingContract;
    
    const order: MintOrder = {
      orderId,
      orderType: 0,
      expiry,
      nonce: Date.now(),
      benefactor: options?.benefactor || address,
      beneficiary: options?.beneficiary || address,
      collateralAsset: collateralAsset.address,
      collateralAmount: collateralAmount.toString(),
      dAssetAmount: dAssetAmount.toString(),
      minterAddress,
    };

    return order;
  }

  async signOrder(order: MintOrder): Promise<string> {
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
      const signature = await signer._signTypedData(domain, EIP712_TYPES_ORDER, value);
      return signature;
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.SIGNATURE_FAILED,
        'Failed to sign mint order',
        error
      );
    }
  }

  async submitOrder(order: MintOrder, signature: string): Promise<MintResult> {
    try {
      const response = await fetch(`${this.sdk.config.apiUrl}/api/mint`, {
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
          error.message || 'Failed to submit mint order'
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
        'Failed to submit mint order',
        error
      );
    }
  }

  async mint(
    collateralAsset: CollateralAsset,
    collateralAmount: BigNumberish,
    dAssetAmount: BigNumberish,
    options?: MintOptions
  ): Promise<MintResult> {
    try {
      const order = await this.createOrder(
        collateralAsset,
        collateralAmount,
        dAssetAmount,
        options
      );

      const signature = await this.signOrder(order);
      
      return await this.submitOrder(order, signature);
    } catch (error) {
      if (error instanceof DeploySDKError) throw error;
      
      throw new DeploySDKError(
        ErrorCode.MINT_FAILED,
        'Failed to mint tokens',
        error
      );
    }
  }

  async estimateGas(
    collateralAsset: CollateralAsset,
    collateralAmount: BigNumberish,
    dAssetAmount: BigNumberish,
    signature: string
  ): Promise<bigint> {
    const minterContract = new Contract(
      collateralAsset.mintingContract,
      MINTER_ABI,
      this.sdk.provider
    );

    const order = {
      order_id: crypto.randomUUID(),
      order_type: 0,
      expiry: Math.floor(Date.now() / 1000) + 300,
      nonce: Date.now(),
      benefactor: await this.sdk.getAddress(),
      beneficiary: await this.sdk.getAddress(),
      collateral_asset: collateralAsset.address,
      collateral_amount: collateralAmount.toString(),
      dAsset_amount: dAssetAmount.toString(),
    };

    try {
      const gasEstimate = await minterContract.estimateGas.mint(
        order,
        { addresses: [], ratios: [] },
        { signature_type: 0, signature_bytes: signature }
      );
      return gasEstimate.toBigInt();
    } catch (error) {
      throw new DeploySDKError(
        ErrorCode.TRANSACTION_FAILED,
        'Failed to estimate gas for mint',
        error
      );
    }
  }
}