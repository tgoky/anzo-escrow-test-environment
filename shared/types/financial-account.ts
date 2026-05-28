import { z } from 'zod';

/**
 * Universal Financial Account model to handle different financial systems globally
 */

// Base interface for common financial account properties
export interface BaseFinancialAccount {
  id: string;                // Unique identifier for the financial account
  accountName: string;       // Display name for the account
  accountType: string;       // e.g., "bank_account", "e-wallet", "crypto_wallet", "investment_account"
  accountSubtype?: string;   // More specific classification
  currency: string;          // ISO currency code (e.g., USD, NGN, EUR)
  mask?: string;             // Last 4 digits or other masked representation
  balances: {
    available: number | null;
    current: number | null;
    limit?: number | null;
    iso_currency_code: string;
  };
  status: 'active' | 'inactive' | 'pending' | 'frozen';
  institution: FinancialInstitution;
  metadata?: Record<string, any>; // Additional provider-specific data
}

// Financial institution information
export interface FinancialInstitution {
  id: string;                 // Institution identifier
  name: string;               // Institution name
  type: string;               // e.g., "bank", "fintech", "exchange", "payment_processor"
  logo?: string;              // URL to institution logo
  primary_color?: string;     // Brand color
  country: string;            // ISO country code
  url?: string;               // Website URL
}

// Region-specific account details
export interface RegionalAccountDetails {
  routingNumber?: string;     // US routing number
  accountNumber?: string;     // Account number
  iban?: string;              // International Bank Account Number (Europe)
  bic?: string;               // Bank Identifier Code / SWIFT (International)
  sortCode?: string;          // UK sort code
  bsb?: string;               // Bank/State/Branch code (Australia)
  branchCode?: string;        // Branch code for countries that use it
  bankCode?: string;          // Bank code for countries that use it
  clabe?: string;             // CLABE (Mexico)
  ifsc?: string;              // IFSC code (India)
  taxNumber?: string;         // Tax identification in some countries
}

/**
 * Universal name structure that handles different naming conventions globally
 */
export interface PersonName {
  givenName?: string;         // First/given name
  middleName?: string;        // Middle name(s)
  familyName?: string;        // Last/family name
  fullName: string;           // Full name as it should be displayed
  prefix?: string;            // Dr., Mr., Ms., etc.
  suffix?: string;            // Jr., Sr., II, III, etc.
  legalName?: string;         // Full legal name as it appears on identification
  preferredName?: string;     // Name the person prefers to be called
  // Support for cultures with different naming structures
  alternateNameFormats?: {
    localLanguageFormat?: string; // Name in local language/script
    romanizedFormat?: string;     // Romanized version of name
    patronymic?: string;          // Patronymic name (e.g., Russian, Nordic)
    matronymic?: string;          // Matronymic name
  };
}

/**
 * Universal address structure that handles different address formats globally
 */
export interface Address {
  addressLine1: string;      // Street address, PO box
  addressLine2?: string;     // Apartment, suite, unit, building
  addressLine3?: string;     // Additional address information
  city: string;              // City/Town/Village
  region?: string;           // State/Province/Region
  postalCode?: string;       // ZIP/Postal code
  country: string;           // ISO country code

  // Additional address information
  formattedAddress?: string; // Full formatted address according to local conventions
  addressType?: 'residential' | 'business' | 'mailing' | 'shipping' | 'billing';
  validFrom?: string;        // ISO date when this address became valid
  validUntil?: string;       // ISO date until when this address is valid

  // Address verification status
  verified?: boolean;
  verificationMethod?: string;
  verificationDate?: string; // ISO date
}

/**
 * Identification document information
 */
export interface IdentificationDocument {
  type: 'passport' | 'national_id' | 'drivers_license' | 'residence_permit' | 'tax_id' | 'voter_id' | 'other';
  otherType?: string;        // If type is 'other'
  number: string;            // Document number
  issuingCountry: string;    // ISO country code
  issuingAuthority?: string; // Name of issuing authority
  issueDate?: string;        // ISO date
  expiryDate?: string;       // ISO date

  // Verification status
  verified?: boolean;
  verificationMethod?: string[];  // Methods used for verification
  verificationDate?: string;      // ISO date
  verificationProvider?: string;  // Provider used for verification

  // Document data
  documentImageFront?: string;    // URL or reference to image
  documentImageBack?: string;     // URL or reference to image
  documentData?: Record<string, any>; // Additional document-specific data
}

/**
 * Business entity information
 */
export interface BusinessEntity {
  legalName: string;           // Legal business name
  tradingName?: string;        // DBA (Doing Business As) name
  registrationNumber?: string; // Business registration number
  taxId?: string;              // Tax identification number
  formationDate?: string;      // ISO date
  formationCountry: string;    // ISO country code
  entityType: string;          // LLC, Corporation, Partnership, etc.
  industryCode?: string;       // NAICS, SIC, or other industry classification
  website?: string;            // Business website URL

  // Contact information
  address: Address;            // Primary business address
  additionalAddresses?: Address[]; // Other business locations
  phoneNumber?: string;        // Primary contact number
  emailAddress?: string;       // Primary contact email

  // Ownership information
  ultimateBeneficialOwners?: PersonInfo[]; // Persons who own/control the entity

  // Verification status
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationDate?: string;   // ISO date
  registryCheckPerformed?: boolean;
  businessDocuments?: Array<{
    type: string;
    url?: string;
    verified: boolean;
    verificationDate?: string; // ISO date
  }>;
}

/**
 * Person information
 */
export interface PersonInfo {
  name: PersonName;
  dateOfBirth?: string;       // ISO date format
  placeOfBirth?: {
    city?: string;
    country: string;          // ISO country code
  };
  nationality?: string[];     // ISO country codes for citizenships
  residency?: string;         // ISO country code for country of residence

  // Contact information
  emailAddress?: string;
  phoneNumber?: string;
  addresses?: {
    primary: Address;
    mailing?: Address;
    additional?: Address[];
  };

  // Identity documents
  identificationDocuments?: IdentificationDocument[];

  // For business representatives or owners
  title?: string;             // Official title/position
  ownershipPercentage?: number; // For business owners
  relationshipToEntity?: string; // Director, Officer, Representative, etc.

  // PEP (Politically Exposed Person) status
  pepStatus?: boolean;
  pepDetails?: string;

  // Tax residency information
  taxResidencies?: Array<{
    country: string;          // ISO country code
    taxId?: string;           // Tax ID in that country
    verified?: boolean;
  }>;
}

/**
 * KYC verification information
 */
export interface KycVerification {
  overallStatus: 'not_started' | 'in_progress' | 'verified' | 'rejected';
  updatedAt: string;          // ISO date of last status update

  // Provider information
  providers: Array<{
    name: string;             // Onfido, SumSub, etc.
    referenceId: string;      // ID of verification with this provider
    status: 'pending' | 'approved' | 'rejected';
    submittedAt?: string;     // ISO date
    completedAt?: string;     // ISO date
    reportUrl?: string;       // URL to verification report
    checks: Array<{
      type: string;           // 'identity', 'document', 'facial_recognition', 'aml', 'pep', etc.
      status: 'pending' | 'approved' | 'rejected';
      details?: string;
    }>;
  }>;

  // Risk assessment
  riskLevel?: 'low' | 'medium' | 'high';
  riskAssessmentMethod?: string;

  // AML (Anti-Money Laundering) screening
  amlScreening?: {
    performed: boolean;
    provider?: string;
    status?: 'clear' | 'flagged';
    lastCheckedAt?: string;   // ISO date
    hits?: Array<{
      listType: string;       // Sanction list, PEP list, etc.
      matchDetails: string;
      source: string;
    }>;
  };

  // Ongoing monitoring configuration
  continuousMonitoring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    providers: string[];      // List of monitoring providers
  };
}

/**
 * Complete account holder information
 */
export interface AccountHolder {
  id: string;                 // Unique identifier
  type: 'individual' | 'business';

  // Account holder details (based on type)
  individual?: PersonInfo;
  business?: BusinessEntity;

  // Relationships
  relationships?: Array<{
    id: string;               // ID of related person or entity
    type: string;             // Authorized user, beneficial owner, etc.
    access: string[];         // Permissions/access levels
  }>;

  // KYC verification status
  kyc: KycVerification;

  // Metadata
  createdAt: string;          // ISO date
  updatedAt: string;          // ISO date
  metadata?: Record<string, any>; // Additional data
}

// Payment capabilities available for this account
export interface PaymentCapabilities {
  ach?: {
    enabled: boolean;
    status?: string;
    limits?: {
      min?: number;
      max?: number;
      daily?: number;
      monthly?: number;
    };
  };
  wire?: {
    enabled: boolean;
    swift_code?: string;
    routing_number?: string;
    instructions?: string;
    fees?: {
      amount: number;
      currency: string;
    };
  };
  zelle?: {
    enabled: boolean;
    email?: string;
    phone?: string;
    handle?: string;
  };
  sepa?: {
    enabled: boolean;
    bic?: string;
    iban?: string;
  };
  upi?: {
    enabled: boolean;
    id?: string;
    handle?: string;
  };
  interac?: {
    enabled: boolean;
    email?: string;
  };
  pix?: {
    enabled: boolean;
    key?: string;
    keyType?: string;
  };
}

// Complete financial account model that combines all interfaces
export interface FinancialAccount extends BaseFinancialAccount {
  regionalDetails: RegionalAccountDetails;
  accountHolder?: AccountHolder;
  paymentCapabilities: PaymentCapabilities;
  paymentMethodTypes?: string[]; // Array of unique payment method identifiers (e.g., ['zelle_USD', 'bank_transfer_EUR'])

  // Connectivity information
  connectivity: {
    provider: string;         // "plaid", "mono", "truelayer", etc.
    providerId: string;       // Provider-specific account ID
    lastSynced: string;       // ISO date
    syncStatus: 'connected' | 'disconnected' | 'error';
    error?: string;
    accessToken?: string;     // Provider-specific access token (should not be exposed to client)
    consentExpiresAt?: string; // When the user's consent to access the account expires
  };
}

// Provider-specific financial account connection response
export interface FinancialAccountConnectionResponse {
  provider: string;           // 'plaid', 'mono', etc.
  connectionId: string;       // Provider-specific connection ID
  accessToken?: string;       // Provider-specific access token
  accounts: FinancialAccount[];    // Accounts obtained from connection
  rawData?: any;              // Raw provider response for debugging
}

// Financial account connection schema for validating connection requests
export const financialAccountConnectionSchema = z.object({
  provider: z.string(),
  userId: z.string(),
  publicToken: z.string().optional(),
  institutionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Provider interface for different account providers
export interface AccountProvider {
  connect(data: z.infer<typeof financialAccountConnectionSchema>): Promise<FinancialAccountConnectionResponse>;
  getStatus(connectionId: string): Promise<any>;
  getAccounts(connectionId: string): Promise<FinancialAccount[]>;
  refreshData?(connectionId: string): Promise<FinancialAccount[]>;
  disconnect?(connectionId: string): Promise<boolean>;
  getAccountHolder?(connectionId: string, accountId: string): Promise<any>;
  updateAccountHolder?(connectionId: string, accountId: string, holderInfo: any): Promise<boolean>;
}

// Helper functions for mapping provider data to our universal model

function mapPlaidAccountToFinancialAccount(plaidAccount: any): FinancialAccount {
  // Implementation would transform Plaid's response format to our universal model
  return {
    id: plaidAccount.account_id || '',
    accountName: plaidAccount.name || '',
    accountType: mapPlaidAccountType(plaidAccount.type || ''),
    accountSubtype: plaidAccount.subtype || '',
    currency: plaidAccount.balances?.iso_currency_code || 'USD',
    mask: plaidAccount.mask || '',
    balances: {
      available: plaidAccount.balances?.available || null,
      current: plaidAccount.balances?.current || null,
      limit: plaidAccount.balances?.limit || null,
      iso_currency_code: plaidAccount.balances?.iso_currency_code || 'USD'
    },
    status: 'active',
    institution: {
      id: plaidAccount.institution_id || '',
      name: plaidAccount.institution_name || '',
      type: 'bank',
      country: 'US', // Plaid is primarily US-focused
      logo: plaidAccount.institution_logo || ''
    },
    regionalDetails: {
      routingNumber: plaidAccount.numbers?.ach?.routing || '',
      accountNumber: plaidAccount.numbers?.ach?.account || '',
    },
    paymentCapabilities: {
      ach: {
        enabled: !!plaidAccount.numbers?.ach,
        status: 'active'
      }
    },
    connectivity: {
      provider: 'plaid',
      providerId: plaidAccount.account_id || '',
      lastSynced: new Date().toISOString(),
      syncStatus: 'connected'
    }
  };
}

function mapTrueLayerDataToFinancialAccount(trueLayerData: any): FinancialAccount {
  // Implementation would transform TrueLayer's response format to our universal model
  return {
    id: trueLayerData.account_id || '',
    accountName: trueLayerData.display_name || '',
    accountType: 'bank_account',
    currency: trueLayerData.currency || 'GBP',
    mask: trueLayerData.account_number?.slice(-4) || '',
    balances: {
      available: trueLayerData.available_balance || null,
      current: trueLayerData.current_balance || null,
      iso_currency_code: trueLayerData.currency || 'GBP'
    },
    status: 'active',
    institution: {
      id: trueLayerData.provider?.provider_id || '',
      name: trueLayerData.provider?.display_name || '',
      type: 'bank',
      country: 'GB',
    },
    regionalDetails: {
      sortCode: trueLayerData.account_identifiers?.sort_code,
      accountNumber: trueLayerData.account_identifiers?.account_number,
      iban: trueLayerData.account_identifiers?.iban
    },
    paymentCapabilities: {
      // Map TrueLayer-specific payment capabilities
    },
    connectivity: {
      provider: 'truelayer',
      providerId: trueLayerData.account_id || '',
      lastSynced: new Date().toISOString(),
      syncStatus: 'connected'
    },
    metadata: trueLayerData
  };
}

// Helper function to map Plaid account types to our universal types
function mapPlaidAccountType(plaidType: string): string {
  switch (plaidType) {
    case 'depository':
      return 'bank_account';
    case 'credit':
      return 'credit_account';
    case 'loan':
      return 'loan_account';
    case 'investment':
      return 'investment_account';
    default:
      return plaidType;
  }
}

export {
  mapPlaidAccountToFinancialAccount,
  mapTrueLayerDataToFinancialAccount,
  mapPlaidAccountType
};