import { BaseAccountConnectionStrategy, AccountConnectionParams, AccountInfo } from './base-account-connection-strategy';
import type { ManualFinancialAccount } from '@shared/types/manual-financial-account';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from './queryClient';

/**
 * Strategy for connecting manual financial accounts
 */
export class ManualAccountConnectionStrategy implements BaseAccountConnectionStrategy {
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'GHS', 'INR', 'MXN'];
  readonly supportedPaymentMethods = ['zelle', 'cashapp', 'venmo', 'bank_transfer', 'paypal', 'cash_deposit', 'mobile_money', 'mpesa', 'upi'];

  /**
   * Validate if this strategy can handle the given currency and payment method
   */
  validate(currency: string, paymentMethod: string): boolean {
    return this.supportedCurrencies.includes(currency.toUpperCase()) && 
      this.supportedPaymentMethods.includes(paymentMethod.toLowerCase());
  }

  /**
   * Connect to a financial account using this strategy
   */
  async connect(params: AccountConnectionParams): Promise<AccountInfo> {
    try {
      // Start with step 1 - Get available payment methods
      return await this.initializeConnection(params);
    } catch (error) {
      console.error('Manual account connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error connecting to manual account'
      };
    }
  }

  /**
   * Initialize the connection flow
   */
  async initializeConnection(params: AccountConnectionParams): Promise<AccountInfo> {
    try {
      // Get available payment methods for the selected currency and country
      const response = await fetch(`/api/payment-method-options?currency=${params.currency}&country=${params.countryCode || 'US'}`);
      
      if (!response.ok) {
        throw new Error('Failed to get payment method options');
      }

      const paymentMethods = await response.json();
      
      // Return information for the form
      return {
        success: true,
        data: {
          provider: 'manual',
          connectionData: {
            paymentMethodOptions: paymentMethods,
            step: 'form',
            currency: params.currency,
            country: params.countryCode
          }
        }
      };
    } catch (error) {
      console.error('Error initializing manual connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error initializing manual account connection'
      };
    }
  }

  /**
   * Process the submitted account data
   */
  async processConnection(accountData: any): Promise<AccountInfo> {
    try {
      // Submit the account data to the API
      const response = await fetch('/api/manual-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create manual account');
      }

      const account: ManualFinancialAccount = await response.json();
      
      return {
        success: true,
        data: {
          provider: 'manual',
          connectionData: { accountId: account.id },
          accounts: [account]
        }
      };
    } catch (error) {
      console.error('Error processing manual account connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error creating manual account'
      };
    }
  }
}