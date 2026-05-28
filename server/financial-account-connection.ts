import { Request, Response } from 'express';
import { z } from 'zod';
import { FinancialAccount, FinancialAccountConnectionResponse } from '../shared/types/financial-account';
import { FinancialAccountService } from '../shared/services/financial-account-service';

// Enhanced schema for financial account connection request
export const financialAccountConnectionSchema = z.object({
  currency: z.string(),
  paymentMethod: z.string(),
  walletAddress: z.string(),
  country: z.string().optional(), // Country code helps determine provider
  preferredProvider: z.string().optional(), // Allow client to specify provider
  accountType: z.string().optional() // Type of financial account (bank_account, e-wallet, etc.)
});

export async function createFinancialAccountConnection(req: Request, res: Response) {
  try {
    const data = financialAccountConnectionSchema.parse(req.body);

    // Route to appropriate provider based on currency, country, payment method, and account type
    const provider = getAccountProvider(data.currency, data.paymentMethod, data.country, data.accountType);

    if (!provider) {
      return res.status(400).json({
        error: 'Unsupported currency or payment method combination',
        details: `No provider found for ${data.currency} with ${data.paymentMethod}${data.country ? ` in ${data.country}` : ''}${data.accountType ? ` for ${data.accountType}` : ''}`
      });
    }

    // Provider will implement its own connection logic
    const connectionResponse = await provider.connect(data);

    // Process and store the financial accounts using the service
    await FinancialAccountService.processNewConnection(connectionResponse);

    res.status(200).json(connectionResponse);

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      console.error('Financial account connection error:', error);
      res.status(500).json({ error: 'Failed to establish financial account connection' });
    }
  }
}

export async function getFinancialAccountConnectionStatus(req: Request, res: Response) {
  try {
    const { connectionId, currency, paymentMethod, country, accountType } = req.query;

    if (!connectionId || typeof connectionId !== 'string') {
      return res.status(400).json({ error: 'Connection ID is required' });
    }

    if (!currency || !paymentMethod || typeof currency !== 'string' || typeof paymentMethod !== 'string') {
      return res.status(400).json({ error: 'Currency and payment method are required' });
    }

    const countryStr = typeof country === 'string' ? country : undefined;
    const accountTypeStr = typeof accountType === 'string' ? accountType : undefined;
    const provider = getAccountProvider(currency, paymentMethod, countryStr, accountTypeStr);

    if (!provider) {
      return res.status(400).json({ 
        error: 'Provider not found',
        details: `No provider found for ${currency} with ${paymentMethod}${countryStr ? ` in ${countryStr}` : ''}${accountTypeStr ? ` for ${accountTypeStr}` : ''}`
      });
    }

    const status = await provider.getStatus(connectionId);
    res.status(200).json(status);

  } catch (error) {
    console.error('Financial account connection status error:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
}

// This function will determine which provider to use based on currency, payment method, country and account type
function getAccountProvider(
  currency: string, 
  paymentMethod: string, 
  country?: string, 
  accountType?: string
): AccountProvider | null {
  // Default logic (can be expanded for more precise routing)
  if (currency === 'NGN') {
    return new MonoProvider();
  }

  if (currency === 'EUR' && ['sepa'].includes(paymentMethod)) {
    return new TrueLayerProvider(); // European accounts via TrueLayer
  }

  if (currency === 'GBP' && country === 'GB') {
    return new TrueLayerProvider();
  }

  // E-wallet specific providers
  if (accountType === 'e-wallet') {
    if (currency === 'USD') {
      return new StripeProvider(); // Example for US e-wallets
    }
  }

  // Add more provider mappings as needed

  return null;
}

// Enhanced interface that all financial account providers must implement
export interface AccountProvider {
  connect(data: z.infer<typeof financialAccountConnectionSchema>): Promise<FinancialAccountConnectionResponse>;
  getStatus(connectionId: string): Promise<any>;
  getAccounts(connectionId: string): Promise<FinancialAccount[]>;
  refreshData?(connectionId: string): Promise<FinancialAccount[]>;
  disconnect?(connectionId: string): Promise<boolean>;
  getAccountHolder?(connectionId: string, accountId: string): Promise<any>;
  updateAccountHolder?(connectionId: string, accountId: string, holderInfo: any): Promise<boolean>;
}

// Provider implementations
class MonoProvider implements AccountProvider {
  async connect(data: z.infer<typeof financialAccountConnectionSchema>): Promise<FinancialAccountConnectionResponse> {
    // Implementation for Mono provider will be added here
    throw new Error('Not implemented');
  }

  async getStatus(connectionId: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async getAccounts(connectionId: string): Promise<FinancialAccount[]> {
    throw new Error('Not implemented');
  }
}

class TrueLayerProvider implements AccountProvider {
  async connect(data: z.infer<typeof financialAccountConnectionSchema>): Promise<FinancialAccountConnectionResponse> {
    // Implementation for TrueLayer provider will be added here
    throw new Error('Not implemented');
  }

  async getStatus(connectionId: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async getAccounts(connectionId: string): Promise<FinancialAccount[]> {
    throw new Error('Not implemented');
  }
}

class StripeProvider implements AccountProvider {
  async connect(data: z.infer<typeof financialAccountConnectionSchema>): Promise<FinancialAccountConnectionResponse> {
    // Implementation for Stripe provider will be added here
    throw new Error('Not implemented');
  }

  async getStatus(connectionId: string): Promise<any> {
    throw new Error('Not implemented');
  }

  async getAccounts(connectionId: string): Promise<FinancialAccount[]> {
    throw new Error('Not implemented');
  }
}