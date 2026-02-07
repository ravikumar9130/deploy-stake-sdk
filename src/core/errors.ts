export enum ErrorCode {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INVALID_CHAIN = 'INVALID_CHAIN',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  STAKE_FAILED = 'STAKE_FAILED',
  UNSTAKE_FAILED = 'UNSTAKE_FAILED',
  COOLDOWN_FAILED = 'COOLDOWN_FAILED',
  MINT_FAILED = 'MINT_FAILED',
  REDEEM_FAILED = 'REDEEM_FAILED',
  INVALID_ORDER = 'INVALID_ORDER',
  SIGNATURE_FAILED = 'SIGNATURE_FAILED',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class DeploySDKError extends Error {
  public readonly code: ErrorCode;
  public readonly originalError?: any;

  constructor(code: ErrorCode, message: string, originalError?: any) {
    super(message);
    this.name = 'DeploySDKError';
    this.code = code;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DeploySDKError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      originalError: this.originalError?.message || this.originalError,
    };
  }
}