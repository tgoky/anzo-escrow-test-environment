import { FinancialAccount, FinancialAccountConnectionResponse } from '@shared/types/financial-account';

/**
 * Base interface for account connection strategies
 * This ensures consistent implementation across different providers
 */
export interface BaseAccountConnectionStrategy {
  // Required methods
  validate: (currency: string, paymentMethod: string) => boolean;
  connect: (params: AccountConnectionParams) => Promise<AccountInfo>;
  initializeConnection: (params: AccountConnectionParams) => Promise<AccountInfo>;
  processConnection: (connectionData: any) => Promise<AccountInfo>;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
}

export interface AccountConnectionParams {
  currency: string;
  paymentMethod: string;
  walletAddress: string;
  countryCode?: string;
}

export interface AccountInfo {
  success: boolean;
  error?: string;
  data?: {
    provider?: string;
    connectionData?: any;
    accounts?: any[];
  };
}