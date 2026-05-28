import { Request, Response } from 'express';
import { db } from '../db';
import { eq, asc, desc, like, inArray, and } from 'drizzle-orm';
import { financialAccounts } from '@shared/schema';
import { z } from 'zod';
import { sql } from 'drizzle-orm/sql';

/**
 * Get all financial accounts (for admin dashboard)
 */
export async function getAllFinancialAccounts(req: Request, res: Response) {
  try {
    // Optional filtering parameters
    const { currency, accountType, status, search } = req.query;
    
    // Build the where clause conditionally
    let whereClause = undefined;
    
    // Apply filters if provided
    if (currency && typeof currency === 'string') {
      whereClause = eq(financialAccounts.currency, currency);
    }
    
    if (accountType && typeof accountType === 'string') {
      const typeCondition = eq(financialAccounts.accountType, accountType);
      whereClause = whereClause ? and(whereClause, typeCondition) : typeCondition;
    }
    
    if (status && typeof status === 'string') {
      const statusCondition = eq(financialAccounts.status, status);
      whereClause = whereClause ? and(whereClause, statusCondition) : statusCondition;
    }
    
    // Execute the query with filters
    const accounts = await db.select().from(financialAccounts)
      .where(whereClause)
      .orderBy(desc(financialAccounts.createdAt));
    
    // If search is provided, filter results in memory (since JSONB fields are involved)
    let filteredAccounts = accounts;
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredAccounts = accounts.filter(account => {
        // Search in account name
        if (account.accountName.toLowerCase().includes(searchLower)) return true;
        
        // Search in institution name
        if (typeof account.institution === 'object' && account.institution !== null) {
          const institution = account.institution as any;
          if (institution.name && institution.name.toLowerCase().includes(searchLower)) return true;
        }
        
        // Search in account ID
        if (account.accountId.toLowerCase().includes(searchLower)) return true;
        
        return false;
      });
    }
    
    // Format the output
    const formattedAccounts = filteredAccounts.map(account => {
      // Format payment capabilities for better display
      const paymentCapabilities = formatPaymentCapabilities(account.paymentCapabilities);
      
      return {
        ...account,
        paymentCapabilities
      };
    });
    
    res.json(formattedAccounts);
  } catch (error) {
    console.error("Error fetching financial accounts:", error);
    res.status(500).json({ message: "Failed to fetch financial accounts" });
  }
}

/**
 * Get a financial account by ID
 */
export async function getFinancialAccountById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Find the account by ID
    const account = await db.query.financialAccounts.findFirst({
      where: eq(financialAccounts.id, parseInt(id))
    });
    
    if (!account) {
      return res.status(404).json({ message: "Financial account not found" });
    }
    
    // Format payment capabilities for better display
    const paymentCapabilities = formatPaymentCapabilities(account.paymentCapabilities);
    
    res.json({
      ...account,
      paymentCapabilities
    });
  } catch (error) {
    console.error("Error fetching financial account:", error);
    res.status(500).json({ message: "Failed to fetch financial account" });
  }
}

/**
 * Update a financial account's status
 */
export async function updateFinancialAccountStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate the status
    if (!['active', 'inactive', 'pending', 'frozen'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of: active, inactive, pending, frozen" });
    }
    
    // Update the account status
    const updatedAccount = await db.update(financialAccounts)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(financialAccounts.id, parseInt(id)))
      .returning();
    
    if (!updatedAccount.length) {
      return res.status(404).json({ message: "Financial account not found" });
    }
    
    res.json(updatedAccount[0]);
  } catch (error) {
    console.error("Error updating financial account status:", error);
    res.status(500).json({ message: "Failed to update financial account status" });
  }
}

/**
 * Update a financial account's payment capabilities
 */
export async function updateFinancialAccountPaymentCapabilities(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const paymentCapabilities = req.body;
    
    // Update the account payment capabilities
    const updatedAccount = await db.update(financialAccounts)
      .set({ 
        paymentCapabilities,
        updatedAt: new Date()
      })
      .where(eq(financialAccounts.id, parseInt(id)))
      .returning();
    
    if (!updatedAccount.length) {
      return res.status(404).json({ message: "Financial account not found" });
    }
    
    res.json(updatedAccount[0]);
  } catch (error) {
    console.error("Error updating financial account payment capabilities:", error);
    res.status(500).json({ message: "Failed to update financial account payment capabilities" });
  }
}

/**
 * Delete a financial account (admin only)
 */
export async function deleteFinancialAccount(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Delete the account
    await db.delete(financialAccounts)
      .where(eq(financialAccounts.id, parseInt(id)));
    
    res.json({ message: "Financial account deleted successfully" });
  } catch (error) {
    console.error("Error deleting financial account:", error);
    res.status(500).json({ message: "Failed to delete financial account" });
  }
}

/**
 * Get available currency and payment method combinations
 */
export async function getAvailableCurrencyPaymentMethods(req: Request, res: Response) {
  try {
    // Get all financial accounts
    const accounts = await db.select().from(financialAccounts);
    
    // Extract unique combinations
    const combinations = new Map();
    
    accounts.forEach(account => {
      const currency = account.currency;
      
      // Extract payment methods from capabilities
      if (typeof account.paymentCapabilities === 'object' && account.paymentCapabilities !== null) {
        const paymentCapabilities = account.paymentCapabilities as any;
        
        // Process each payment capability
        Object.entries(paymentCapabilities).forEach(([method, details]) => {
          if (details && typeof details === 'object' && (details as any).enabled) {
            const key = `${currency}-${method}`;
            if (!combinations.has(key)) {
              combinations.set(key, {
                currency,
                paymentMethod: method,
                count: 1,
                institution: account.institution
              });
            } else {
              const existing = combinations.get(key);
              existing.count += 1;
            }
          }
        });
      }
    });
    
    res.json(Array.from(combinations.values()));
  } catch (error) {
    console.error("Error fetching currency payment methods:", error);
    res.status(500).json({ message: "Failed to fetch currency payment methods" });
  }
}

/**
 * Format payment capabilities for easier display
 */
function formatPaymentCapabilities(capabilities: any): any {
  if (!capabilities || typeof capabilities !== 'object') {
    return {};
  }
  
  const formatted: any = {};
  
  // Process each capability
  Object.entries(capabilities).forEach(([method, details]) => {
    if (details && typeof details === 'object' && (details as any).enabled) {
      formatted[method] = {
        enabled: true,
        ...details
      };
      
      // Clean up properties for display
      if (formatted[method].enabled === false) {
        delete formatted[method];
      }
    }
  });
  
  return formatted;
}

/**
 * Get statistics about financial accounts
 */
export async function getFinancialAccountStats(req: Request, res: Response) {
  try {
    // Get all financial accounts
    const accounts = await db.select().from(financialAccounts);
    
    // Calculate statistics
    const stats = {
      totalAccounts: accounts.length,
      byCurrency: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byAccountType: {} as Record<string, number>,
      byPaymentMethod: {} as Record<string, number>,
      byInstitution: {} as Record<string, number>
    };
    
    // Process each account
    accounts.forEach(account => {
      // Count by currency
      if (!stats.byCurrency[account.currency]) {
        stats.byCurrency[account.currency] = 1;
      } else {
        stats.byCurrency[account.currency]++;
      }
      
      // Count by status
      if (!stats.byStatus[account.status]) {
        stats.byStatus[account.status] = 1;
      } else {
        stats.byStatus[account.status]++;
      }
      
      // Count by account type
      if (!stats.byAccountType[account.accountType]) {
        stats.byAccountType[account.accountType] = 1;
      } else {
        stats.byAccountType[account.accountType]++;
      }
      
      // Count by institution
      if (typeof account.institution === 'object' && account.institution !== null) {
        const institution = account.institution as any;
        const institutionName = institution.name || 'Unknown';
        
        if (!stats.byInstitution[institutionName]) {
          stats.byInstitution[institutionName] = 1;
        } else {
          stats.byInstitution[institutionName]++;
        }
      }
      
      // Count by payment method
      if (typeof account.paymentCapabilities === 'object' && account.paymentCapabilities !== null) {
        const paymentCapabilities = account.paymentCapabilities as any;
        
        // Process each payment capability
        Object.entries(paymentCapabilities).forEach(([method, details]) => {
          if (details && typeof details === 'object' && (details as any).enabled) {
            if (!stats.byPaymentMethod[method]) {
              stats.byPaymentMethod[method] = 1;
            } else {
              stats.byPaymentMethod[method]++;
            }
          }
        });
      }
    });
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching financial account stats:", error);
    res.status(500).json({ message: "Failed to fetch financial account stats" });
  }
}