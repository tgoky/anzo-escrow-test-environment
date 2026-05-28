import { Request, Response } from 'express';
import { getPaymentMethodsFromStorage } from './admin-payment-methods';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Returns payment method options based on country and currency
 */
export async function getPaymentMethodOptions(req: Request, res: Response) {
  console.log("🔍 getPaymentMethodOptions called with query:", req.query);
  const { country, currency } = req.query;
  
  // Default to US and USD if parameters are not provided
  const countryCode = country ? country.toString() : 'US';
  const currencyCode = currency ? currency.toString() : 'USD';
  
  console.log(`📍 Using country=${countryCode}, currency=${currencyCode}`);

  try {
    // Get payment method options based on country and currency
    const options = await getPaymentMethodsByCountryAndCurrency(countryCode, currencyCode);
    
    console.log(`✅ Returning ${options.length} payment method options`);
    res.json(options);
  } catch (error) {
    console.error(`Error getting payment methods:`, error);
    console.error(`Error details:`, JSON.stringify(error, null, 2));
    console.error(`Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    res.status(500).json({ error: 'Failed to fetch payment method options' });
  }
}

/**
 * Returns payment method options for a given country and currency
 */
export async function getPaymentMethodsByCountryAndCurrency(country: string, currency: string): Promise<Array<{
  type: string;
  name: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}>> {
  console.log(`🔍 Looking for payment methods for country=${country}, currency=${currency}`);
  
  try {
    // First check if we have admin-configured methods for this currency
    console.log(`📂 Reading payment-methods-${currency.toLowerCase()}.json file...`);
    
    try {
      console.log('✅ Using imported fs and path modules');
      
      // Build file path with error handling
      let filePath;
      try {
        filePath = path.join(process.cwd(), 'data', `payment-methods-${currency.toLowerCase()}.json`);
        console.log(`📂 Built file path: ${filePath}`);
      } catch (pathError: any) {
        console.error('❌ Error building file path:', pathError);
        throw new Error(`Error building file path: ${pathError.message}`);
      }
      
      console.log(`📂 Checking if file exists at ${filePath}`);
      
      // Check if file exists
      let fileExists;
      try {
        fileExists = fs.existsSync(filePath);
        console.log(`File exists check result: ${fileExists}`);
      } catch (existsError: any) {
        console.error('❌ Error checking if file exists:', existsError);
        throw new Error(`Error checking if file exists: ${existsError.message}`);
      }
      
      if (fileExists) {
        console.log(`✅ Payment methods file for ${currency} exists`);
        
        // Read file content
        let fileContent;
        try {
          fileContent = fs.readFileSync(filePath, 'utf8');
          console.log(`📄 File content length: ${fileContent.length} bytes`);
        } catch (readError: any) {
          console.error('❌ Error reading file:', readError);
          throw new Error(`Error reading file: ${readError.message}`);
        }
        
        // Parse JSON content
        let adminConfiguredMethods;
        try {
          adminConfiguredMethods = JSON.parse(fileContent);
          console.log(`🔎 Successfully parsed JSON, found ${adminConfiguredMethods.length} methods`);
        } catch (parseError: any) {
          console.error('❌ Error parsing JSON:', parseError);
          throw new Error(`Error parsing JSON: ${parseError.message}`);
        }
        
        // First, filter out any disabled methods
        const enabledMethods = adminConfiguredMethods.filter((method: any) => method.enabled);
        
        // Then filter by country support
        let availableMethods = enabledMethods.filter((method: any) => {
          // If the method has country restrictions, check if this country is supported
          if (method.supportsCountries && method.supportsCountries.length > 0) {
            return method.supportsCountries.includes(country.toUpperCase());
          }
          // If no country restrictions, this method is available everywhere
          return true;
        });
        
        // If no methods match the requested country, return all enabled methods
        // This ensures that payment methods configured in admin are always available
        if (availableMethods.length === 0 && enabledMethods.length > 0) {
          console.log(`⚠️ No payment methods found for country ${country}, returning all enabled methods for ${currency}`);
          availableMethods = enabledMethods;
        }
        
        // Map to the expected format
        const formattedMethods = availableMethods.map((method: any) => ({
          type: method.methodType,
          name: method.name,
          description: method.description,
          fields: method.fields
        }));
        
        console.log(`✅ Returning ${formattedMethods.length} available payment methods for ${currency}`);
        console.log(`💡 Methods: ${formattedMethods.map((m: any) => m.name).join(', ')}`);
        return formattedMethods;
      }
      
      console.log(`⚠️ No payment methods file found for ${currency}, using fallback methods`);
    } catch (fileError: any) {
      console.error(`⚠️ Error reading payment methods file: ${fileError.message}`);
      console.error(`Stack trace: ${fileError.stack}`);
    }
    
    // If we reach here, use fallback methods
    const fallbackMethods = await getFallbackPaymentMethods(country, currency);
    console.log(`🔄 Using fallback methods: ${fallbackMethods.map((m: any) => m.name).join(', ')}`);
    return fallbackMethods;
  } catch (error: any) {
    console.error(`❌ Error in getPaymentMethodsByCountryAndCurrency: ${error}`);
    // In case of error, use fallback defaults
    const fallbackMethods = await getFallbackPaymentMethods(country, currency);
    console.log(`🔄 Using fallback methods due to error: ${fallbackMethods.map((m: any) => m.name).join(', ')}`);
    return fallbackMethods;
  }
}

/**
 * Provides fallback payment methods when no admin configuration exists
 */
async function getFallbackPaymentMethods(country: string, currency: string): Promise<Array<{
  type: string;
  name: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}>> {
  console.log(`🔍 Using fallback payment methods for ${country}/${currency}`);

  try {
    // Import country data
    const { getCountryByCode, getCountriesByCurrency } = await import('../../client/src/lib/countries');
    
    // Get country data if available
    const countryData = getCountryByCode(country);
    
    // Check if the country uses the provided currency
    const countriesWithCurrency = getCountriesByCurrency(currency);
    const currencyMatchesCountry = countriesWithCurrency.some(c => c.code === country);
    
    if (!currencyMatchesCountry) {
      console.log(`⚠️ Warning: Country ${country} does not typically use ${currency}`);
    }
    
    // Special case for USD in US
    if (currency === 'USD' && country === 'US') {
      return [
        {
          type: 'zelle',
          name: 'Zelle',
          description: 'Fast bank-to-bank transfers in the US',
          fields: [
            { name: 'email', label: 'Zelle Email', type: 'email', required: true },
            { name: 'name', label: 'Full Name', type: 'text', required: true }
          ]
        },
        {
          type: 'ach',
          name: 'ACH Transfer',
          description: 'Bank account to bank account transfer',
          fields: [
            { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
            { name: 'routingNumber', label: 'Routing Number', type: 'text', required: true },
            { name: 'bankName', label: 'Bank Name', type: 'text', required: true }
          ]
        },
        {
          type: 'cash_deposit',
          name: 'Cash Deposit',
          description: 'In-person cash deposit at bank branch',
          fields: [
            { name: 'accountName', label: 'Account Name', type: 'text', required: true },
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
            { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
            { name: 'depositInstructions', label: 'Deposit Instructions', type: 'textarea', required: false }
          ]
        }
      ];
    }
    
    // Currency-specific payment methods
    if (currency === 'EUR') {
      return [
        {
          type: 'sepa',
          name: 'SEPA Transfer',
          description: 'European bank transfer',
          fields: [
            { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
            { name: 'iban', label: 'IBAN', type: 'text', required: true },
            { name: 'bic', label: 'BIC/SWIFT', type: 'text', required: true },
            { name: 'bankName', label: 'Bank Name', type: 'text', required: true }
          ]
        }
      ];
    }
    
    if (currency === 'GBP') {
      return [
        {
          type: 'faster_payments',
          name: 'Faster Payments',
          description: 'UK bank transfer',
          fields: [
            { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
            { name: 'sortCode', label: 'Sort Code', type: 'text', required: true },
            { name: 'reference', label: 'Reference', type: 'text', required: true }
          ]
        }
      ];
    }
    
    if (currency === 'NGN') {
      return [
        {
          type: 'bank_transfer',
          name: 'Nigerian Bank Transfer',
          description: 'Transfer to a Nigerian bank account',
          fields: [
            { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
            { name: 'bankName', label: 'Bank Name', type: 'text', required: true }
          ]
        }
      ];
    }
    
    if (currency === 'INR') {
      return [
        {
          type: 'upi',
          name: 'UPI',
          description: 'Unified Payments Interface transfer',
          fields: [
            { name: 'upiId', label: 'UPI ID', type: 'text', required: true },
            { name: 'name', label: 'Account Holder Name', type: 'text', required: true }
          ]
        },
        {
          type: 'imps',
          name: 'IMPS',
          description: 'Immediate Payment Service transfer',
          fields: [
            { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
            { name: 'ifsc', label: 'IFSC Code', type: 'text', required: true },
            { name: 'bankName', label: 'Bank Name', type: 'text', required: true }
          ]
        }
      ];
    }
    
    // For other currencies, provide a basic bank transfer option
    return [
      {
        type: 'bank_transfer',
        name: 'Bank Transfer',
        description: `Regular bank transfer in ${currency}`,
        fields: [
          { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
          { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
          { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
          { name: 'additionalInfo', label: 'Additional Information', type: 'textarea', required: false }
        ]
      }
    ];
  } catch (error) {
    console.error('Error getting fallback payment methods:', error);
    
    // If anything fails, return a minimal fallback option
    return [
      {
        type: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Regular bank transfer',
        fields: [
          { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
          { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
          { name: 'bankName', label: 'Bank Name', type: 'text', required: true }
        ]
      }
    ];
  }
}