import { ethers } from 'ethers';
import { ChainId } from '../core/types';
import { WalletAdapter } from './base';

/**
 * Privy ConnectedWallet from useWallets() (e.g. wallets[0]).
 * Use: import { useWallets } from '@privy-io/react-auth'; const { wallets } = useWallets(); adapter = new PrivyAdapter(wallets[0]);
 */
export interface PrivyConnectedWallet {
  getEthereumProvider(): Promise<unknown>;
  address: string;
  switchChain?(chainId: number): Promise<void>;
}

function isEIP1193Provider(value: unknown): value is { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } {
  return !!value && typeof (value as any).request === 'function';
}

function createEthersProvider(rawProvider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }): any {
  if (typeof (ethers as any).providers?.Web3Provider === 'function') {
    return new (ethers as any).providers.Web3Provider(rawProvider);
  }
  if (typeof (ethers as any).BrowserProvider === 'function') {
    return new (ethers as any).BrowserProvider(rawProvider);
  }
  throw new Error(
    'deploy-sdk-js PrivyAdapter requires ethers v5 (ethers.providers.Web3Provider) or v6 (ethers.BrowserProvider). ' +
      'Ensure ethers is installed and the correct version is resolved.'
  );
}

export class PrivyAdapter implements WalletAdapter {
  name = 'Privy';

  private _provider: any = null;

  constructor(private wallet: PrivyConnectedWallet) {
    if (!wallet || typeof wallet.getEthereumProvider !== 'function') {
      throw new Error('PrivyAdapter requires a connected wallet with getEthereumProvider (e.g. from useWallets().wallets[0])');
    }
    if (!wallet.address || typeof wallet.address !== 'string') {
      throw new Error('PrivyAdapter requires a wallet with an address');
    }
  }

  async getProvider(): Promise<any> {
    if (this._provider) return this._provider;
    const rawProvider = await this.wallet.getEthereumProvider();
    if (!isEIP1193Provider(rawProvider)) {
      throw new Error('Privy wallet did not return a valid EIP-1193 provider');
    }
    this._provider = createEthersProvider(rawProvider);
    return this._provider;
  }

  async getSigner(): Promise<any> {
    const provider = await this.getProvider();
    return provider.getSigner();
  }

  async isConnected(): Promise<boolean> {
    if (!this.wallet?.address) return false;
    try {
      const rawProvider = await this.wallet.getEthereumProvider();
      if (!isEIP1193Provider(rawProvider)) return false;
      const accounts = (await rawProvider.request({ method: 'eth_accounts' })) as string[] | undefined;
      if (!Array.isArray(accounts) || accounts.length === 0) return false;
      const normalized = this.wallet.address.toLowerCase();
      return accounts.some((a) => (a || '').toLowerCase() === normalized);
    } catch {
      return false;
    }
  }

  async switchChain(chainId: ChainId): Promise<void> {
    if (this.wallet.switchChain) {
      await this.wallet.switchChain(chainId);
      this._provider = null;
    } else {
      throw new Error('Privy wallet does not support switchChain');
    }
  }
}
