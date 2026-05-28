import { BaseAccountConnectionStrategy, AccountConnectionParams, AccountInfo } from './base-account-connection-strategy';
import type { PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import axios from 'axios';

export class PlaidAccountConnectionStrategy implements BaseAccountConnectionStrategy {
  readonly supportedCurrencies = ['USD'];
  readonly supportedPaymentMethods = ['zelle'];

  validate(currency: string, paymentMethod: string): boolean {
    return (
      this.supportedCurrencies.includes(currency.toUpperCase()) &&
      this.supportedPaymentMethods.includes(paymentMethod.toLowerCase())
    );
  }

  async initializeConnection(params: AccountConnectionParams): Promise<AccountInfo> {
    try {
      // Create link token
      const createTokenResponse = await axios.post('/api/plaid/create-link-token', {
        walletAddress: params.walletAddress,
        currency: params.currency
      });

      if (!createTokenResponse.data.link_token) {
        throw new Error('Failed to create Plaid link token');
      }

      return {
        success: true,
        data: {
          provider: 'plaid',
          connectionData: {
            token: createTokenResponse.data.link_token
          }
        }
      };
    } catch (error) {
      console.error('Plaid connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async processConnection(connectionData: any): Promise<AccountInfo> {
    try {
      if (!connectionData || !connectionData.accounts) {
        throw new Error('Invalid connection data received from Plaid');
      }

      return {
        success: true,
        data: {
          provider: 'plaid',
          accounts: connectionData.accounts
        }
      };
    } catch (error) {
      console.error('Error processing Plaid connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process connection'
      };
    }
  }

  async connect(params: AccountConnectionParams): Promise<AccountInfo> {
    try {
      const initResult = await this.initializeConnection(params);
      if (!initResult.success) {
        return initResult;
      }
      return initResult;
    } catch (error) {
      console.error('Error in Plaid connect:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect'
      };
    }
  }
}