import { ChainId } from '../core/types';
import { WalletAdapter } from './base';

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
}

export class ExternalWalletAdapter implements WalletAdapter {
  name = 'External';

  constructor(private ethereum: EthereumProvider) {}

  async getProvider(): Promise<any> {
    return this.ethereum;
  }

  async getSigner(): Promise<any> {
    await this.ethereum.request({ method: 'eth_requestAccounts' });
    return this.ethereum;
  }

  async isConnected(): Promise<boolean> {
    try {
      const accounts = await this.ethereum.request({ method: 'eth_accounts' });
      return accounts.length > 0;
    } catch {
      return false;
    }
  }

  async switchChain(chainId: ChainId): Promise<void> {
    const hexChainId = `0x${chainId.toString(16)}`;
    try {
      await this.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await this.addChain(chainId);
      } else {
        throw switchError;
      }
    }
  }

  private async addChain(chainId: ChainId): Promise<void> {
    const chainConfigs: Record<number, any> = {
      [ChainId.ETHEREUM]: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://eth.llamarpc.com'],
        blockExplorerUrls: ['https://etherscan.io'],
      },
      [ChainId.ARBITRUM]: {
        chainId: '0xa4b1',
        chainName: 'Arbitrum One',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://arbiscan.io'],
      },
    };

    const config = chainConfigs[chainId];
    if (!config) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    await this.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [config],
    });
  }
}