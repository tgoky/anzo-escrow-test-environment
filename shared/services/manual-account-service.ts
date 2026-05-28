import { z } from 'zod';
import { ManualFinancialAccount, ManualPaymentMethod, manualFinancialAccountSchema, validatePaymentMethod } from '../types/manual-financial-account';

/**
 * Service to handle manual financial account operations
 */
export class ManualAccountService {
  /**
   * Create a new manual financial account
   */
  static createAccount(data: z.infer<typeof manualFinancialAccountSchema>): ManualFinancialAccount {
    return require('../types/manual-financial-account').createManualFinancialAccount(data);
  }
  
  /**
   * Validate the input data for creating an account
   */
  static validateAccountData(data: any): { valid: boolean; errors?: string[] } {
    try {
      // Check if we have valid input structure
      if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Invalid input data'] };
      }
      
      const errors: string[] = [];
      
      // Validate basic account details
      if (!data.walletAddress) errors.push('Wallet address is required');
      if (!data.accountName) errors.push('Account name is required');
      
      // Validate account type (must be one of the predefined types)
      const validAccountTypes = ['bank_account', 'e-wallet', 'mobile_money', 'crypto_wallet', 'cash'];
      if (!data.accountType) {
        errors.push('Account type is required');
      } else if (!validAccountTypes.includes(data.accountType)) {
        errors.push(`Account type must be one of: ${validAccountTypes.join(', ')}`);
      }
      
      if (!data.currency) errors.push('Currency is required');
      
      // Validate institution
      if (!data.institution || typeof data.institution !== 'object') {
        errors.push('Institution information is required');
      } else {
        if (!data.institution.name) errors.push('Institution name is required');
        if (!data.institution.type) errors.push('Institution type is required');
        if (!data.institution.country) errors.push('Institution country is required');
      }
      
      // Validate payment methods
      if (!data.paymentMethods || !Array.isArray(data.paymentMethods) || data.paymentMethods.length === 0) {
        errors.push('At least one payment method is required');
      } else {
        data.paymentMethods.forEach((method: ManualPaymentMethod, index: number) => {
          if (!validatePaymentMethod(method)) {
            errors.push(`Payment method at index ${index} is incomplete or invalid`);
          }
        });
      }
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('Error validating account data:', error);
      return { valid: false, errors: ['Validation error occurred'] };
    }
  }
  
  /**
   * Get payment method options based on country and currency
   */
  static getPaymentMethodOptions(country: string, currency: string): Array<{
    type: string;
    name: string;
    description: string;
    fields: Array<{ 
      name: string; 
      label: string; 
      type: 'text' | 'email' | 'phone' | 'password' | 'textarea';
      required: boolean; 
    }>;
  }> {
    // Common payment methods
    const commonMethods = [
      {
        type: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Traditional bank-to-bank transfer',
        fields: [
          { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
          { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
          { name: 'accountHolder', label: 'Account Holder Name', type: 'text', required: true },
          { name: 'branchCode', label: 'Branch Code', type: 'text', required: false },
          { name: 'swiftCode', label: 'SWIFT/BIC Code', type: 'text', required: false },
        ]
      }
    ];
    
    // Country & currency specific methods
    const specificMethods: Record<string, Array<any>> = {
      // United States
      'US': [
        {
          type: 'zelle',
          name: 'Zelle',
          description: 'Fast bank-to-bank transfers in the US',
          fields: [
            { name: 'email', label: 'Email Address', type: 'email', required: false },
            { name: 'phoneNumber', label: 'Phone Number', type: 'phone', required: false },
          ]
        },
        {
          type: 'cashapp',
          name: 'Cash App',
          description: 'Send and receive money with Cash App',
          fields: [
            { name: 'username', label: 'Cash App $Cashtag', type: 'text', required: true },
          ]
        },
        {
          type: 'venmo',
          name: 'Venmo',
          description: 'Send and receive money with Venmo',
          fields: [
            { name: 'username', label: 'Venmo Username', type: 'text', required: true },
          ]
        }
      ],
      
      // United Kingdom
      'GB': [
        {
          type: 'faster_payments',
          name: 'Faster Payments',
          description: 'UK domestic bank transfers',
          fields: [
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
            { name: 'sortCode', label: 'Sort Code', type: 'text', required: true },
            { name: 'accountHolder', label: 'Account Holder Name', type: 'text', required: true },
          ]
        },
        {
          type: 'revolut',
          name: 'Revolut',
          description: 'Send money to a Revolut account',
          fields: [
            { name: 'phoneNumber', label: 'Phone Number', type: 'phone', required: true },
            { name: 'username', label: 'Revolut Username (optional)', type: 'text', required: false },
          ]
        }
      ],
      
      // European Union
      'EU': [
        {
          type: 'sepa',
          name: 'SEPA Transfer',
          description: 'European bank transfers in EUR',
          fields: [
            { name: 'iban', label: 'IBAN', type: 'text', required: true },
            { name: 'bic', label: 'BIC/SWIFT', type: 'text', required: true },
            { name: 'accountHolder', label: 'Account Holder Name', type: 'text', required: true },
          ]
        }
      ],
      
      // Nigeria
      'NG': [
        {
          type: 'bank_transfer_ng',
          name: 'Nigeria Bank Transfer',
          description: 'Domestic Nigerian bank transfer',
          fields: [
            { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
            { name: 'accountHolder', label: 'Account Holder Name', type: 'text', required: true },
          ]
        }
      ],
      
      // Kenya
      'KE': [
        {
          type: 'mpesa',
          name: 'M-Pesa',
          description: 'Mobile money transfers in Kenya',
          fields: [
            { name: 'phoneNumber', label: 'M-Pesa Phone Number', type: 'phone', required: true },
            { name: 'accountHolder', label: 'Account Holder Name', type: 'text', required: true },
          ]
        }
      ],
      
      // India
      'IN': [
        {
          type: 'upi',
          name: 'UPI',
          description: 'Unified Payments Interface for India',
          fields: [
            { name: 'upiId', label: 'UPI ID', type: 'text', required: true },
            { name: 'accountHolder', label: 'Account Holder Name', type: 'text', required: true },
          ]
        },
        {
          type: 'imps',
          name: 'IMPS',
          description: 'Immediate Payment Service for India',
          fields: [
            { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
            { name: 'ifscCode', label: 'IFSC Code', type: 'text', required: true },
            { name: 'accountHolder', label: 'Account Holder Name', type: 'text', required: true },
          ]
        }
      ],
      
      // Brazil
      'BR': [
        {
          type: 'pix',
          name: 'PIX',
          description: 'Brazilian instant payment system',
          fields: [
            { name: 'pixKey', label: 'PIX Key', type: 'text', required: true },
            { name: 'pixKeyType', label: 'PIX Key Type', type: 'text', required: true },
            { name: 'accountHolder', label: 'Account Holder Name', type: 'text', required: true },
          ]
        }
      ]
    };
    
    const globalMethods = [
      {
        type: 'paypal',
        name: 'PayPal',
        description: 'Send and receive money with PayPal',
        fields: [
          { name: 'email', label: 'PayPal Email', type: 'email', required: true },
        ]
      },
      {
        type: 'cash_deposit',
        name: 'Cash Deposit',
        description: 'In-person cash deposit at a bank branch',
        fields: [
          { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
          { name: 'location', label: 'Branch Location', type: 'text', required: false },
          { name: 'instructions', label: 'Deposit Instructions', type: 'textarea', required: true },
        ]
      }
    ];
    
    // Get methods for the specific country
    let countryMethods: Array<any> = [];
    
    // Add country-specific methods
    if (specificMethods[country]) {
      countryMethods = [...countryMethods, ...specificMethods[country]];
    }
    
    // Add region-specific methods (like EU)
    const euroCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'LU', 'SI', 'CY', 'MT', 'SK', 'EE', 'LV', 'LT', 'GR'];
    if (euroCountries.includes(country) && specificMethods['EU']) {
      countryMethods = [...countryMethods, ...specificMethods['EU']];
    }
    
    // Filter methods based on currency compatibility
    // This would be more complex in a real application
    
    // Finally, add common methods that work everywhere
    return [...countryMethods, ...commonMethods, ...globalMethods];
  }
  
  /**
   * Get default account type for a payment method
   * This helps automatically assign the correct account type based on the payment method
   */
  static getDefaultAccountTypeForMethod(methodType: string): string {
    // Map payment methods to their default account types
    const methodToAccountTypeMap: Record<string, string> = {
      // Bank-based methods
      'bank_transfer': 'bank_account',
      'bank_transfer_ng': 'bank_account',
      'faster_payments': 'bank_account',
      'sepa': 'bank_account',
      'ach': 'bank_account',
      'wire': 'bank_account',
      'imps': 'bank_account',
      'zelle': 'bank_account',
      
      // E-wallets
      'paypal': 'e-wallet',
      'revolut': 'e-wallet',
      'venmo': 'e-wallet',
      'cashapp': 'e-wallet',
      
      // Mobile money
      'mpesa': 'mobile_money',
      'mobile_money': 'mobile_money',
      'upi': 'mobile_money',
      'pix': 'mobile_money',
      
      // Crypto
      'bitcoin': 'crypto_wallet',
      'ethereum': 'crypto_wallet',
      'sol': 'crypto_wallet',
      'usdc': 'crypto_wallet',
      'usdt': 'crypto_wallet',
      
      // Cash
      'cash_deposit': 'cash',
      'cash_pickup': 'cash',
      'cash_delivery': 'cash',
    };
    
    return methodToAccountTypeMap[methodType] || 'bank_account'; // Default to bank_account if no mapping exists
  }

  /**
   * Format payment method details for display
   */
  static formatPaymentMethodForDisplay(method: ManualPaymentMethod, fields?: import('../types/manual-financial-account').PaymentMethodField[]): {
    type: string;
    name: string;
    displayDetails: Array<{key: string; value: string; label: string; copyable?: boolean}>;
    formattedDetails: Array<{label: string; value: string; copyable?: boolean; validation?: string}>;
    paymentInstructions: string;
    accountType?: string;
  } {
    // Get a friendly name for the payment method type
    const nameMap: Record<string, string> = {
      'bank_transfer': 'Bank Transfer',
      'zelle': 'Zelle',
      'cashapp': 'Cash App',
      'venmo': 'Venmo',
      'paypal': 'PayPal',
      'upi': 'UPI',
      'pix': 'PIX',
      'mpesa': 'M-Pesa',
      'faster_payments': 'Faster Payments',
      'sepa': 'SEPA Transfer',
      'revolut': 'Revolut',
      'cash_deposit': 'Cash Deposit',
      'mobile_money': 'Mobile Money',
      'bank_transfer_ng': 'Nigeria Bank Transfer',
      'imps': 'IMPS',
    };
    
    // Get a friendly label for each detail key
    const labelMap: Record<string, string> = {
      'accountNumber': 'Account Number',
      'accountHolder': 'Account Holder',
      'bankName': 'Bank Name',
      'branchCode': 'Branch Code',
      'swiftCode': 'SWIFT/BIC',
      'sortCode': 'Sort Code',
      'iban': 'IBAN',
      'bic': 'BIC/SWIFT',
      'phoneNumber': 'Phone Number',
      'email': 'Email',
      'username': 'Username',
      'upiId': 'UPI ID',
      'ifscCode': 'IFSC Code',
      'pixKey': 'PIX Key',
      'pixKeyType': 'PIX Key Type',
      'location': 'Location',
      'instructions': 'Instructions'
    };
    
    // Determine account type
    const accountType = this.getDefaultAccountTypeForMethod(method.type);

    // If fields are provided, handle them appropriately
    if (fields && fields.length > 0) {
      // Sort fields based on position if specified
      const sortedFields = [...fields].sort((a, b) => {
        // If both have position, sort by position
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        // If only one has position, prioritize the one with position
        if (a.position !== undefined) return -1;
        if (b.position !== undefined) return 1;
        // Default sort by name
        return a.name.localeCompare(b.name);
      });

      // Format details based on field definitions
      const displayDetails = sortedFields.map(field => {
        const value = method.details[field.name] || '';
        return {
          key: field.name,
          value,
          label: field.label || labelMap[field.name] || field.name,
          copyable: field.copyable === true,
          validation: field.validation
        };
      });
      
      // Add instructions if present
      if (method.instructions) {
        displayDetails.push({
          key: 'instructions',
          value: method.instructions,
          label: 'Instructions',
          copyable: false, // Instructions are typically not copied
          validation: undefined
        });
      }
      
      // Create an array of formatted details for easy display, using the sorted fields
      const formattedDetails: Array<{
        label: string; 
        value: string; 
        copyable?: boolean;
        validation?: string
      }> = sortedFields.map(field => {
        const value = method.details[field.name] || '';
        return {
          label: field.label || labelMap[field.name] || field.name,
          value,
          copyable: field.copyable === true,
          validation: field.validation
        };
      }).filter(item => item.value); // Only include fields with values
      
      // Add instructions to formatted details if present
      if (method.instructions) {
        formattedDetails.push({
          label: 'Instructions',
          value: method.instructions,
          copyable: false,
          validation: undefined
        });
      }
      
      return {
        type: method.type,
        name: nameMap[method.type] || method.type,
        displayDetails,
        formattedDetails,
        paymentInstructions: this.getPaymentInstructions(method),
        accountType
      };
    }
    
    // If no fields provided, use the default approach
    // Define which fields are typically copyable by default
    const copyableFields = [
      'accountNumber', 'routingNumber', 'iban', 'bic', 'swiftCode', 'sortCode',
      'email', 'phoneNumber', 'username', 'upiId', 'pixKey', 'ifscCode',
      'walletAddress', 'address'
    ];
    
    // Format the details
    const displayDetails = Object.entries(method.details).map(([key, value]) => {
      // Check if this field is typically copyable
      const copyable = copyableFields.includes(key);
      
      return {
        key,
        value,
        label: labelMap[key] || key,
        copyable,
        validation: method.validation?.[key]
      };
    });
    
    // Add instructions if present
    if (method.instructions) {
      displayDetails.push({
        key: 'instructions',
        value: method.instructions,
        label: 'Instructions',
        copyable: false, // Instructions are typically not copied
        validation: undefined
      });
    }
    
    // Create an array of formatted details for easy display
    const formattedDetails: Array<{
      label: string; 
      value: string; 
      copyable?: boolean;
      validation?: string
    }> = [];
    
    // Add payment method-specific details with proper labels
    switch (method.type) {
      case 'bank_transfer':
        if (method.details.bankName) {
          formattedDetails.push({ label: 'Bank Name', value: method.details.bankName });
        }
        if (method.details.accountHolder) {
          formattedDetails.push({ label: 'Account Holder', value: method.details.accountHolder });
        }
        if (method.details.accountNumber) {
          formattedDetails.push({ label: 'Account Number', value: method.details.accountNumber, copyable: true });
        }
        if (method.details.routingNumber) {
          formattedDetails.push({ label: 'Routing Number', value: method.details.routingNumber, copyable: true });
        }
        if (method.details.branchCode) {
          formattedDetails.push({ label: 'Branch Code', value: method.details.branchCode, copyable: true });
        }
        if (method.details.swiftCode) {
          formattedDetails.push({ label: 'SWIFT/BIC', value: method.details.swiftCode, copyable: true });
        }
        if (method.details.iban) {
          formattedDetails.push({ label: 'IBAN', value: method.details.iban, copyable: true });
        }
        break;
        
      case 'zelle':
        if (method.details.email) {
          formattedDetails.push({ label: 'Zelle Email', value: method.details.email, copyable: true });
        }
        if (method.details.phoneNumber) {
          formattedDetails.push({ label: 'Zelle Phone', value: method.details.phoneNumber, copyable: true });
        }
        break;
        
      case 'venmo':
      case 'cashapp':
        if (method.details.username) {
          formattedDetails.push({ label: 'Username', value: method.details.username, copyable: true });
        }
        break;
        
      case 'paypal':
        if (method.details.email) {
          formattedDetails.push({ label: 'PayPal Email', value: method.details.email, copyable: true });
        }
        break;
        
      case 'mobile_money':
      case 'mpesa':
        if (method.details.phoneNumber) {
          formattedDetails.push({ label: 'Phone Number', value: method.details.phoneNumber, copyable: true });
        }
        if (method.details.accountName) {
          formattedDetails.push({ label: 'Account Name', value: method.details.accountName });
        }
        break;
        
      case 'upi':
        if (method.details.upiId) {
          formattedDetails.push({ label: 'UPI ID', value: method.details.upiId, copyable: true });
        }
        break;
        
      case 'pix':
        if (method.details.pixKey) {
          formattedDetails.push({ label: 'PIX Key', value: method.details.pixKey, copyable: true });
        }
        if (method.details.pixKeyType) {
          formattedDetails.push({ label: 'PIX Key Type', value: method.details.pixKeyType });
        }
        break;
        
      case 'cash_deposit':
        if (method.details.location) {
          formattedDetails.push({ label: 'Location', value: method.details.location });
        }
        break;
        
      default:
        // For unknown payment methods, just add all details
        Object.entries(method.details).forEach(([key, value]) => {
          const label = labelMap[key] || key;
          // Check if this field should be copyable
          const copyable = copyableFields.includes(key);
          formattedDetails.push({ 
            label, 
            value, 
            copyable,
            validation: method.validation?.[key]
          });
        });
    }
    
    // Add country/currency info
    formattedDetails.push({ label: 'Country', value: method.country });
    formattedDetails.push({ label: 'Currency', value: method.currency });
    
    return {
      type: method.type,
      name: nameMap[method.type] || method.type,
      displayDetails,
      formattedDetails,
      paymentInstructions: this.getPaymentInstructions(method),
      accountType
    };
  }
  
  /**
   * Get payment instructions for a specific method
   */
  static getPaymentInstructions(method: ManualPaymentMethod): string {
    // Start with any explicitly provided instructions
    let instructions = method.instructions || '';
    
    // Add default instructions based on the payment method type if none provided
    if (!instructions) {
      switch (method.type) {
        case 'bank_transfer':
          instructions = `Please transfer ${method.currency} to the account details above. Include the transaction ID in the reference field.`;
          break;
          
        case 'zelle':
          const target = method.details.email 
            ? `email ${method.details.email}` 
            : `phone ${method.details.phoneNumber}`;
          instructions = `Send payment via Zelle to ${target}. Include the transaction ID in the memo.`;
          break;
          
        case 'venmo':
          instructions = `Send payment via Venmo to @${method.details.username}. Add the transaction ID in the note.`;
          break;
          
        case 'cashapp':
          instructions = `Send payment via Cash App to $${method.details.username}. Include the transaction ID in the note.`;
          break;
          
        case 'paypal':
          instructions = `Send payment via PayPal to ${method.details.email}. Select "Friends and Family" to avoid fees.`;
          break;
          
        case 'mobile_money':
        case 'mpesa':
          instructions = `Send mobile money to ${method.details.phoneNumber}. Use the transaction ID as the reference.`;
          break;
          
        case 'upi':
          instructions = `Send payment to UPI ID: ${method.details.upiId}. Include the transaction ID in the note.`;
          break;
          
        case 'cash_deposit':
          instructions = `Make a cash deposit at ${method.details.location || 'the specified location'}. Take a photo of the receipt as proof of payment.`;
          break;
          
        default:
          instructions = `Please complete the payment using the details provided above and notify the seller when complete.`;
      }
    }
    
    return instructions;
  }
}