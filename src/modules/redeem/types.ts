export interface RedeemOrder {
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

export interface RedeemResult {
  success: boolean;
  orderId: string;
  txHash?: string;
  status?: string;
  error?: string;
}

export interface RedeemOptions {
  expiryMinutes?: number;
  benefactor?: string;
  beneficiary?: string;
}