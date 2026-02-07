import EventEmitter from 'eventemitter3';
import { DeploySDKConfig, SDKEvents, ChainId } from './types';
import { WalletAdapter } from '../wallet-adapters/base';
import { DeploySDKError, ErrorCode } from './errors';
import { MintModule } from '../modules/mint/MintModule';
import { StakeModule } from '../modules/stake/StakeModule';
import { UnstakeModule } from '../modules/unstake/UnstakeModule';
import { RedeemModule } from '../modules/redeem/RedeemModule';
import { AllowanceService } from '../services/AllowanceService';
import { BalanceService } from '../services/BalanceService';

export class DeploySDK extends EventEmitter<SDKEvents> {
  private _provider: any = null;
  private _signer: any = null;
  private _walletAdapter: WalletAdapter | null = null;
  private _config: DeploySDKConfig;
  private _isInitialized = false;

  public readonly mint: MintModule;
  public readonly stake: StakeModule;
  public readonly unstake: UnstakeModule;
  public readonly redeem: RedeemModule;
  
  public readonly allowance: AllowanceService;
  public readonly balances: BalanceService;

  constructor(config: DeploySDKConfig) {
    super();
    if (!config?.apiUrl?.trim()) {
      throw new DeploySDKError(
        ErrorCode.VALIDATION_ERROR,
        'apiUrl is required. Provide the API base URL when creating DeploySDK.'
      );
    }
    this._config = {
      chainId: ChainId.ETHEREUM,
      ...config
    };

    this.mint = new MintModule(this);
    this.stake = new StakeModule(this);
    this.unstake = new UnstakeModule(this);
    this.redeem = new RedeemModule(this);
    
    this.allowance = new AllowanceService(this);
    this.balances = new BalanceService(this);
  }

  async initialize(adapter: WalletAdapter): Promise<void> {
    try {
      this.emit('initializing');
      
      this._walletAdapter = adapter;
      this._provider = await adapter.getProvider();
      this._signer = await adapter.getSigner();
      
      const isConnected = await adapter.isConnected();
      if (!isConnected) {
        throw new DeploySDKError(
          ErrorCode.WALLET_NOT_CONNECTED,
          'Wallet not connected'
        );
      }

      const address = await this.getAddress();
      
      this._isInitialized = true;
      this.emit('initialized', { address });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  get provider(): any {
    if (!this._provider) {
      throw new DeploySDKError(
        ErrorCode.NOT_INITIALIZED,
        'SDK not initialized. Call initialize() first.'
      );
    }
    return this._provider;
  }

  get signer(): any {
    if (!this._signer) {
      throw new DeploySDKError(
        ErrorCode.NOT_INITIALIZED,
        'SDK not initialized. Call initialize() first.'
      );
    }
    return this._signer;
  }

  get config(): DeploySDKConfig {
    return { ...this._config };
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async getAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  async getChainId(): Promise<number> {
    const network = await this.provider.getNetwork();
    return network.chainId;
  }

  async switchChain(chainId: ChainId): Promise<void> {
    if (this._walletAdapter?.switchChain) {
      await this._walletAdapter.switchChain(chainId);
      this._config.chainId = chainId;
      this.emit('chainChanged', { chainId });
    } else {
      throw new DeploySDKError(
        ErrorCode.NOT_INITIALIZED,
        'Wallet adapter does not support chain switching'
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this._walletAdapter?.disconnect) {
      await this._walletAdapter.disconnect();
    }
    this._provider = null;
    this._signer = null;
    this._walletAdapter = null;
    this._isInitialized = false;
    this.emit('disconnected');
  }
}