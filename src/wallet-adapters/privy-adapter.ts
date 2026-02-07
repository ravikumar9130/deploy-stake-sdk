import { WalletAdapter } from './base';

interface PrivyInterface {
  getEthereumProvider(): Promise<any>;
  user?: {
    wallet?: {
      address: string;
    };
  };
}

export class PrivyAdapter implements WalletAdapter {
  name = 'Privy';
  
  constructor(private privy: PrivyInterface) {}

  async getProvider(): Promise<any> {
    return this.privy.getEthereumProvider();
  }

  async getSigner(): Promise<any> {
    const provider = await this.getProvider();
    return provider.getSigner();
  }

  async isConnected(): Promise<boolean> {
    return !!this.privy.user?.wallet?.address;
  }
}