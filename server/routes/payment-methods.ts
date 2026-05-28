import { Request, Response } from 'express';
import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../db';
import { paymentMethods, insertPaymentMethodSchema, type InsertPaymentMethod, type PaymentMethod } from '../../shared/schema';
import { z } from 'zod';

/**
 * Create a payment method in the database
 */
export async function createPaymentMethod(req: Request, res: Response) {
  try {
    const paymentMethodData = req.body;
    
    console.log(`🌟 Creating new payment method ${paymentMethodData.methodType} for currency ${paymentMethodData.currency}`);
    
    // Validate request body
    const validationResult = insertPaymentMethodSchema.safeParse(paymentMethodData);
    if (!validationResult.success) {
      console.log(`Invalid payment method data: ${JSON.stringify(validationResult.error)}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment method data', 
        errors: validationResult.error 
      });
    }
    
    // Check if a payment method with the same method type and currency already exists
    const existingMethod = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.methodType, paymentMethodData.methodType),
        eq(paymentMethods.currency, paymentMethodData.currency)
      )
    });
    
    if (existingMethod) {
      console.log(`Payment method with type ${paymentMethodData.methodType} already exists for currency ${paymentMethodData.currency}`);
      return res.status(409).json({ 
        success: false, 
        message: 'Payment method already exists' 
      });
    }
    
    // Create the payment method
    // Ensure we have all required fields
    const paymentMethodToInsert: InsertPaymentMethod = {
      methodType: paymentMethodData.methodType,
      currency: paymentMethodData.currency,
      name: paymentMethodData.name,
      enabled: paymentMethodData.enabled ?? true,
      fields: paymentMethodData.fields || {}, // fields is required
      description: paymentMethodData.description,
      accountType: paymentMethodData.accountType,
      supportsCountries: paymentMethodData.supportsCountries
    };
    
    const [newPaymentMethod] = await db.insert(paymentMethods)
      .values([paymentMethodToInsert])
      .returning();
    
    console.log(`✅ Successfully created payment method with ID ${newPaymentMethod.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Payment method created successfully',
      paymentMethod: newPaymentMethod
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment method',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get all payment methods
 */
export async function getAllPaymentMethods(req: Request, res: Response) {
  try {
    const { currency, enabled } = req.query;
    
    let filters = [];
    
    // Add currency filter if specified
    if (currency) {
      filters.push(eq(paymentMethods.currency, currency as string));
    }
    
    // Add enabled filter if specified
    if (enabled !== undefined) {
      filters.push(eq(paymentMethods.enabled, enabled === 'true'));
    }
    
    // Apply filters and get payment methods
    const allPaymentMethods = filters.length > 0
      ? await db.query.paymentMethods.findMany({
          where: and(...filters),
          orderBy: [asc(paymentMethods.currency), asc(paymentMethods.methodType)]
        })
      : await db.query.paymentMethods.findMany({
          orderBy: [asc(paymentMethods.currency), asc(paymentMethods.methodType)]
        });
    
    console.log(`✅ Found ${allPaymentMethods.length} payment methods`);
    
    res.json({
      success: true,
      count: allPaymentMethods.length,
      paymentMethods: allPaymentMethods
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get payment methods',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get payment methods filtered by currency
 */
export async function getPaymentMethodsByCurrency(req: Request, res: Response) {
  try {
    const { currency } = req.params;
    const { enabled } = req.query;
    
    let filters = [eq(paymentMethods.currency, currency)];
    
    // Add enabled filter if specified
    if (enabled !== undefined) {
      filters.push(eq(paymentMethods.enabled, enabled === 'true'));
    }
    
    const paymentMethodsForCurrency = await db.query.paymentMethods.findMany({
      where: and(...filters),
      orderBy: [asc(paymentMethods.methodType)]
    });
    
    console.log(`✅ Found ${paymentMethodsForCurrency.length} payment methods for currency ${currency}`);
    
    res.json({
      success: true,
      count: paymentMethodsForCurrency.length,
      paymentMethods: paymentMethodsForCurrency
    });
  } catch (error) {
    console.error(`Error getting payment methods for currency ${req.params.currency}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to get payment methods for currency ${req.params.currency}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get a payment method by ID
 */
export async function getPaymentMethodById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, parseInt(id))
    });
    
    if (!paymentMethod) {
      console.log(`Payment method with ID ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }
    
    console.log(`✅ Found payment method with ID ${id}`);
    
    res.json({
      success: true,
      paymentMethod
    });
  } catch (error) {
    console.error(`Error getting payment method with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to get payment method with ID ${req.params.id}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get a payment method by method type and currency
 */
export async function getPaymentMethodByTypeAndCurrency(req: Request, res: Response) {
  try {
    const { methodType, currency } = req.params;
    
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.methodType, methodType),
        eq(paymentMethods.currency, currency)
      )
    });
    
    if (!paymentMethod) {
      console.log(`Payment method with type ${methodType} and currency ${currency} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }
    
    console.log(`✅ Found payment method with type ${methodType} and currency ${currency}`);
    
    res.json({
      success: true,
      paymentMethod
    });
  } catch (error) {
    console.error(`Error getting payment method with type ${req.params.methodType} and currency ${req.params.currency}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to get payment method with type ${req.params.methodType} and currency ${req.params.currency}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update a payment method
 */
export async function updatePaymentMethod(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validate request body
    const validationResult = z.object({
      methodType: z.string().optional(),
      currency: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      enabled: z.boolean().optional(),
      accountType: z.string().optional(),
      fields: z.any().optional(),
      supportsCountries: z.array(z.string()).optional()
    }).safeParse(updateData);
    
    if (!validationResult.success) {
      console.log(`Invalid update data: ${JSON.stringify(validationResult.error)}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid update data', 
        errors: validationResult.error 
      });
    }
    
    // Check if payment method exists
    const existingMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, parseInt(id))
    });
    
    if (!existingMethod) {
      console.log(`Payment method with ID ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }
    
    // Check for unique constraint (methodType + currency) if updating those fields
    if ((updateData.methodType && updateData.methodType !== existingMethod.methodType) || 
        (updateData.currency && updateData.currency !== existingMethod.currency)) {
      
      const conflictingMethod = await db.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.methodType, updateData.methodType || existingMethod.methodType),
          eq(paymentMethods.currency, updateData.currency || existingMethod.currency),
          // Exclude the current payment method
          // @ts-ignore
          eq(paymentMethods.id, parseInt(id))
        )
      });
      
      if (conflictingMethod) {
        console.log(`Payment method with type ${updateData.methodType || existingMethod.methodType} and currency ${updateData.currency || existingMethod.currency} already exists`);
        return res.status(409).json({ 
          success: false, 
          message: 'Payment method with this method type and currency already exists' 
        });
      }
    }
    
    // Update the payment method
    const [updatedPaymentMethod] = await db.update(paymentMethods)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(paymentMethods.id, parseInt(id)))
      .returning();
    
    console.log(`✅ Successfully updated payment method with ID ${id}`);
    
    res.json({
      success: true,
      message: 'Payment method updated successfully',
      paymentMethod: updatedPaymentMethod
    });
  } catch (error) {
    console.error(`Error updating payment method with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to update payment method with ID ${req.params.id}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if payment method exists
    const existingMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, parseInt(id))
    });
    
    if (!existingMethod) {
      console.log(`Payment method with ID ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }
    
    // Delete the payment method
    const deletedPaymentMethod = await db.delete(paymentMethods)
      .where(eq(paymentMethods.id, parseInt(id)))
      .returning();
    
    console.log(`✅ Successfully deleted payment method with ID ${id}`);
    
    res.json({
      success: true,
      message: 'Payment method deleted successfully',
      paymentMethod: deletedPaymentMethod[0]
    });
  } catch (error) {
    console.error(`Error deleting payment method with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to delete payment method with ID ${req.params.id}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Toggle payment method enabled status
 */
export async function togglePaymentMethod(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    // Validate request body
    if (typeof enabled !== 'boolean') {
      console.log(`Invalid request body: ${JSON.stringify(req.body)}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request body. Expected { enabled: boolean }' 
      });
    }
    
    // Check if payment method exists
    const existingMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, parseInt(id))
    });
    
    if (!existingMethod) {
      console.log(`Payment method with ID ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Payment method not found' 
      });
    }
    
    // Update the enabled status
    const [updatedPaymentMethod] = await db.update(paymentMethods)
      .set({
        enabled,
        updatedAt: new Date()
      })
      .where(eq(paymentMethods.id, parseInt(id)))
      .returning();
    
    console.log(`✅ Successfully toggled payment method with ID ${id} to ${enabled ? 'enabled' : 'disabled'}`);
    
    res.json({
      success: true,
      message: `Payment method ${enabled ? 'enabled' : 'disabled'} successfully`,
      paymentMethod: updatedPaymentMethod
    });
  } catch (error) {
    console.error(`Error toggling payment method with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to toggle payment method with ID ${req.params.id}`,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Generate a unique payment method ID by combining method type and currency
 */
export function generateUniqueMethodId(methodType: string, currency: string): string {
  return `${methodType}_${currency}`;
}

/**
 * Parse a unique method ID into its components
 */
export function parseUniqueMethodId(uniqueId: string): { methodType: string; currency: string } | null {
  const parts = uniqueId.split('_');
  if (parts.length < 2) {
    return null;
  }
  
  // The currency is usually the last part
  const currency = parts[parts.length - 1];
  // The method type is everything before the currency
  const methodType = parts.slice(0, parts.length - 1).join('_');
  
  return { methodType, currency };
}

/**
 * Migrate existing file-based payment methods to the database
 */
export async function migrateFileBasedPaymentMethods(req: Request, res: Response) {
  try {
    // Import file system modules
    const fs = await import('fs');
    const path = await import('path');
    const { getPaymentMethodsFromStorage } = await import('../routes/admin-payment-methods');
    
    // Import the countries data from the shared module
    const { countries } = await import('../../client/src/lib/countries');
    
    // Extract unique currencies from the countries list
    const uniqueCurrencies = Array.from(new Set(countries.map(country => country.currency)));
    
    let totalMigrated = 0;
    let skipped = 0;
    const results: any[] = [];
    
    // Process each currency
    for (const currency of uniqueCurrencies) {
      try {
        // Get payment methods from file storage
        const paymentMethodConfigs = await getPaymentMethodsFromStorage(currency);
        
        // Process each payment method
        for (const config of paymentMethodConfigs) {
          try {
            // Check if payment method already exists in database
            const existingMethod = await db.query.paymentMethods.findFirst({
              where: and(
                eq(paymentMethods.methodType, config.methodType),
                eq(paymentMethods.currency, currency)
              )
            });
            
            if (existingMethod) {
              console.log(`Skipping payment method ${config.methodType}_${currency} as it already exists in database`);
              skipped++;
              continue;
            }
            
            // Insert payment method into database
            const [newPaymentMethod] = await db.insert(paymentMethods)
              .values([{
                methodType: config.methodType,
                currency: config.currency,
                name: config.name,
                description: config.description || '',
                enabled: config.enabled,
                accountType: config.accountType,
                fields: config.fields,
                supportsCountries: config.supportsCountries || []
              }])
              .returning();
            
            console.log(`Migrated payment method ${config.methodType}_${currency} to database with ID ${newPaymentMethod.id}`);
            totalMigrated++;
            
            results.push({
              id: newPaymentMethod.id,
              methodType: config.methodType,
              currency: config.currency,
              status: 'migrated'
            });
          } catch (methodError) {
            console.error(`Error migrating payment method ${config.methodType}_${currency}:`, methodError);
            results.push({
              methodType: config.methodType,
              currency: config.currency,
              status: 'error',
              error: methodError instanceof Error ? methodError.message : String(methodError)
            });
          }
        }
      } catch (currencyError) {
        console.error(`Error processing currency ${currency}:`, currencyError);
        results.push({
          currency,
          status: 'error',
          error: currencyError instanceof Error ? currencyError.message : String(currencyError)
        });
      }
    }
    
    console.log(`✅ Migration complete. Migrated ${totalMigrated} payment methods, skipped ${skipped} existing methods`);
    
    res.json({
      success: true,
      message: `Migration complete. Migrated ${totalMigrated} payment methods, skipped ${skipped} existing methods`,
      totalMigrated,
      skipped,
      results
    });
  } catch (error) {
    console.error('Error migrating payment methods:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to migrate payment methods',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}