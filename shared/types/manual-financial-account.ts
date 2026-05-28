import { z } from 'zod';
import { BaseFinancialAccount, FinancialInstitution, PaymentCapabilities } from './financial-account';
import { v4 as uuidv4 } from 'uuid';

/**
 * Definition for a manually entered financial account
 */
export interface ManualFinancialAccount extends BaseFinancialAccount {
  manualDetails: {
    enteredBy: string; // Wallet address of the user who entered this account
    paymentMethods: ManualPaymentMethod[];
    verified: boolean;
  };
  paymentMethodTypes?: string[]; // Array of unique payment method identifiers (e.g., ['zelle_USD', 'bank_transfer_EUR'])
}

/**
 * Represents a manual payment method for P2P transactions
 */
export interface ManualPaymentMethod {
  type: string; // 'bank_transfer', 'mobile_money', 'cash_deposit', etc.
  provider: string; // The service/institution handling this payment method
  details: Record<string, string>; // Flexible details specific to payment method
  instructions?: string; // Optional payment instructions
  country: string; // ISO country code
  currency: string; // ISO currency code
  validation?: Record<string, string>; // Optional validation rules for fields
}

/**
 * Schema for validating manual account creation
 */
export const manualFinancialAccountSchema = z.object({
  walletAddress: z.string().min(1, "Wallet address is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.string().min(1, "Account type is required"),
  institution: z.object({
    name: z.string().min(1, "Institution name is required"),
    type: z.string().min(1, "Institution type is required"),
    country: z.string().min(2, "Country code is required").max(2, "Country code must be 2 characters")
  }),
  currency: z.string().min(3, "Currency code is required").max(3, "Currency code must be 3 characters"),
  paymentMethods: z.array(z.object({
    type: z.string().min(1, "Payment method type is required"),
    provider: z.string().min(1, "Provider name is required"),
    details: z.record(z.string(), z.string()),
    instructions: z.string().optional(),
    country: z.string().min(2, "Country code is required").max(2, "Country code must be 2 characters"),
    currency: z.string().min(3, "Currency code is required").max(3, "Currency code must be 3 characters"),
    validation: z.record(z.string(), z.string()).optional()
  })).min(1, "At least one payment method is required"),
  accountTypeValidation: z.enum(['bank_account', 'e-wallet', 'mobile_money', 'crypto_wallet', 'cash']).optional()
});

/**
 * Creates a manual financial account from user input
 */
export function createManualFinancialAccount(
  data: z.infer<typeof manualFinancialAccountSchema>
): ManualFinancialAccount {
  // Generate a unique ID
  const accountId = `manual_${uuidv4()}`;
  
  // Create institution object
  const institution: FinancialInstitution = {
    id: `inst_${data.institution.name.toLowerCase().replace(/\s/g, '_')}`,
    name: data.institution.name,
    type: data.institution.type,
    country: data.institution.country,
  };
  
  const paymentCapabilities: PaymentCapabilities = {};
  
  // Generate unique payment method IDs
  const uniquePaymentMethodIds = data.paymentMethods.map(pm => 
    generateUniquePaymentMethodId(pm.type, pm.currency)
  );
  
  // Return the full account object
  return {
    id: accountId,
    accountName: data.accountName,
    accountType: data.accountType,
    currency: data.currency,
    balances: {
      available: null,
      current: null,
      iso_currency_code: data.currency
    },
    status: 'active',
    institution,
    manualDetails: {
      enteredBy: data.walletAddress,
      paymentMethods: data.paymentMethods,
      verified: false
    },
    paymentMethodTypes: uniquePaymentMethodIds
  };
}

/**
 * Field definition for payment method validation
 */
export interface PaymentMethodField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number';
  required: boolean;
  description?: string;
  validation?: string; // Regex pattern for validation
  copyable?: boolean;   // Whether the field should have a copy button
  position?: number;    // Position for ordering
}

/**
 * Validates that a payment method is complete and has all required fields
 * based on the payment method type
 */
export function validatePaymentMethod(method: ManualPaymentMethod, fields?: PaymentMethodField[]): boolean {
  console.log('🔍 VALIDATE PAYMENT METHOD: Validating method:', JSON.stringify(method));
  
  // Special case: if method is not fully formed yet (like during form initialization)
  // Allow it to pass validation to prevent errors during form setup
  if (!method) {
    console.log('⚠️ VALIDATE PAYMENT METHOD: Method is undefined or null');
    return false;
  }
  
  // Basic validation - ensure all required fields are present
  // If missing fields, try to use defaults where possible
  const missingFields = [];
  if (!method.type) missingFields.push('type');
  
  // Provider can default to type if missing
  if (!method.provider && method.type) {
    console.log(`ℹ️ VALIDATE PAYMENT METHOD: Setting provider to type (${method.type})`);
    method.provider = method.type;
  } else if (!method.provider) {
    missingFields.push('provider');
  }
  
  if (!method.country) missingFields.push('country');
  if (!method.currency) missingFields.push('currency');
  
  if (missingFields.length > 0) {
    console.log('⚠️ VALIDATE PAYMENT METHOD: Missing basic fields:', missingFields);
    return false;
  }
  
  // Make sure details is an object
  if (!method.details) {
    console.log('ℹ️ VALIDATE PAYMENT METHOD: Details is missing, initializing empty object');
    method.details = {};
  } else if (typeof method.details !== 'object') {
    console.log('❌ VALIDATE PAYMENT METHOD: Details is not an object:', method.details);
    return false;
  }
  
  // If fields are provided, validate according to field specifications
  if (fields && fields.length > 0) {
    const fieldErrors: string[] = [];
    
    // Check each field according to its validation rules
    for (const field of fields) {
      const value = method.details[field.name];
      
      // Check if required fields are present
      if (field.required && (!value || value.trim() === '')) {
        fieldErrors.push(`Required field '${field.name}' is missing or empty`);
        continue;
      }
      
      // Skip validation if value is empty and field is not required
      if (!value || value.trim() === '') continue;
      
      // Validate specific field types
      if (field.type === 'email' && value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          fieldErrors.push(`Field '${field.name}' is not a valid email address`);
        }
      } else if (field.type === 'tel' && value) {
        // Simple phone validation - can be enhanced for international formats
        const phonePattern = /^[+]?[\d\s()-]{8,20}$/;
        if (!phonePattern.test(value)) {
          fieldErrors.push(`Field '${field.name}' is not a valid phone number`);
        }
      }
      
      // Apply custom validation pattern if provided
      if (field.validation && value) {
        try {
          const regex = new RegExp(field.validation);
          if (!regex.test(value)) {
            fieldErrors.push(`Field '${field.name}' failed validation pattern: ${field.validation}`);
          }
        } catch (error) {
          console.error(`Invalid validation pattern for field '${field.name}':`, error);
          // Don't fail validation due to bad regex pattern
        }
      }
      
      // Check method-specific validation rules if they exist
      if (method.validation && method.validation[field.name] && value) {
        try {
          const regex = new RegExp(method.validation[field.name]);
          if (!regex.test(value)) {
            fieldErrors.push(`Field '${field.name}' failed method-specific validation pattern: ${method.validation[field.name]}`);
          }
        } catch (error) {
          console.error(`Invalid method-specific validation pattern for field '${field.name}':`, error);
          // Don't fail validation due to bad regex pattern
        }
      }
    }
    
    if (fieldErrors.length > 0) {
      console.log('❌ VALIDATE PAYMENT METHOD: Field validation errors:', fieldErrors);
      return false;
    }
    
    // If using field validation and all checks pass, consider it valid
    return true;
  }
  
  // Type-specific validation
  let valid = false;
  switch (method.type) {
    case 'bank_transfer':
      valid = !!method.details.accountNumber;
      console.log(`🏦 VALIDATE PAYMENT METHOD (bank_transfer): accountNumber present: ${!!method.details.accountNumber}`);
      break;
      
    case 'mobile_money':
      valid = !!method.details.phoneNumber;
      console.log(`📱 VALIDATE PAYMENT METHOD (mobile_money): phoneNumber present: ${!!method.details.phoneNumber}`);
      break;
      
    case 'cash_deposit':
      valid = !!method.details.location || !!method.instructions;
      console.log(`💰 VALIDATE PAYMENT METHOD (cash_deposit): location or instructions present: ${!!method.details.location || !!method.instructions}`);
      break;
      
    case 'zelle':
      valid = !!method.details.email || !!method.details.phoneNumber;
      console.log(`💸 VALIDATE PAYMENT METHOD (zelle): email or phone present: ${!!method.details.email || !!method.details.phoneNumber}`);
      break;
      
    case 'paypal':
      valid = !!method.details.email;
      console.log(`💳 VALIDATE PAYMENT METHOD (paypal): email present: ${!!method.details.email}`);
      break;
      
    case 'venmo':
    case 'cashapp':
      valid = !!method.details.username;
      console.log(`📲 VALIDATE PAYMENT METHOD (${method.type}): username present: ${!!method.details.username}`);
      break;
      
    case 'faster_payments':
      valid = !!method.details.sortCode && !!method.details.accountNumber;
      console.log(`💷 VALIDATE PAYMENT METHOD (faster_payments): sortCode and accountNumber present: ${!!method.details.sortCode && !!method.details.accountNumber}`);
      break;
      
    case 'sepa':
      valid = !!method.details.iban;
      console.log(`💶 VALIDATE PAYMENT METHOD (sepa): iban present: ${!!method.details.iban}`);
      break;
      
    case 'upi':
      valid = !!method.details.upiId;
      console.log(`💱 VALIDATE PAYMENT METHOD (upi): upiId present: ${!!method.details.upiId}`);
      break;
      
    case 'mpesa':
      valid = !!method.details.phoneNumber;
      console.log(`📞 VALIDATE PAYMENT METHOD (mpesa): phoneNumber present: ${!!method.details.phoneNumber}`);
      break;
      
    case 'pix':
      valid = !!method.details.pixKey;
      console.log(`💲 VALIDATE PAYMENT METHOD (pix): pixKey present: ${!!method.details.pixKey}`);
      break;
      
    case 'revolut':
      valid = !!method.details.phoneNumber;
      console.log(`📱 VALIDATE PAYMENT METHOD (revolut): phoneNumber present: ${!!method.details.phoneNumber}`);
      break;
      
    default:
      // For unknown types, assume valid if type is set 
      // This is to avoid blocking account creation when new payment types are added
      valid = true;
      console.log(`❓ VALIDATE PAYMENT METHOD (${method.type}): Unknown type but assuming valid for flexibility`);
      break;
  }
  
  console.log(`${valid ? '✅' : '❌'} VALIDATE PAYMENT METHOD: Method is ${valid ? 'valid' : 'invalid'}`);
  return valid;
}

/**
 * Generate a unique payment method identifier by combining method type and currency
 * e.g., 'zelle_USD', 'bank_transfer_EUR', etc.
 */
export function generateUniquePaymentMethodId(type: string, currency: string): string {
  return `${type}_${currency}`;
}

/**
 * Extract the method type and currency from a unique payment method ID
 */
export function parseUniquePaymentMethodId(uniqueId: string): { type: string; currency: string } | null {
  const parts = uniqueId.split('_');
  if (parts.length < 2) {
    return null;
  }
  
  // The currency is usually the last part
  const currency = parts[parts.length - 1];
  // The method type is everything before the currency
  const type = parts.slice(0, parts.length - 1).join('_');
  
  return { type, currency };
}

/**
 * Get display information for a manual financial account
 */
export function getManualAccountDisplayInfo(account: ManualFinancialAccount): {
  id: string;
  name: string;
  institutionName: string;
  currency: string;
  paymentMethodCount: number;
  paymentMethodTypes: string[];
  uniquePaymentMethodIds: string[];
} {
  // Generate unique payment method IDs from each method
  const uniquePaymentMethodIds = account.manualDetails.paymentMethods.map(pm => 
    generateUniquePaymentMethodId(pm.type, pm.currency)
  );
  
  return {
    id: account.id,
    name: account.accountName,
    institutionName: account.institution.name,
    currency: account.currency,
    paymentMethodCount: account.manualDetails.paymentMethods.length,
    paymentMethodTypes: account.manualDetails.paymentMethods.map(pm => pm.type),
    uniquePaymentMethodIds
  };
}