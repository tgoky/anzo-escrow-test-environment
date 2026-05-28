import { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Type for payment method config
export interface PaymentMethodConfig {
  currency: string;
  methodType: string;         // Base method type (e.g., 'zelle', 'bank_transfer')
  uniqueMethodId?: string;    // Unique method ID with currency (e.g., 'zelle_USD', 'bank_transfer_EUR')
  name: string;
  description: string;
  enabled: boolean;
  accountType?: string; // 'bank_account', 'e-wallet', 'mobile_money', 'crypto_wallet', 'cash'
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    description?: string;
    validation?: string;   // Field validation pattern (regex)
    copyable?: boolean;    // Whether to show a copy button
    position?: number;     // Field order position
  }>;
  supportsCountries: string[];
}

// Generate a unique payment method ID by combining method type and currency
export function generateUniqueMethodId(methodType: string, currency: string): string {
  return `${methodType}_${currency}`;
}

// Parse a unique method ID into its components
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

// Storage path for payment methods
const STORAGE_DIR = path.join(process.cwd(), 'data');
const PAYMENT_METHODS_FILE = (currency: string) => path.join(STORAGE_DIR, `payment-methods-${currency.toLowerCase()}.json`);

// Create directory if it doesn't exist
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Function to get payment methods from the storage
export async function getPaymentMethodsFromStorage(currency: string): Promise<PaymentMethodConfig[]> {
  const filePath = PAYMENT_METHODS_FILE(currency);
  
  // If file doesn't exist, initialize with defaults
  if (!fs.existsSync(filePath)) {
    const defaultMethods = await getDefaultPaymentMethods(currency);
    await savePaymentMethodsToStorage(currency, defaultMethods);
    return defaultMethods;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading payment methods for ${currency}:`, error);
    return [];
  }
}

// Function to save payment methods to the storage
export async function savePaymentMethodsToStorage(currency: string, methods: PaymentMethodConfig[]): Promise<void> {
  const filePath = PAYMENT_METHODS_FILE(currency);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(methods, null, 2), 'utf8');
    console.log(`Successfully saved payment methods for ${currency}`);
  } catch (error) {
    console.error(`Error saving payment methods for ${currency}:`, error);
    throw error;
  }
}

// Function to get default payment methods for a currency
async function getDefaultPaymentMethods(currency: string): Promise<PaymentMethodConfig[]> {
  // Instead of using getPaymentMethodsByCountryAndCurrency, return hardcoded defaults
  // to avoid circular dependencies
  if (currency === 'USD') {
    return [
      {
        currency: 'USD',
        methodType: 'zelle',
        name: 'Zelle',
        description: 'Fast bank-to-bank transfers in the US',
        enabled: true,
        accountType: 'bank_account',
        fields: [
          { 
            name: 'email', 
            label: 'Zelle Email', 
            type: 'email', 
            required: true,
            copyable: true,
            position: 0
          },
          { 
            name: 'name', 
            label: 'Full Name', 
            type: 'text', 
            required: true,
            position: 1
          }
        ],
        supportsCountries: ['US']
      },
      {
        currency: 'USD',
        methodType: 'cash_deposit',
        name: 'Cash Deposit',
        description: 'In-person cash deposit at bank branch',
        enabled: true,
        accountType: 'cash',
        fields: [
          { 
            name: 'accountName', 
            label: 'Account Name', 
            type: 'text', 
            required: true,
            position: 0
          },
          { 
            name: 'accountNumber', 
            label: 'Account Number', 
            type: 'text', 
            required: true,
            validation: '^[0-9]{8,17}$',
            copyable: true,
            position: 1
          },
          { 
            name: 'bankName', 
            label: 'Bank Name', 
            type: 'text', 
            required: true,
            position: 2
          },
          { 
            name: 'depositInstructions', 
            label: 'Deposit Instructions', 
            type: 'textarea', 
            required: false,
            position: 3
          }
        ],
        supportsCountries: ['US']
      }
    ];
  }
  
  // Default for other currencies
  return [
    {
      currency,
      methodType: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Regular bank transfer',
      enabled: true,
      accountType: 'bank_account',
      fields: [
        { 
          name: 'accountName', 
          label: 'Account Holder Name', 
          type: 'text', 
          required: true,
          position: 0
        },
        { 
          name: 'accountNumber', 
          label: 'Account Number', 
          type: 'text', 
          required: true,
          copyable: true,
          validation: '^[0-9]{8,17}$',
          position: 1
        },
        { 
          name: 'bankName', 
          label: 'Bank Name', 
          type: 'text', 
          required: true,
          position: 2
        }
      ],
      supportsCountries: ['US']
    }
  ];
}

// Schema for payment method field
const paymentMethodFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.string(),
  required: z.boolean(),
  description: z.string().optional(),
  validation: z.string().optional(),
  copyable: z.boolean().optional(),
  position: z.number().optional()
});

// Schema for payment method configuration
const paymentMethodConfigSchema = z.object({
  currency: z.string(),
  methodType: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  accountType: z.enum(['bank_account', 'e-wallet', 'mobile_money', 'crypto_wallet', 'cash']).optional(),
  fields: z.array(paymentMethodFieldSchema),
  supportsCountries: z.array(z.string())
});

// Get all supported currencies
export async function getSupportedCurrencies(req: Request, res: Response) {
  try {
    console.log('🔄 Admin API: Getting supported currencies');
    
    // Import the countries data from the shared module
    const { countries } = await import('../../client/src/lib/countries');
    
    // Extract unique currencies from the countries list
    const uniqueCurrencies = Array.from(new Set(countries.map(country => country.currency)));
    
    // Sort currencies alphabetically
    const sortedCurrencies = uniqueCurrencies.sort();
    
    console.log(`✅ Admin API: Returning ${sortedCurrencies.length} currencies from shared countries module:`, sortedCurrencies);
    
    // Return a structured response with the currencies array
    // This provides clearer context in the API response and is more consistent
    res.json({
      success: true,
      count: sortedCurrencies.length,
      currencies: sortedCurrencies
    });
  } catch (error) {
    console.error('❌ Admin API: Error getting supported currencies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get supported currencies',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Get all payment method configurations for a specific currency
export async function getPaymentMethodsByCurrency(req: Request, res: Response) {
  try {
    const { currency } = req.params;
    
    console.log(`Fetching payment methods for currency: ${currency}`);
    
    // Get payment methods from storage
    const paymentMethodConfigs = await getPaymentMethodsFromStorage(currency);
    
    console.log(`Found ${paymentMethodConfigs.length} payment methods for ${currency}`);
    
    res.json(paymentMethodConfigs);
  } catch (error) {
    console.error(`Error getting payment methods for currency ${req.params.currency}:`, error);
    res.status(500).json({ message: `Failed to get payment methods for currency ${req.params.currency}` });
  }
}

// Get a specific payment method configuration
export async function getPaymentMethod(req: Request, res: Response) {
  try {
    const { currency, methodType } = req.params;
    
    console.log(`Fetching payment method: ${currency}/${methodType}`);
    
    // Get payment methods from storage
    const paymentMethods = await getPaymentMethodsFromStorage(currency);
    const paymentMethod = paymentMethods.find(m => m.methodType === methodType);
    
    if (!paymentMethod) {
      console.log(`Payment method not found: ${currency}/${methodType}`);
      return res.status(404).json({ error: 'Payment method not found' });
    }
    
    console.log(`Found payment method: ${paymentMethod.name} (${paymentMethod.methodType})`);
    
    res.json(paymentMethod);
  } catch (error) {
    console.error(`Error getting payment method ${req.params.methodType} for currency ${req.params.currency}:`, error);
    res.status(500).json({ 
      message: `Failed to get payment method ${req.params.methodType} for currency ${req.params.currency}` 
    });
  }
}

// Update a payment method configuration
export async function updatePaymentMethod(req: Request, res: Response) {
  try {
    const { currency, methodType } = req.params;
    const updatedConfig = req.body;
    
    console.log(`Updating payment method: ${currency}/${methodType}`);
    
    // Validate request body
    const validationResult = paymentMethodConfigSchema.safeParse(updatedConfig);
    if (!validationResult.success) {
      console.log(`Invalid payment method configuration: ${JSON.stringify(validationResult.error)}`);
      return res.status(400).json({ message: 'Invalid payment method configuration', errors: validationResult.error });
    }
    
    // Get payment methods from storage
    const paymentMethods = await getPaymentMethodsFromStorage(currency);
    const methodIndex = paymentMethods.findIndex(m => m.methodType === methodType);
    
    if (methodIndex === -1) {
      console.log(`Payment method not found: ${currency}/${methodType}`);
      return res.status(404).json({ error: 'Payment method not found' });
    }
    
    // Update the payment method
    paymentMethods[methodIndex] = updatedConfig;
    
    // Save the updated payment methods
    await savePaymentMethodsToStorage(currency, paymentMethods);
    
    console.log(`Successfully updated payment method: ${updatedConfig.name} (${updatedConfig.methodType})`);
    
    res.json({
      success: true,
      message: 'Payment method configuration updated',
      config: updatedConfig
    });
  } catch (error) {
    console.error(`Error updating payment method ${req.params.methodType} for currency ${req.params.currency}:`, error);
    res.status(500).json({ 
      message: `Failed to update payment method ${req.params.methodType} for currency ${req.params.currency}` 
    });
  }
}

// Toggle payment method enabled status
export async function togglePaymentMethod(req: Request, res: Response) {
  try {
    const { currency, methodType } = req.params;
    const { enabled } = req.body;
    
    console.log(`Toggling payment method: ${currency}/${methodType} to ${enabled ? 'enabled' : 'disabled'}`);
    
    // Validate request body
    if (typeof enabled !== 'boolean') {
      console.log(`Invalid request body: ${JSON.stringify(req.body)}`);
      return res.status(400).json({ message: 'Invalid request body. Expected { enabled: boolean }' });
    }
    
    // Get payment methods from storage
    const paymentMethods = await getPaymentMethodsFromStorage(currency);
    const methodIndex = paymentMethods.findIndex(m => m.methodType === methodType);
    
    if (methodIndex === -1) {
      console.log(`Payment method not found: ${currency}/${methodType}`);
      return res.status(404).json({ error: 'Payment method not found' });
    }
    
    // Update the enabled status
    paymentMethods[methodIndex].enabled = enabled;
    
    // Save the updated payment methods
    await savePaymentMethodsToStorage(currency, paymentMethods);
    
    console.log(`Successfully toggled payment method ${currency}/${methodType} to ${enabled ? 'enabled' : 'disabled'}`);
    
    res.json({
      success: true,
      message: `Payment method ${enabled ? 'enabled' : 'disabled'}`,
      method: paymentMethods[methodIndex]
    });
  } catch (error) {
    console.error(`Error toggling payment method ${req.params.methodType} for currency ${req.params.currency}:`, error);
    res.status(500).json({ 
      message: `Failed to toggle payment method ${req.params.methodType} for currency ${req.params.currency}` 
    });
  }
}

// Get all countries where a specific payment method is available
export async function getPaymentMethodCountries(req: Request, res: Response) {
  try {
    const { currency, methodType } = req.params;
    
    // Import the countries data and helper functions from shared module
    const { getCountryCodes, getCountriesByCurrency } = await import('../../client/src/lib/countries');
    
    // First try to get the payment method from storage
    const paymentMethods = await getPaymentMethodsFromStorage(currency);
    const paymentMethod = paymentMethods.find(m => m.methodType === methodType);
    
    let countries: string[] = [];
    
    if (paymentMethod && paymentMethod.supportsCountries && paymentMethod.supportsCountries.length > 0) {
      // Use the countries specified in the payment method configuration
      countries = paymentMethod.supportsCountries;
      console.log(`Using countries from payment method configuration: ${countries.join(', ')}`);
    } else {
      // If no countries are specified in the payment method configuration, 
      // fallback to countries that use the specified currency
      const countriesForCurrency = getCountriesByCurrency(currency);
      countries = countriesForCurrency.map(country => country.code);
      console.log(`Using countries that use ${currency}: ${countries.join(', ')}`);
      
      // If no countries use this currency, fallback to providing all country codes
      if (countries.length === 0) {
        countries = getCountryCodes();
        console.log(`No countries found for ${currency}, using all countries`);
      }
    }
    
    res.json(countries);
  } catch (error) {
    console.error(`Error getting countries for payment method ${req.params.methodType}:`, error);
    res.status(500).json({ message: `Failed to get countries for payment method ${req.params.methodType}` });
  }
}

// Delete a payment method configuration
export async function deletePaymentMethod(req: Request, res: Response) {
  try {
    const { currency, methodType } = req.params;
    
    console.log(`🗑️ Deleting payment method ${methodType} for currency ${currency}`);
    
    // Get payment methods from storage
    const paymentMethods = await getPaymentMethodsFromStorage(currency);
    const methodIndex = paymentMethods.findIndex(m => m.methodType === methodType);
    
    if (methodIndex === -1) {
      console.log(`Payment method not found: ${currency}/${methodType}`);
      return res.status(404).json({ error: 'Payment method not found' });
    }
    
    // Remove the method from the array
    const removedMethod = paymentMethods.splice(methodIndex, 1)[0];
    
    // Save the updated payment methods
    await savePaymentMethodsToStorage(currency, paymentMethods);
    
    console.log(`✅ Successfully deleted payment method ${currency}/${methodType}`);
    console.log(`Remaining payment methods for ${currency}: ${paymentMethods.length}`);
    
    // Return success response
    res.json({ 
      success: true, 
      message: `Payment method ${methodType} for currency ${currency} has been deleted`,
      removedMethod: removedMethod,
      remainingCount: paymentMethods.length
    });
  } catch (error) {
    console.error(`Error deleting payment method ${req.params.methodType} for currency ${req.params.currency}:`, error);
    res.status(500).json({ 
      message: `Failed to delete payment method ${req.params.methodType} for currency ${req.params.currency}` 
    });
  }
}

// Create a new payment method configuration
export async function createPaymentMethod(req: Request, res: Response) {
  try {
    const paymentMethodConfig = req.body;
    
    console.log(`🌟 Creating new payment method ${paymentMethodConfig.methodType} for currency ${paymentMethodConfig.currency}`);
    
    // Validate request body
    const validationResult = paymentMethodConfigSchema.safeParse(paymentMethodConfig);
    if (!validationResult.success) {
      console.log(`Invalid payment method configuration: ${JSON.stringify(validationResult.error)}`);
      return res.status(400).json({ message: 'Invalid payment method configuration', errors: validationResult.error });
    }
    
    // Get existing payment methods from storage
    const paymentMethods = await getPaymentMethodsFromStorage(paymentMethodConfig.currency);
    
    // Check if a method with the same methodType already exists
    const existingMethodIndex = paymentMethods.findIndex(m => m.methodType === paymentMethodConfig.methodType);
    if (existingMethodIndex !== -1) {
      console.log(`Payment method with type ${paymentMethodConfig.methodType} already exists for currency ${paymentMethodConfig.currency}`);
      return res.status(409).json({ error: 'Payment method already exists' });
    }
    
    // Add the new method to the array
    paymentMethods.push(paymentMethodConfig);
    
    // Save the updated payment methods
    await savePaymentMethodsToStorage(paymentMethodConfig.currency, paymentMethods);
    
    console.log(`✅ Successfully created payment method ${paymentMethodConfig.currency}/${paymentMethodConfig.methodType}`);
    console.log(`Total payment methods for ${paymentMethodConfig.currency}: ${paymentMethods.length}`);
    
    // Return success response with the created config
    res.status(201).json({ 
      success: true, 
      message: `Payment method ${paymentMethodConfig.methodType} for currency ${paymentMethodConfig.currency} has been created`,
      config: paymentMethodConfig,
      totalCount: paymentMethods.length
    });
  } catch (error) {
    console.error(`Error creating payment method:`, error);
    res.status(500).json({ 
      message: `Failed to create payment method` 
    });
  }
}