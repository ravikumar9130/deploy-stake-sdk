import { BigNumberish } from 'ethers';
import { StakeToken } from '../../core/types';

export interface StakeParams {
  token: StakeToken;
  amount: BigNumberish;
  receiver?: string;
}

export interface StakeResult {
  success: boolean;
  txHash?: string;
  sharesReceived?: string;
  error?: string;
}

export interface StakingPosition {
  tokenKey: string;
  stakedAmount: string;
  stakedValue: string;
  cooldownEnd?: number;
  canUnstake: boolean;
}

export interface StakePreview {
  shares: string;
  assets: string;
}