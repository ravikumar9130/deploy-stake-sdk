import { ChainId } from '../core/types';

export interface WalletAdapter {
  name: string;
  getProvider(): Promise<any>;
  getSigner(): Promise<any>;
  isConnected(): Promise<boolean>;
  switchChain?(chainId: ChainId): Promise<void>;
  disconnect?(): Promise<void>;
}