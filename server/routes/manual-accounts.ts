import { Request, Response } from 'express';
import { z } from 'zod';
import { manualFinancialAccountSchema } from '../../shared/types/manual-financial-account';
import { manualFinancialAccountProvider } from '../manual-financial-account-provider';
import { ManualAccountService } from '../../shared/services/manual-account-service';
import { FinancialAccount } from '../../shared/types/financial-account';
import { getPaymentMethodsByCountryAndCurrency } from './payment-method-options';

/**
 * Create a new manual financial account
 */
export async function createManualAccount(req: Request, res: Response) {
  try {
    console.log('📊 CREATE MANUAL ACCOUNT [API]: Request received with body:', JSON.stringify(req.body));
    
    // Validate input
    const validationResult = ManualAccountService.validateAccountData(req.body);
    if (!validationResult.valid) {
      console.log('❌ CREATE MANUAL ACCOUNT [API]: Validation failed with errors:', validationResult.errors);
      return res.status(400).json({ 
        error: 'Invalid account data', 
        details: validationResult.errors 
      });
    }
    
    console.log('✅ CREATE MANUAL ACCOUNT [API]: Data validated successfully');
    
    try {
      // Parse and create account
      const accountData = manualFinancialAccountSchema.parse(req.body);
      console.log('📝 CREATE MANUAL ACCOUNT [API]: Parsed data:', JSON.stringify(accountData));
      
      const account = await manualFinancialAccountProvider.createAccount(accountData);
      console.log('🎉 CREATE MANUAL ACCOUNT [API]: Account created successfully:', JSON.stringify(account));
      
      return res.status(201).json(account);
    } catch (parseError) {
      if (parseError instanceof z.ZodError) {
        console.log('❌ CREATE MANUAL ACCOUNT [API]: Zod schema validation error:', JSON.stringify(parseError.errors));
        return res.status(400).json({ 
          error: 'Schema validation failed', 
          details: parseError.errors 
        });
      }
      throw parseError; // Re-throw other errors to be caught by the outer catch
    }
  } catch (error) {
    console.error('❌ CREATE MANUAL ACCOUNT [API]: Critical error creating manual account:', error);
    // Check for specific error types
    if (error instanceof Error) {
      const errorMessage = error.message;
      const errorStack = error.stack;
      console.error('❌ CREATE MANUAL ACCOUNT [API]: Error details:', {
        message: errorMessage,
        stack: errorStack,
        name: error.name
      });
      
      // Check if it's a database-related error
      if (errorMessage.includes('database') || errorMessage.includes('sql') || 
          errorMessage.includes('constraint') || errorMessage.includes('duplicate')) {
        return res.status(500).json({ 
          error: 'Database error', 
          message: errorMessage
        });
      }
    }
    
    return res.status(500).json({ 
      error: 'Failed to create account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get accounts for a wallet address
 */
export async function getManualAccounts(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const accounts = await manualFinancialAccountProvider.getAccountsByWallet(walletAddress);
    
    return res.status(200).json(accounts);
  } catch (error) {
    console.error('Error getting manual accounts:', error);
    return res.status(500).json({ error: 'Failed to retrieve accounts' });
  }
}

/**
 * Get account by ID
 */
export async function getManualAccountById(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    const account = await manualFinancialAccountProvider.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    return res.status(200).json(account);
  } catch (error) {
    console.error('Error getting manual account:', error);
    return res.status(500).json({ error: 'Failed to retrieve account' });
  }
}

/**
 * Update payment methods for an account
 */
export async function updatePaymentMethods(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    const { paymentMethods } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    if (!Array.isArray(paymentMethods)) {
      return res.status(400).json({ error: 'Payment methods must be an array' });
    }
    
    // First check if account exists
    const account = await manualFinancialAccountProvider.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Update payment methods
    const success = await manualFinancialAccountProvider.updatePaymentMethods(accountId, paymentMethods);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update payment methods' });
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating payment methods:', error);
    return res.status(500).json({ error: 'Failed to update payment methods' });
  }
}

/**
 * Delete an account
 */
export async function deleteManualAccount(req: Request, res: Response) {
  try {
    const { accountId } = req.params;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    // First check if account exists
    const account = await manualFinancialAccountProvider.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Delete account
    const success = await manualFinancialAccountProvider.deleteAccount(accountId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete account' });
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}

/**
 * Get payment method options for a country and currency
 */
export async function getPaymentMethodOptions(req: Request, res: Response) {
  try {
    console.log('🔍 PAYMENT METHODS API: Received request with query:', req.query);
    const { country, currency } = req.query;
    
    if (!country || typeof country !== 'string') {
      console.log('⚠️ PAYMENT METHODS API: Missing country parameter');
      return res.status(400).json({ error: 'Country is required' });
    }
    
    if (!currency || typeof currency !== 'string') {
      console.log('⚠️ PAYMENT METHODS API: Missing currency parameter');
      return res.status(400).json({ error: 'Currency is required' });
    }
    
    console.log(`🔍 PAYMENT METHODS API: Looking for payment methods for country=${country}, currency=${currency}`);
    
    // Get the payment methods using our file-based approach
    const options = await getPaymentMethodsByCountryAndCurrency(country, currency);
    
    console.log(`✅ PAYMENT METHODS API: Found ${options.length} payment methods`, options);
    return res.status(200).json(options);
  } catch (error) {
    console.error('❌ PAYMENT METHODS API: Error getting payment method options:', error);
    return res.status(500).json({ error: 'Failed to get payment method options' });
  }
}

/**
 * Get formatted payment method details for a specific account and method type
 */
export async function getFormattedPaymentMethodDetails(req: Request, res: Response) {
  try {
    const { accountId, methodType } = req.params;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    if (!methodType) {
      return res.status(400).json({ error: 'Method type is required' });
    }
    
    // Get the account
    const account = await manualFinancialAccountProvider.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Find the payment method
    if (!account.manualDetails?.paymentMethods) {
      return res.status(404).json({ error: 'No payment methods found for this account' });
    }
    
    const paymentMethod = account.manualDetails.paymentMethods.find(
      method => method.type === methodType
    );
    
    if (!paymentMethod) {
      return res.status(404).json({ 
        error: `Payment method '${methodType}' not found for this account`,
        availableMethods: account.manualDetails.paymentMethods.map(m => m.type)
      });
    }
    
    // Format the payment method details
    const formattedDetails = ManualAccountService.formatPaymentMethodForDisplay(paymentMethod);
    
    return res.status(200).json({
      accountId,
      methodType,
      displayName: formattedDetails.name,
      details: formattedDetails.formattedDetails,
      paymentInstructions: formattedDetails.paymentInstructions
    });
  } catch (error) {
    console.error('Error getting formatted payment method details:', error);
    return res.status(500).json({ 
      error: 'Failed to get payment method details',
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Get payment instructions for a specific account and method type
 */
export async function getPaymentInstructions(req: Request, res: Response) {
  try {
    const { accountId, methodType } = req.params;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }
    
    if (!methodType) {
      return res.status(400).json({ error: 'Method type is required' });
    }
    
    // Get the account
    const account = await manualFinancialAccountProvider.getAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Find the payment method
    if (!account.manualDetails?.paymentMethods) {
      return res.status(404).json({ error: 'No payment methods found for this account' });
    }
    
    const paymentMethod = account.manualDetails.paymentMethods.find(
      method => method.type === methodType
    );
    
    if (!paymentMethod) {
      return res.status(404).json({ error: `Payment method '${methodType}' not found for this account` });
    }
    
    // Get payment instructions
    const instructions = ManualAccountService.getPaymentInstructions(paymentMethod);
    
    return res.status(200).json({
      accountId,
      methodType,
      paymentInstructions: instructions
    });
  } catch (error) {
    console.error('Error getting payment instructions:', error);
    return res.status(500).json({ error: 'Failed to get payment instructions' });
  }
}