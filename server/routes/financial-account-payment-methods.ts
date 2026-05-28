import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FinancialAccountService } from '@shared/services/financial-account-service';
import { db } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import { financialAccounts, paymentMethods } from '@shared/schema';
import { adminMiddleware, roleMiddleware } from './admin';
import type { FinancialAccount } from '@shared/types/financial-account';
import type { RegionalAccountDetails, PaymentCapabilities } from '@shared/types/financial-account';

// Schema for linking a payment method to an account
const linkPaymentMethodSchema = z.object({
  accountId: z.string().min(1),
  paymentMethodId: z.number().int().positive()
});

// Schema for adding a payment method type to an account
const addPaymentMethodTypeSchema = z.object({
  accountId: z.string().min(1),
  methodType: z.string().min(1),
  currency: z.string().min(3).max(3)
});

/**
 * Link a payment method to a financial account
 * This establishes the foreign key relationship
 */
export async function linkPaymentMethod(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = linkPaymentMethodSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validatedData.error.errors 
      });
    }

    const { accountId, paymentMethodId } = validatedData.data;

    // Check if the account exists
    const account = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, accountId)
    });

    if (!account) {
      return res.status(404).json({
        message: `Financial account with ID ${accountId} not found`
      });
    }

    // Check if the payment method exists
    const method = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, paymentMethodId)
    });

    if (!method) {
      return res.status(404).json({
        message: `Payment method with ID ${paymentMethodId} not found`
      });
    }

    // Link the payment method to the account
    const success = await FinancialAccountService.linkPaymentMethodToAccount(
      accountId,
      paymentMethodId
    );

    if (!success) {
      return res.status(500).json({
        message: 'Failed to link payment method to account'
      });
    }

    return res.status(200).json({
      message: 'Payment method linked to account successfully',
      accountId,
      paymentMethodId,
      methodType: method.methodType,
      currency: method.currency
    });
  } catch (error) {
    console.error('Error linking payment method to account:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

/**
 * Unlink a payment method from a financial account
 */
export async function unlinkPaymentMethod(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = linkPaymentMethodSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validatedData.error.errors 
      });
    }

    const { accountId, paymentMethodId } = validatedData.data;

    // Check if the account exists
    const account = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, accountId)
    });

    if (!account) {
      return res.status(404).json({
        message: `Financial account with ID ${accountId} not found`
      });
    }

    // Check if the account has this payment method linked
    if (account.paymentMethodId !== paymentMethodId) {
      return res.status(400).json({
        message: `Payment method with ID ${paymentMethodId} is not linked to this account`
      });
    }

    // Unlink the payment method from the account
    const success = await FinancialAccountService.unlinkPaymentMethodFromAccount(
      accountId,
      paymentMethodId
    );

    if (!success) {
      return res.status(500).json({
        message: 'Failed to unlink payment method from account'
      });
    }

    return res.status(200).json({
      message: 'Payment method unlinked from account successfully',
      accountId
    });
  } catch (error) {
    console.error('Error unlinking payment method from account:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

/**
 * Get payment method details for a financial account
 */
export async function getPaymentMethodForAccount(req: Request, res: Response) {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({
        message: 'Account ID is required'
      });
    }

    // Check if the account exists
    const account = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, accountId)
    });

    if (!account) {
      return res.status(404).json({
        message: `Financial account with ID ${accountId} not found`
      });
    }

    // Get the linked payment method
    const paymentMethod = await FinancialAccountService.getPaymentMethodDetails(accountId);

    if (!paymentMethod) {
      return res.status(404).json({
        message: 'No payment method linked to this account',
        accountId,
        paymentMethodTypes: account.paymentMethodTypes || []
      });
    }

    return res.status(200).json({
      accountId,
      paymentMethod,
      paymentMethodTypes: account.paymentMethodTypes || []
    });
  } catch (error) {
    console.error('Error getting payment method for account:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

/**
 * Add a payment method type to an account's supported methods
 * This updates the paymentMethodTypes array without changing the foreign key
 */
export async function addPaymentMethodType(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = addPaymentMethodTypeSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validatedData.error.errors 
      });
    }

    const { accountId, methodType, currency } = validatedData.data;

    // Check if the account exists
    const account = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, accountId)
    });

    if (!account) {
      return res.status(404).json({
        message: `Financial account with ID ${accountId} not found`
      });
    }

    // Add the payment method type to the account
    const success = await FinancialAccountService.addPaymentMethodType(
      accountId,
      methodType,
      currency
    );

    if (!success) {
      return res.status(500).json({
        message: 'Failed to add payment method type to account'
      });
    }

    // Get the updated account
    const updatedAccount = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, accountId)
    });

    return res.status(200).json({
      message: 'Payment method type added to account successfully',
      accountId,
      methodType,
      currency,
      paymentMethodTypes: updatedAccount?.paymentMethodTypes || []
    });
  } catch (error) {
    console.error('Error adding payment method type to account:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

/**
 * Remove a payment method type from an account's supported methods
 */
export async function removePaymentMethodType(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = addPaymentMethodTypeSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validatedData.error.errors 
      });
    }

    const { accountId, methodType, currency } = validatedData.data;

    // Check if the account exists
    const account = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, accountId)
    });

    if (!account) {
      return res.status(404).json({
        message: `Financial account with ID ${accountId} not found`
      });
    }

    // Remove the payment method type from the account
    const success = await FinancialAccountService.removePaymentMethodType(
      accountId,
      methodType,
      currency
    );

    if (!success) {
      return res.status(500).json({
        message: 'Failed to remove payment method type from account'
      });
    }

    // Get the updated account
    const updatedAccount = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, accountId)
    });

    return res.status(200).json({
      message: 'Payment method type removed from account successfully',
      accountId,
      paymentMethodTypes: updatedAccount?.paymentMethodTypes || []
    });
  } catch (error) {
    console.error('Error removing payment method type from account:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

/**
 * Get all financial accounts linked to a payment method
 */
export async function getAccountsByPaymentMethod(req: Request, res: Response) {
  try {
    const { paymentMethodId } = req.params;

    if (!paymentMethodId || isNaN(parseInt(paymentMethodId))) {
      return res.status(400).json({
        message: 'Valid payment method ID is required'
      });
    }

    const paymentMethodIdNumber = parseInt(paymentMethodId);

    // Check if the payment method exists
    const method = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, paymentMethodIdNumber)
    });

    if (!method) {
      return res.status(404).json({
        message: `Payment method with ID ${paymentMethodId} not found`
      });
    }

    // Get all accounts linked to this payment method
    const accountIds = await FinancialAccountService.getAccountsByPaymentMethod(paymentMethodIdNumber);

    // Get the full account details
    const accounts = await db.query.financialAccounts.findMany({
      where: inArray(financialAccounts.accountId, accountIds)
    });

    return res.status(200).json({
      paymentMethodId: paymentMethodIdNumber,
      methodType: method.methodType,
      currency: method.currency,
      linkedAccounts: accounts.map(account => ({
        accountId: account.accountId,
        accountName: account.accountName,
        accountType: account.accountType,
        currency: account.currency,
        status: account.status
      }))
    });
  } catch (error) {
    console.error('Error getting accounts by payment method:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

/**
 * Find matching payment methods between two accounts
 * Used for offer/transaction matching
 */
export async function findMatchingPaymentMethods(req: Request, res: Response) {
  try {
    const { makerAccountId, takerAccountId } = req.body;

    if (!makerAccountId || !takerAccountId) {
      return res.status(400).json({
        message: 'Both maker and taker account IDs are required'
      });
    }

    // Get the maker account
    const makerAccount = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, makerAccountId)
    });

    if (!makerAccount) {
      return res.status(404).json({
        message: `Maker financial account with ID ${makerAccountId} not found`
      });
    }

    // Get the taker account
    const takerAccount = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.accountId, takerAccountId)
    });

    if (!takerAccount) {
      return res.status(404).json({
        message: `Taker financial account with ID ${takerAccountId} not found`
      });
    }

    // Since findMatchingPaymentMethods only requires paymentMethodTypes array,
    // we can pass in a simplified object that just contains what the function needs
    
    const makerPaymentMethodTypes = makerAccount.paymentMethodTypes || [];
    const takerPaymentMethodTypes = takerAccount.paymentMethodTypes || [];
    
    // Create minimal objects with just the required properties
    const simplifiedMakerAccount = {
      id: makerAccount.accountId,
      paymentMethodTypes: makerPaymentMethodTypes,
    } as unknown as FinancialAccount;
    
    const simplifiedTakerAccount = {
      id: takerAccount.accountId,
      paymentMethodTypes: takerPaymentMethodTypes,
    } as unknown as FinancialAccount;
    
    // Find matching payment method types
    const matchingMethods = FinancialAccountService.findMatchingPaymentMethods(
      simplifiedMakerAccount,
      simplifiedTakerAccount
    );

    // Get payment method details for these types
    const matchingMethodsDetails = [];
    for (const methodTypeId of matchingMethods) {
      // Parse the method type ID to get type and currency
      const parts = methodTypeId.split('_');
      if (parts.length === 2) {
        const methodType = parts[0];
        const currency = parts[1];
        
        // Find the corresponding payment method in the database
        const method = await db.query.paymentMethods.findFirst({
          where: and(
            eq(paymentMethods.methodType, methodType),
            eq(paymentMethods.currency, currency)
          )
        });
        
        if (method) {
          matchingMethodsDetails.push(method);
        }
      }
    }

    return res.status(200).json({
      makerAccountId,
      takerAccountId,
      matchingMethodTypes: matchingMethods,
      matchingMethods: matchingMethodsDetails
    });
  } catch (error) {
    console.error('Error finding matching payment methods:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}