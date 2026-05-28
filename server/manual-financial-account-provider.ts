import { z } from 'zod';
import { db } from './db';
import { 
  ManualPaymentMethod, 
  manualFinancialAccountSchema, 
  generateUniquePaymentMethodId 
} from '../shared/types/manual-financial-account';
import { financialAccounts, FinancialAccountDB, insertFinancialAccountSchema, paymentMethods } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { FinancialAccount, FinancialInstitution, PaymentCapabilities } from '../shared/types/financial-account';

/**
 * Provider for manual financial account operations
 */
export class ManualFinancialAccountProvider {
  /**
   * Create a new manual financial account
   */
  async createAccount(accountData: z.infer<typeof manualFinancialAccountSchema>): Promise<FinancialAccount> {
    try {
      console.log('🔷 CREATE ACCOUNT: Starting account creation with data:', JSON.stringify(accountData));
      
      // Generate a unique ID for the account
      const accountId = `acc_manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      console.log('🆔 CREATE ACCOUNT: Generated account ID:', accountId);

      // Create the institution object using the data from the schema
      const institution: FinancialInstitution = {
        id: `inst_${accountData.institution.name.toLowerCase().replace(/\s/g, '_')}`,
        name: accountData.institution.name,
        type: accountData.institution.type,
        country: accountData.institution.country
      };
      console.log('🏦 CREATE ACCOUNT: Created institution object:', JSON.stringify(institution));
      
      // Create the balances object
      const balances = {
        available: null,
        current: null,
        limit: null,
        iso_currency_code: accountData.currency
      };
      
      // Create the connectivity object
      const connectivity = {
        provider: 'manual',
        providerId: accountId,
        lastSynced: new Date().toISOString(),
        syncStatus: 'connected' as 'connected' | 'disconnected' | 'error',
        error: undefined
      };
      
      // Create the payment capabilities object
      const paymentCapabilities: PaymentCapabilities = {
        // Default empty payment capabilities
        ach: { enabled: false },
        wire: { enabled: false },
        zelle: { enabled: false },
        sepa: { enabled: false },
        upi: { enabled: false },
        interac: { enabled: false },
        pix: { enabled: false }
      };
      
      // Try to get the payment method ID from the database
      let paymentMethodId = null;
      if (accountData.paymentMethods.length > 0) {
        const primaryMethod = accountData.paymentMethods[0];
        try {
          // Find payment method by type and currency
          const paymentMethodResult = await db.select()
            .from(paymentMethods)
            .where(
              and(
                eq(paymentMethods.methodType, primaryMethod.type),
                eq(paymentMethods.currency, accountData.currency)
              )
            )
            .limit(1)
            .execute();
          
          if (paymentMethodResult.length > 0) {
            paymentMethodId = paymentMethodResult[0].id;
            console.log(`✅ CREATE ACCOUNT: Found payment method ID ${paymentMethodId} for ${primaryMethod.type}_${accountData.currency}`);
          }
        } catch (error) {
          console.error('⚠️ CREATE ACCOUNT: Error finding payment method ID:', error);
          // Continue without a payment method ID
        }
      }
      
      // Create metadata with manual payment methods and flags
      const metadata = {
        walletAddress: accountData.walletAddress,
        verified: false,
        isManual: true,
        manualPaymentMethods: accountData.paymentMethods // Store manual methods in metadata
      };
      console.log('📝 CREATE ACCOUNT: Created metadata:', JSON.stringify(metadata));
      
      // Generate unique payment method IDs by combining method type with currency
      const paymentMethodTypes = accountData.paymentMethods.map(method => 
        generateUniquePaymentMethodId(method.type, accountData.currency)
      );
      console.log('🔑 CREATE ACCOUNT: Generated unique payment method IDs:', paymentMethodTypes);
      
      // Prepare the data for insertion using the schema
      const accountRecord = {
        accountId,
        accountName: accountData.accountName,
        accountType: accountData.accountType,
        accountSubtype: undefined,
        currency: accountData.currency,
        mask: undefined,
        balances,
        status: 'active' as 'active' | 'inactive' | 'pending' | 'frozen',
        institution,
        regionalDetails: {},
        accountHolder: null,
        paymentCapabilities,
        connectivity,
        paymentMethodTypes,
        paymentMethodId, // Set the payment method ID if found
        metadata
      };
      console.log('📋 CREATE ACCOUNT: Prepared account record:', JSON.stringify(accountRecord));
      
      try {
        // Validate using insertFinancialAccountSchema
        console.log('🔍 CREATE ACCOUNT: Validating against schema...');
        const validatedAccount = insertFinancialAccountSchema.parse(accountRecord);
        console.log('✅ CREATE ACCOUNT: Schema validation successful');
        
        // Store in financial_accounts table
        console.log('💾 CREATE ACCOUNT: Inserting into database...');
        await db.insert(financialAccounts).values(validatedAccount);
        console.log('✅ CREATE ACCOUNT: Database insertion successful');
      } catch (error) {
        console.error('❌ CREATE ACCOUNT: Error during validation or database insertion:', error);
        if (error instanceof z.ZodError) {
          console.error('❌ CREATE ACCOUNT: Zod validation errors:', JSON.stringify(error.errors));
        }
        throw error;
      }
      
      // Return a unified FinancialAccount object
      const resultAccount: FinancialAccount = {
        id: accountId,
        accountName: accountData.accountName,
        accountType: accountData.accountType,
        accountSubtype: undefined,
        currency: accountData.currency,
        mask: undefined,
        balances: {
          available: null,
          current: null,
          limit: null,
          iso_currency_code: accountData.currency
        },
        status: 'active',
        institution,
        regionalDetails: {},
        paymentCapabilities: {
          // Add empty payment capabilities as needed to match the type
          ach: { enabled: false },
          wire: { enabled: false },
          zelle: { enabled: false },
          sepa: { enabled: false },
          upi: { enabled: false },
          interac: { enabled: false },
          pix: { enabled: false }
        },
        paymentMethodTypes,
        paymentMethodId, // Include the payment method ID in the response
        connectivity,
        metadata
      } as FinancialAccount;
      
      console.log('🎉 CREATE ACCOUNT: Successfully created account:', JSON.stringify(resultAccount));
      return resultAccount;
    } catch (error) {
      console.error('❌ CREATE ACCOUNT: Critical error during account creation:', error);
      throw error;
    }
  }
  
  /**
   * Get all accounts for a wallet address
   */
  async getAccountsByWallet(walletAddress: string): Promise<FinancialAccount[]> {
    // Query financial_accounts table for manual accounts 
    const dbAccounts = await db.select().from(financialAccounts).execute();
    
    // Filter accounts by provider type and wallet address
    const filteredAccounts = dbAccounts.filter(account => {
      const connectivity = account.connectivity as any;
      const metadata = account.metadata as any;
      return connectivity && connectivity.provider === 'manual' && 
             metadata && metadata.walletAddress === walletAddress;
    });
    
    // Map DB records to FinancialAccount objects and ensure proper typing
    return filteredAccounts.map(dbAccount => {
      // Explicit type casting to handle null values and ensure proper FinancialAccount typing
      // Type-cast the jsonb fields to the appropriate types
      const balances = dbAccount.balances as any;
      const institution = dbAccount.institution as FinancialInstitution;
      const metadata = dbAccount.metadata as any;
      const paymentCapabilities = dbAccount.paymentCapabilities as any;
      const regionalDetails = dbAccount.regionalDetails as any || {};
      const connectivity = dbAccount.connectivity as any;
      
      // Return the unified financial account
      return {
        id: dbAccount.accountId,
        accountName: dbAccount.accountName,
        accountType: dbAccount.accountType,
        accountSubtype: dbAccount.accountSubtype || undefined,
        currency: dbAccount.currency,
        mask: dbAccount.mask || undefined,
        balances: {
          available: balances.available,
          current: balances.current,
          limit: balances.limit,
          iso_currency_code: dbAccount.currency
        },
        status: dbAccount.status as 'active' | 'inactive' | 'pending' | 'frozen',
        institution,
        regionalDetails,
        paymentCapabilities,
        paymentMethodTypes: dbAccount.paymentMethodTypes,
        connectivity,
        metadata
      } as FinancialAccount;
    }) as FinancialAccount[];
  }
  
  /**
   * Get account by ID
   */
  async getAccountById(accountId: string): Promise<FinancialAccount | null> {
    const dbAccount = await db.select().from(financialAccounts)
      .where(eq(financialAccounts.accountId, accountId))
      .limit(1);
    
    if (dbAccount.length === 0) {
      return null;
    }
    
    const account = dbAccount[0];
    
    // Type-cast jsonb fields to appropriate types
    const connectivity = account.connectivity as any;
    const paymentCapabilities = account.paymentCapabilities as any;
    const balances = account.balances as any;
    const metadata = account.metadata as any;
    const institution = account.institution as FinancialInstitution;
    const regionalDetails = account.regionalDetails as any || {};
    
    // Check if this is a manual account
    if (!connectivity || connectivity.provider !== 'manual') {
      return null;
    }
    
    // Return a unified financial account object
    return {
      id: account.accountId,
      accountName: account.accountName,
      accountType: account.accountType,
      accountSubtype: account.accountSubtype || undefined,
      currency: account.currency,
      mask: account.mask || undefined,
      balances: {
        available: balances ? balances.available : null,
        current: balances ? balances.current : null,
        limit: balances ? balances.limit : null,
        iso_currency_code: account.currency
      },
      status: account.status as 'active' | 'inactive' | 'pending' | 'frozen',
      institution,
      regionalDetails,
      paymentCapabilities,
      paymentMethodTypes: account.paymentMethodTypes,
      connectivity,
      metadata
    } as FinancialAccount;
  }
  
  /**
   * Update an account's payment methods
   */
  async updatePaymentMethods(accountId: string, paymentMethods: ManualPaymentMethod[]): Promise<boolean> {
    try {
      console.log('🔄 UPDATE PAYMENT METHODS: Starting update for account:', accountId);
      
      // Get the current account
      const accountResult = await db.select().from(financialAccounts)
        .where(eq(financialAccounts.accountId, accountId))
        .limit(1);
      
      if (accountResult.length === 0) {
        console.log('❌ UPDATE PAYMENT METHODS: Account not found:', accountId);
        return false;
      }
      
      // Type-cast the jsonb fields
      const account = accountResult[0];
      const currentPaymentCapabilities = account.paymentCapabilities as PaymentCapabilities || {};
      const currentMetadata = account.metadata as Record<string, any> || {};
      
      // Update the metadata to store manual payment methods
      const updatedMetadata = {
        ...currentMetadata,
        manualPaymentMethods: paymentMethods,
        updatedAt: new Date().toISOString()
      };
      
      // Generate unique payment method IDs by combining method type with currency
      const paymentMethodTypes = paymentMethods.map(method => 
        generateUniquePaymentMethodId(method.type, account.currency)
      );
      console.log('🔑 UPDATE PAYMENT METHODS: Generated unique payment method IDs:', paymentMethodTypes);
      
      // Update the account
      await db.update(financialAccounts)
        .set({
          metadata: updatedMetadata,
          paymentMethodTypes,
          updatedAt: new Date()
        })
        .where(eq(financialAccounts.accountId, accountId));
      
      console.log('✅ UPDATE PAYMENT METHODS: Successfully updated payment methods');
      return true;
    } catch (error) {
      console.error('❌ UPDATE PAYMENT METHODS: Error updating payment methods:', error);
      return false;
    }
  }
  
  /**
   * Delete a financial account
   */
  async deleteAccount(accountId: string): Promise<boolean> {
    try {
      await db.delete(financialAccounts)
        .where(eq(financialAccounts.accountId, accountId));
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }
}

// Singleton instance
export const manualFinancialAccountProvider = new ManualFinancialAccountProvider();