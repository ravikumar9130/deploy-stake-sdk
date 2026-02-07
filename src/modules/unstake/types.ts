import { BigNumberish } from 'ethers';
import { StakeToken } from '../../core/types';

export interface UnstakeParams {
  token: StakeToken;
  sharesAmount: BigNumberish;
  receiver?: string;
}

export interface UnstakeResult {
  success: boolean;
  txHash?: string;
  assetsWithdrawn?: string;
  error?: string;
}

export interface CooldownResult {
  success: boolean;
  txHash?: string;
  cooldownEnd?: number;
  error?: string;
}

export interface CooldownStatus {
  cooldownEnd: number;
  sharesInCooldown: string;
  canUnstake: boolean;
}