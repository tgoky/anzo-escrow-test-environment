import { create } from 'zustand';
import type { FinancialAccount, FinancialAccountConnectionResponse } from '@shared/types/financial-account';
import { BaseAccountConnectionStrategy, AccountConnectionParams, AccountInfo } from './base-account-connection-strategy';
import { PlaidAccountConnectionStrategy } from './plaid-account-connection-strategy';
import { ManualAccountConnectionStrategy } from './manual-account-connection-strategy';

export type { AccountConnectionParams, AccountInfo };

/**
 * Registry that manages all financial account connection strategies
 */
class AccountConnectionRegistry {
  private static instance: AccountConnectionRegistry;
  private strategies = new Map<string, BaseAccountConnectionStrategy>();

  private constructor() {
    // Register Plaid strategy for USD/Zelle
    const plaidStrategy = new PlaidAccountConnectionStrategy();
    this.registerStrategy('plaid', plaidStrategy);
    
    // Register Manual account strategy
    const manualStrategy = new ManualAccountConnectionStrategy();
    this.registerStrategy('manual', manualStrategy);
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): AccountConnectionRegistry {
    if (!AccountConnectionRegistry.instance) {
      AccountConnectionRegistry.instance = new AccountConnectionRegistry();
    }
    return AccountConnectionRegistry.instance;
  }

  /**
   * Register a new account connection strategy
   */
  registerStrategy(key: string, strategy: BaseAccountConnectionStrategy): void {
    this.strategies.set(key, strategy);
  }

  /**
   * Get all supported currencies across all strategies
   */
  getSupportedCurrencies(): string[] {
    const currencies = new Set<string>();
    [...this.strategies.values()].forEach(strategy => {
      strategy.supportedCurrencies.forEach(currency => currencies.add(currency));
    });
    return Array.from(currencies);
  }

  /**
   * Get supported payment methods for a specific currency
   */
  getSupportedPaymentMethods(currency: string): string[] {
    const upperCaseCurrency = currency.toUpperCase();
    const paymentMethods = new Set<string>();

    [...this.strategies.values()].forEach(strategy => {
      if (strategy.supportedCurrencies.includes(upperCaseCurrency)) {
        strategy.supportedPaymentMethods.forEach(method => paymentMethods.add(method));
      }
    });

    return Array.from(paymentMethods);
  }

  /**
   * Get the appropriate connection strategy
   */
  getConnectionStrategy(currency: string, paymentMethod: string, countryCode?: string): BaseAccountConnectionStrategy | null {
    const normalizedCurrency = currency.toUpperCase();
    const normalizedPaymentMethod = paymentMethod.toLowerCase();

    for (const strategy of [...this.strategies.values()]) {
      if (strategy.validate(normalizedCurrency, normalizedPaymentMethod)) {
        return strategy;
      }
    }

    return null;
  }

  /**
   * Connect to a financial account using the appropriate strategy
   */
  async connect(params: AccountConnectionParams): Promise<AccountInfo> {
    const { currency = 'USD', paymentMethod } = params;

    try {
      const strategy = this.getConnectionStrategy(currency, paymentMethod, params.countryCode);

      if (!strategy) {
        throw new Error(`No strategy found for currency ${currency} and payment method ${paymentMethod}`);
      }

      return await strategy.connect(params);
    } catch (error) {
      console.error('Account connection error:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const accountConnectionRegistry = AccountConnectionRegistry.getInstance();