import { BigNumberish } from 'ethers';
import { CollateralAsset } from '../../core/types';

export interface MintOrder {
  orderId: string;
  orderType: number;
  expiry: number;
  nonce: number;
  benefactor: string;
  beneficiary: string;
  collateralAsset: string;
  collateralAmount: string;
  dAssetAmount: string;
  minterAddress: string;
}

export interface MintResult {
  success: boolean;
  orderId: string;
  txHash?: string;
  status?: string;
  error?: string;
}

export interface MintOptions {
  expiryMinutes?: number;
  benefactor?: string;
  beneficiary?: string;
}

export interface MintParams {
  collateralAsset: CollateralAsset;
  collateralAmount: BigNumberish;
  dAssetAmount: BigNumberish;
  options?: MintOptions;
}