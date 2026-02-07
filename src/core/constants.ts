import { CollateralAsset, StakeToken, ChainId } from './types';

export const CONTRACT_ADDRESSES: Record<number, Record<string, string>> = {
  [ChainId.ETHEREUM]: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    dUSD: '0xf42e0b98e32150fe02a370456e6479fcd94f5531',
    DUSD_MINTER: '0x1ee453Ea35f6EAbD9BFF126586322cbC906D4EB3',
    sDUSD_STAKING: '0x7f37B0133B1adC1D0647EE52eA38fA13caC4aA1B',
  },
  [ChainId.ARBITRUM]: {},
};

export const COLLATERAL_ASSETS: Record<string, CollateralAsset> = {
  USDC: {
    key: 'USDC',
    name: 'USD Coin',
    symbol: 'USDC',
    address: CONTRACT_ADDRESSES[ChainId.ETHEREUM].USDC,
    decimals: 6,
    mintingContract: CONTRACT_ADDRESSES[ChainId.ETHEREUM].DUSD_MINTER,
  },
  USDT: {
    key: 'USDT',
    name: 'Tether USD',
    symbol: 'USDT',
    address: CONTRACT_ADDRESSES[ChainId.ETHEREUM].USDT,
    decimals: 6,
    mintingContract: CONTRACT_ADDRESSES[ChainId.ETHEREUM].DUSD_MINTER,
  },
};

export const STAKE_TOKENS: Record<string, StakeToken> = {
  dUSD: {
    key: 'dUSD',
    name: 'Deploy USD',
    symbol: 'dUSD',
    address: CONTRACT_ADDRESSES[ChainId.ETHEREUM].dUSD,
    decimals: 18,
    supportedCollateral: [COLLATERAL_ASSETS.USDC, COLLATERAL_ASSETS.USDT],
    mintingContract: CONTRACT_ADDRESSES[ChainId.ETHEREUM].DUSD_MINTER,
    stakingContract: CONTRACT_ADDRESSES[ChainId.ETHEREUM].sDUSD_STAKING,
    stakingSymbol: 'sDUSD',
    cooldownPeriod: 90 * 24 * 60 * 60 * 1000,
  },
};

export const EIP712_TYPES_ORDER = {
  Order: [
    { name: 'order_id', type: 'string' },
    { name: 'order_type', type: 'uint8' },
    { name: 'expiry', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'benefactor', type: 'address' },
    { name: 'beneficiary', type: 'address' },
    { name: 'collateral_asset', type: 'address' },
    { name: 'collateral_amount', type: 'uint256' },
    { name: 'dAsset_amount', type: 'uint256' },
  ],
};

export const ERC4626_ABI = [
  'function deposit(uint256 assets, address receiver) external returns (uint256 shares)',
  'function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)',
  'function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)',
  'function cooldownShares(uint256 shares) external',
  'function cooldowns(address user) external view returns (uint256 cooldownEnd, uint256 underlyingAmount)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function convertToShares(uint256 assets) external view returns (uint256)',
  'function convertToAssets(uint256 shares) external view returns (uint256)',
  'function totalAssets() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)',
];

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export const MINTER_ABI = [
  'function mint(tuple(string order_id, uint8 order_type, uint256 expiry, uint256 nonce, address benefactor, address beneficiary, address collateral_asset, uint256 collateral_amount, uint256 dAsset_amount) order, tuple(address[] addresses, uint256[] ratios) route, tuple(uint8 signature_type, bytes signature_bytes) signature) external',
  'function redeem(tuple(string order_id, uint8 order_type, uint256 expiry, uint256 nonce, address benefactor, address beneficiary, address collateral_asset, uint256 collateral_amount, uint256 dAsset_amount) order, tuple(uint8 signature_type, bytes signature_bytes) signature) external',
  'function isWhitelistedBenefactor(address benefactor) external view returns (bool)',
  'function addWhitelistedBenefactor(address benefactor) external',
  'function removeWhitelistedBenefactor(address benefactor) external',
];