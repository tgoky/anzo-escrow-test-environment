import { usePlaidLink } from "react-plaid-link";
import type { FinancialAccount } from '@shared/types/financial-account';
import { accountConnectionRegistry } from "@/lib/account-connection-registry";

export interface PlaidLinkOptions {
  walletAddress: string;
  onSuccess: (account: FinancialAccount) => void;
  onExit: () => void;
  onError: (error: string) => void;
}

export class PlaidService {
  static async initialize(options: PlaidLinkOptions) {
    console.log('Initializing Plaid service...');
    try {
      const createTokenResponse = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: options.walletAddress,
          currency: 'USD'
        })
      });

      if (!createTokenResponse.ok) {
        throw new Error('Failed to create Plaid link token');
      }

      const { link_token } = await createTokenResponse.json();
      console.log('Link token created:', link_token);
      return { token: link_token };
    } catch (err) {
      console.error('Error initializing Plaid:', err);
      throw err;
    }
  }

  static async exchangeToken(publicToken: string, metadata: any, walletAddress: string): Promise<FinancialAccount> {
    console.log('Exchanging Plaid token...');
    try {
      const exchangeResponse = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token: publicToken,
          metadata,
          walletAddress
        })
      });

      if (!exchangeResponse.ok) {
        throw new Error('Failed to exchange token');
      }

      const { accounts } = await exchangeResponse.json();
      if (!accounts?.[0]) {
        throw new Error('No account data received');
      }

      console.log('Token exchanged successfully');
      return accounts[0];
    } catch (err) {
      console.error('Error exchanging Plaid token:', err);
      throw err;
    }
  }
}

export function usePlaidLinkHandler(options: PlaidLinkOptions) {
  const config = {
    token: '',
    onSuccess: async (public_token: string, metadata: any) => {
      try {
        const account = await PlaidService.exchangeToken(public_token, metadata, options.walletAddress);
        options.onSuccess(account);
      } catch (err) {
        options.onError(err instanceof Error ? err.message : 'Failed to connect account');
      }
    },
    onExit: (err?: any) => {
      console.log('Plaid onExit:', err);
      if (err) {
        options.onError('Connection was cancelled');
      }
      options.onExit();
    },
    onEvent: (eventName: string, metadata: any) => {
      console.log('Plaid Link event:', eventName, metadata);
    },
    receivedRedirectUri: window.location.href,
  };

  const plaidLink = usePlaidLink(config);

  return {
    ...plaidLink,
    updateToken: (token: string) => {
      config.token = token;
    }
  };
}