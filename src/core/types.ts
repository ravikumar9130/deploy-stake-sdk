export enum ChainId {
  ETHEREUM = 1,
  ARBITRUM = 42161,
}

export interface DeploySDKConfig {
  apiUrl: string;
  chainId?: ChainId;
  rpcUrl?: string;
}

export interface SDKEvents {
  initializing: () => void;
  initialized: (data: { address: string }) => void;
  error: (error: any) => void;
  chainChanged: (data: { chainId: number }) => void;
  disconnected: () => void;
}

export interface CollateralAsset {
  key: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  mintingContract: string;
}

export interface StakeToken {
  key: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  supportedCollateral: CollateralAsset[];
  mintingContract: string;
  stakingContract?: string;
  stakingSymbol?: string;
  cooldownPeriod?: number;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}