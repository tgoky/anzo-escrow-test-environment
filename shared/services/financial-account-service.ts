
import { db } from '../../server/db';
import { eq, and } from 'drizzle-orm';
import { financialAccounts, paymentMethods } from '../schema';
import { generateUniquePaymentMethodId, parseUniquePaymentMethodId } from '../types/manual-financial-account';

/**
 * Service to handle financial account operations
 */
export class FinancialAccountService {
  /**
   * Process a new financial account connection from any provider
   */
  static async processNewConnection(connectionResponse: import('../types/financial-account').FinancialAccountConnectionResponse): Promise<import('../types/financial-account').FinancialAccount[]> {
    // Map provider data to our universal model
    const financialAccounts = connectionResponse.accounts;
    
    // Here you would persist the financial accounts to your database
    // For example with Drizzle ORM
    
    return financialAccounts;
  }
  
  /**
   * Get formatted financial account display information
   */
  static getDisplayInfo(account: import('../types/financial-account').FinancialAccount): {
    displayName: string;
    maskedNumber: string;
    institutionName: string;
    accountType: string;
    balanceDisplay: string;
    holderName?: string;
  } {
    // Format account info consistently regardless of region/type
    const displayName = account.accountName;
    const maskedNumber = account.mask ? `•••• ${account.mask}` : 'N/A';
    const institutionName = account.institution.name;
    const accountType = `${account.accountType}${account.accountSubtype ? ` - ${account.accountSubtype}` : ''}`;
    
    // Format balance based on currency
    const balanceDisplay = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency,
    }).format(account.balances.available || 0);
    
    // Get account holder name, accounting for different holder types
    let holderName: string | undefined = undefined;
    
    if (account.accountHolder) {
      if (account.accountHolder.type === 'individual' && account.accountHolder.individual) {
        holderName = account.accountHolder.individual.name.fullName;
      } else if (account.accountHolder.type === 'business' && account.accountHolder.business) {
        holderName = account.accountHolder.business.legalName;
      }
    }
    
    return {
      displayName,
      maskedNumber,
      institutionName,
      accountType,
      balanceDisplay,
      holderName
    };
  }
  
  /**
   * Get payment method details available for a financial account
   */
  static getAvailablePaymentMethods(account: import('../types/financial-account').FinancialAccount): {
    method: string;
    enabled: boolean;
    details?: Record<string, any>;
  }[] {
    const methods = [];
    
    // Check for ACH capability
    if (account.paymentCapabilities.ach) {
      methods.push({
        method: 'ach',
        enabled: account.paymentCapabilities.ach.enabled,
        details: {
          routingNumber: account.regionalDetails.routingNumber,
          accountNumber: account.regionalDetails.accountNumber,
        }
      });
    }
    
    // Check for Wire capability
    if (account.paymentCapabilities.wire) {
      methods.push({
        method: 'wire',
        enabled: account.paymentCapabilities.wire.enabled,
        details: {
          swiftCode: account.paymentCapabilities.wire.swift_code,
          routingNumber: account.paymentCapabilities.wire.routing_number,
        }
      });
    }
    
    // Check for Zelle capability
    if (account.paymentCapabilities.zelle) {
      methods.push({
        method: 'zelle',
        enabled: account.paymentCapabilities.zelle.enabled,
        details: {
          email: account.paymentCapabilities.zelle.email,
          phone: account.paymentCapabilities.zelle.phone,
        }
      });
    }
    
    // Add other payment methods as they become available
    
    return methods;
  }
  
  /**
   * Get region-specific account details for display or use
   */
  static getRegionalDetails(account: import('../types/financial-account').FinancialAccount): Record<string, string> {
    const details: Record<string, string> = {};
    
    // Add available regional details
    Object.entries(account.regionalDetails).forEach(([key, value]) => {
      if (value) {
        details[key] = value;
      }
    });
    
    return details;
  }
  
  /**
   * Get account holder KYC information
   */
  static getAccountHolderInfo(account: import('../types/financial-account').FinancialAccount): Record<string, any> | null {
    if (!account.accountHolder) {
      return null;
    }
    
    const holder = account.accountHolder;
    const result: Record<string, any> = {
      id: holder.id,
      type: holder.type
    };
    
    // Extract the name from individual or business
    if (holder.type === 'individual' && holder.individual) {
      result.name = holder.individual.name.fullName;
      
      // Add person info details
      if (holder.individual.name.givenName) result.firstName = holder.individual.name.givenName;
      if (holder.individual.name.familyName) result.lastName = holder.individual.name.familyName;
      if (holder.individual.name.middleName) result.middleName = holder.individual.name.middleName;
      if (holder.individual.dateOfBirth) result.dateOfBirth = holder.individual.dateOfBirth;
      
      // Add contact details if available
      if (holder.individual.emailAddress) result.email = holder.individual.emailAddress;
      if (holder.individual.phoneNumber) result.phone = holder.individual.phoneNumber;
      
      // Add address if available
      if (holder.individual.addresses?.primary) {
        result.address = holder.individual.addresses.primary;
      }
      
      // Add identification documents if available
      if (holder.individual.identificationDocuments && holder.individual.identificationDocuments.length > 0) {
        result.identificationDocuments = holder.individual.identificationDocuments;
      }
    } else if (holder.type === 'business' && holder.business) {
      result.name = holder.business.legalName;
      
      // Add business entity details
      if (holder.business.tradingName) result.tradingName = holder.business.tradingName;
      if (holder.business.registrationNumber) result.registrationNumber = holder.business.registrationNumber;
      if (holder.business.taxId) result.taxId = holder.business.taxId;
      if (holder.business.entityType) result.entityType = holder.business.entityType;
      if (holder.business.formationCountry) result.formationCountry = holder.business.formationCountry;
      
      // Add address
      if (holder.business.address) {
        result.address = holder.business.address;
      }
      
      // Add contact details if available
      if (holder.business.emailAddress) result.email = holder.business.emailAddress;
      if (holder.business.phoneNumber) result.phone = holder.business.phoneNumber;
      
      // Add beneficial owners if available
      if (holder.business.ultimateBeneficialOwners && holder.business.ultimateBeneficialOwners.length > 0) {
        result.beneficialOwners = holder.business.ultimateBeneficialOwners;
      }
    }
    
    // Add KYC verification status
    result.kycStatus = holder.kyc.overallStatus;
    result.kycUpdatedAt = holder.kyc.updatedAt;
    
    if (holder.kyc.providers && holder.kyc.providers.length > 0) {
      result.kycProviders = holder.kyc.providers;
    }
    
    if (holder.kyc.riskLevel) {
      result.riskLevel = holder.kyc.riskLevel;
    }
    
    return result;
  }
  
  /**
   * Get connectivity information for an account
   */
  static getConnectivityInfo(account: import('../types/financial-account').FinancialAccount): {
    provider: string;
    status: string;
    lastSynced: string;
    syncStatusMessage: string;
  } {
    return {
      provider: account.connectivity.provider,
      status: account.connectivity.syncStatus,
      lastSynced: account.connectivity.lastSynced,
      syncStatusMessage: account.connectivity.syncStatus === 'connected' 
        ? 'Account is connected and syncing normally'
        : account.connectivity.syncStatus === 'disconnected'
        ? 'Account is disconnected. Reconnection required'
        : `Error: ${account.connectivity.error || 'Unknown error'}`
    };
  }
  
  /**
   * Update account holder KYC information
   */
  static async updateAccountHolderInfo(
    accountId: string, 
    holderInfo: Partial<import('../types/financial-account').AccountHolder>
  ): Promise<boolean> {
    // Here you would update the account holder info in your database
    // Return true if successful, false otherwise
    return true;
  }

  /**
   * Link a payment method to a financial account
   * This establishes the foreign key relationship in the database
   */
  static async linkPaymentMethodToAccount(
    accountId: string,
    paymentMethodId: number
  ): Promise<boolean> {
    try {
      // First, verify the payment method exists
      const method = await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.id, paymentMethodId)
      });

      if (!method) {
        console.error(`Payment method with ID ${paymentMethodId} not found`);
        return false;
      }

      // Then, update the financial account with the payment method ID
      const result = await db
        .update(financialAccounts)
        .set({ paymentMethodId })
        .where(eq(financialAccounts.accountId, accountId))
        .returning();

      // Also, update the account's paymentMethodTypes array if it doesn't already include this method
      const account = await db.query.financialAccounts.findFirst({
        where: eq(financialAccounts.accountId, accountId)
      });

      if (account) {
        const uniqueMethodId = generateUniquePaymentMethodId(method.methodType, method.currency);
        
        // Check if the account already has this payment method type
        if (!account.paymentMethodTypes || !account.paymentMethodTypes.includes(uniqueMethodId)) {
          const updatedMethodTypes = account.paymentMethodTypes ? 
            [...account.paymentMethodTypes, uniqueMethodId] : 
            [uniqueMethodId];
          
          await db
            .update(financialAccounts)
            .set({ paymentMethodTypes: updatedMethodTypes })
            .where(eq(financialAccounts.accountId, accountId));
        }
      }

      return result.length > 0;
    } catch (error) {
      console.error('Error linking payment method to account:', error);
      return false;
    }
  }

  /**
   * Unlink a payment method from a financial account
   */
  static async unlinkPaymentMethodFromAccount(
    accountId: string,
    paymentMethodId: number
  ): Promise<boolean> {
    try {
      // Get the payment method to find its unique ID
      const method = await db.query.paymentMethods.findFirst({
        where: eq(paymentMethods.id, paymentMethodId)
      });

      if (!method) {
        console.error(`Payment method with ID ${paymentMethodId} not found`);
        return false;
      }

      // Get the account to modify its payment method types
      const account = await db.query.financialAccounts.findFirst({
        where: eq(financialAccounts.accountId, accountId)
      });

      if (!account) {
        console.error(`Financial account with ID ${accountId} not found`);
        return false;
      }

      // Remove the payment method ID from the account
      await db
        .update(financialAccounts)
        .set({ paymentMethodId: null })
        .where(eq(financialAccounts.accountId, accountId));

      // Remove this method from the paymentMethodTypes array
      if (account.paymentMethodTypes && account.paymentMethodTypes.length > 0) {
        const uniqueMethodId = generateUniquePaymentMethodId(method.methodType, method.currency);
        const updatedMethodTypes = account.paymentMethodTypes.filter(
          methodType => methodType !== uniqueMethodId
        );

        await db
          .update(financialAccounts)
          .set({ paymentMethodTypes: updatedMethodTypes })
          .where(eq(financialAccounts.accountId, accountId));
      }

      return true;
    } catch (error) {
      console.error('Error unlinking payment method from account:', error);
      return false;
    }
  }

  /**
   * Get the payment method linked to a financial account
   */
  static async getLinkedPaymentMethod(accountId: string): Promise<number | null> {
    try {
      const account = await db.query.financialAccounts.findFirst({
        where: eq(financialAccounts.accountId, accountId)
      });

      return account?.paymentMethodId || null;
    } catch (error) {
      console.error('Error getting linked payment method:', error);
      return null;
    }
  }

  /**
   * Get financial accounts linked to a payment method
   */
  static async getAccountsByPaymentMethod(paymentMethodId: number): Promise<string[]> {
    try {
      const accounts = await db.query.financialAccounts.findMany({
        where: eq(financialAccounts.paymentMethodId, paymentMethodId)
      });

      return accounts.map(account => account.accountId);
    } catch (error) {
      console.error('Error getting accounts by payment method:', error);
      return [];
    }
  }

  /**
   * Add a payment method type to an account's supported methods
   * This updates the paymentMethodTypes array without changing the foreign key
   */
  static async addPaymentMethodType(
    accountId: string,
    methodType: string,
    currency: string
  ): Promise<boolean> {
    try {
      const account = await db.query.financialAccounts.findFirst({
        where: eq(financialAccounts.accountId, accountId)
      });

      if (!account) {
        console.error(`Financial account with ID ${accountId} not found`);
        return false;
      }

      const uniqueMethodId = generateUniquePaymentMethodId(methodType, currency);
      
      // Check if the account already has this payment method type
      if (!account.paymentMethodTypes || !account.paymentMethodTypes.includes(uniqueMethodId)) {
        const updatedMethodTypes = account.paymentMethodTypes ? 
          [...account.paymentMethodTypes, uniqueMethodId] : 
          [uniqueMethodId];
        
        await db
          .update(financialAccounts)
          .set({ paymentMethodTypes: updatedMethodTypes })
          .where(eq(financialAccounts.accountId, accountId));
      }

      return true;
    } catch (error) {
      console.error('Error adding payment method type:', error);
      return false;
    }
  }

  /**
   * Remove a payment method type from an account's supported methods
   */
  static async removePaymentMethodType(
    accountId: string,
    methodType: string,
    currency: string
  ): Promise<boolean> {
    try {
      const account = await db.query.financialAccounts.findFirst({
        where: eq(financialAccounts.accountId, accountId)
      });

      if (!account) {
        console.error(`Financial account with ID ${accountId} not found`);
        return false;
      }

      // Remove this method from the paymentMethodTypes array
      if (account.paymentMethodTypes && account.paymentMethodTypes.length > 0) {
        const uniqueMethodId = generateUniquePaymentMethodId(methodType, currency);
        const updatedMethodTypes = account.paymentMethodTypes.filter(
          methodType => methodType !== uniqueMethodId
        );

        await db
          .update(financialAccounts)
          .set({ paymentMethodTypes: updatedMethodTypes })
          .where(eq(financialAccounts.accountId, accountId));
      }

      return true;
    } catch (error) {
      console.error('Error removing payment method type:', error);
      return false;
    }
  }

  /**
   * Get detailed payment method information for a financial account
   * This will retrieve the linked payment method from the database
   */
  static async getPaymentMethodDetails(accountId: string): Promise<any | null> {
    try {
      console.log(`🔎 Getting payment method details for account: ${accountId}`);
      
      // First get the account to find its payment method ID
      const account = await db.query.financialAccounts.findFirst({
        where: eq(financialAccounts.accountId, accountId),
        with: {
          paymentMethod: true
        }
      });

      if (!account) {
        console.log(`❌ Account not found: ${accountId}`);
        return null;
      }
      
      // Get the account metadata which might contain manual payment details
      const metadata = account.metadata as any || {};
      const isManual = metadata?.isManual === true;
      const manualPaymentMethods = metadata?.manualPaymentMethods || [];
      
      console.log(`📝 Account metadata: isManual=${isManual}, has ${manualPaymentMethods.length} manual methods`);
      
      // Case 1: Account has a direct payment method link
      if (account.paymentMethodId && account.paymentMethod) {
        console.log(`✅ Account has linked payment method ID: ${account.paymentMethodId}`);
        
        // Get the standard payment method with fields from the database
        const paymentMethod = account.paymentMethod;
        
        // If this is also a manual account, find the matching manual details
        let userEnteredDetails = {};
        if (isManual && manualPaymentMethods.length > 0) {
          const matchingManualMethod = manualPaymentMethods.find((m: any) => 
            m.type === paymentMethod.methodType && 
            m.currency === paymentMethod.currency
          );
          
          if (matchingManualMethod) {
            userEnteredDetails = matchingManualMethod.details || {};
            console.log(`✅ Found matching manual details for payment method: ${paymentMethod.methodType}`);
          }
        }
        
        // Return combined payment method information
        return {
          ...paymentMethod,
          accountSpecificDetails: userEnteredDetails
        };
      }
      
      // Case 2: Manual account with payment methods in metadata
      if (isManual && manualPaymentMethods.length > 0) {
        console.log(`✅ Manual account with ${manualPaymentMethods.length} payment methods`);
        const primaryMethod = manualPaymentMethods[0];
        
        // Try to find the matching payment method definition in the database
        try {
          const paymentMethodResult = await db.select().from(paymentMethods)
            .where(
              and(
                eq(paymentMethods.methodType, primaryMethod.type),
                eq(paymentMethods.currency, account.currency)
              )
            )
            .limit(1);
          
          if (paymentMethodResult.length > 0) {
            console.log(`✅ Found matching payment method definition for type: ${primaryMethod.type}`);
            // Combine standard payment method definition with user-specific details
            return {
              ...paymentMethodResult[0],
              accountSpecificDetails: primaryMethod.details || {}
            };
          }
        } catch (error) {
          console.error('Error finding payment method definition:', error);
        }
        
        // If no matching payment method found in database, return manual data
        console.log(`ℹ️ Using only manual payment method data for: ${primaryMethod.type}`);
        return {
          methodType: primaryMethod.type,
          currency: primaryMethod.currency,
          name: primaryMethod.provider || primaryMethod.type,
          details: primaryMethod.details || {},
          instructions: primaryMethod.instructions,
          fields: [] // No field definitions available
        };
      }
      
      console.log(`❌ No payment method information found for account: ${accountId}`);
      return null;
    } catch (error) {
      console.error('Error getting payment method details:', error);
      return null;
    }
  }

  /**
   * Get all payment methods and their details
   * This returns all payment methods that can be linked to financial accounts
   */
  static async getAllPaymentMethods(): Promise<any[]> {
    try {
      const methods = await db.query.paymentMethods.findMany();
      return methods;
    } catch (error) {
      console.error('Error getting all payment methods:', error);
      return [];
    }
  }

  /**
   * Get payment methods by currency
   */
  static async getPaymentMethodsByCurrency(currency: string): Promise<any[]> {
    try {
      const methods = await db.query.paymentMethods.findMany({
        where: eq(paymentMethods.currency, currency)
      });
      return methods;
    } catch (error) {
      console.error(`Error getting payment methods for currency ${currency}:`, error);
      return [];
    }
  }

  /**
   * Find matching payment methods between a maker and taker
   * This helps in identifying compatible payment methods for a transaction
   */
  static findMatchingPaymentMethods(
    makerAccount: Partial<import('../types/financial-account').FinancialAccount> | any,
    takerAccount: Partial<import('../types/financial-account').FinancialAccount> | any
  ): string[] {
    // Get all payment method types from both accounts
    // This handles both full FinancialAccount objects and partial objects with just paymentMethodTypes
    const makerMethodTypes = makerAccount.paymentMethodTypes || [];
    const takerMethodTypes = takerAccount.paymentMethodTypes || [];
    
    // Find the intersection (common methods)
    return makerMethodTypes.filter((method: string) => takerMethodTypes.includes(method));
  }
}
