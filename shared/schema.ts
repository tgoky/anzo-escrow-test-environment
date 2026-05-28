import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, jsonb, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Message statuses
export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
} as const;

// Transaction statuses
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELETED: 'deleted',
  SEARCHING: 'searching',
  MATCHED: 'matched', 
  CANCELLED: 'cancelled',
  VERIFICATION: 'verification',
  DISPUTE: 'dispute',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_SENT: 'payment_sent',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  RELEASE_PENDING: 'release_pending',
  FUNDS_RELEASED: 'funds_released'
} as const;

// User risk categories
export const USER_RISK_CATEGORIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

// Admin role types
export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  SUPPORT_ADMIN: 'support_admin',
  DISPUTE_MANAGER: 'dispute_manager',
  FINANCIAL_ADMIN: 'financial_admin',
  READ_ONLY: 'read_only'
} as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  role: text("role").notNull().default(ADMIN_ROLES.READ_ONLY), // Default to read-only access
  permissions: jsonb("permissions"), // Specific permissions as a JSON object
  name: text("name"), // Optional admin name
  email: text("email"), // Optional admin email
  notes: text("notes"), // Optional notes about this admin
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const makers = pgTable("makers", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  riskCategory: text("risk_category").default(USER_RISK_CATEGORIES.MEDIUM), // Default risk level is medium
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }), // Numeric score for risk assessment
  riskFactors: jsonb("risk_factors"), // Details on what factors contribute to risk
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  makerId: integer("maker_id").references(() => makers.id),
  walletAddress: text("wallet_address").notNull(),
  type: text("type").notNull(), // 'buy' | 'sell'
  token: text("token").notNull(),
  fiatCurrency: text("fiat_currency").notNull().default('USD'),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  lockedAmount: decimal("locked_amount", { precision: 18, scale: 8 }).default('0').notNull(), // Amount locked in pending transactions
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  priceType: text("price_type").notNull().default('fixed'), // 'fixed' | 'floating'
  priceMargin: decimal("price_margin", { precision: 6, scale: 2 }), // For floating price (percentage)
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxOrderAmount: decimal("max_order_amount", { precision: 10, scale: 2 }),
  paymentMethods: text("payment_methods").array().notNull(),
  paymentTimeLimit: integer("payment_time_limit").default(15), // In minutes
  remarks: text("remarks"), // Optional seller remarks/instructions
  autoReply: text("auto_reply"), // Auto-reply message to buyer
  availableRegions: text("available_regions").array(), // Array of country codes
  counterpartyConditions: json("counterparty_conditions"), // Min registration days, min holdings, etc.
  status: text("status").notNull().default('active'), // 'active' | 'paused' | 'completed' | 'cancelled'
  visibility: text("visibility").notNull().default('public'), // 'public' | 'private'
  financialAccountId: text("financial_account_id"), // ID of the connected financial account
  makerFinancialAccountDetails: jsonb("maker_financial_account_details"), // Complete financial account details
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const makerPricing = pgTable("maker_pricing", {
  id: serial("id").primaryKey(),
  makerId: integer("maker_id").notNull().references(() => makers.id),
  token: text("token").notNull(),
  markup: decimal("markup", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const makerPaymentInstructions = pgTable("maker_payment_instructions", {
  id: serial("id").primaryKey(),
  makerId: integer("maker_id").notNull().references(() => makers.id),
  instructions: text("instructions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const financialAccounts = pgTable("financial_accounts", {
  id: serial("id").primaryKey(),
  accountId: text("account_id").notNull().unique(),  // Unique identifier for the account
  accountName: text("account_name").notNull(),       // Display name for the account
  accountType: text("account_type").notNull(),       // e.g., 'bank_account', 'mobile_money', 'e-wallet'
  accountSubtype: text("account_subtype"),           // More specific classification
  currency: text("currency").notNull(),              // ISO currency code
  mask: text("mask"),                                // Last 4 digits or masked representation
  balances: jsonb("balances").notNull(),             // Available, current, limit balances
  status: text("status").notNull(),                  // 'active', 'inactive', 'pending'
  institution: jsonb("institution").notNull(),       // Institution details
  regionalDetails: jsonb("regional_details"),        // Region-specific details
  accountHolder: jsonb("account_holder"),            // Account holder details
  paymentCapabilities: jsonb("payment_capabilities").notNull(), // Payment methods
  paymentMethodTypes: text("payment_method_types").array(), // Array of unique payment method types (e.g., 'zelle_USD', 'bank_transfer_EUR')
  paymentMethodId: integer("payment_method_id"),     // Direct reference to primary payment method
  connectivity: jsonb("connectivity").notNull(),     // Connection details
  metadata: jsonb("metadata"),                       // Additional data like walletAddress
  userId: integer("user_id"),                        // Reference to user if applicable
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages table for chat functionality between transaction parties
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id), // Reference to the transaction
  senderAddress: text("sender_address").notNull(), // Wallet address of sender
  receiverAddress: text("receiver_address").notNull(), // Wallet address of receiver
  content: text("content").notNull(), // Message content
  status: text("status").notNull().default(MESSAGE_STATUS.SENT), // Message status
  read: boolean("read").default(false), // Whether message has been read
  systemMessage: boolean("system_message").default(false), // Whether it's a system message
  attachmentUrl: text("attachment_url"), // URL to any attachment
  attachmentType: text("attachment_type"), // Type of attachment (image, payment proof, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Note: We've removed the manualFinancialAccounts table in favor of the unified financialAccounts table
// The transactions table structure allows for optional associations with users and financial accounts

// Payment methods table to standardize payment methods across the platform
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  methodType: varchar("method_type", { length: 50 }).notNull(),  // e.g., 'zelle', 'bank_transfer', 'cash_deposit'
  currency: varchar("currency", { length: 3 }).notNull(),         // ISO currency code
  name: varchar("name", { length: 100 }).notNull(),               // Display name, e.g., 'Zelle', 'Bank Transfer'
  description: text("description"),                               // Optional description
  enabled: boolean("enabled").default(true).notNull(),
  accountType: varchar("account_type", { length: 50 }),          // Type of account this method is linked to
  fields: jsonb("fields").notNull(),                              // Field definitions for the payment method
  supportsCountries: text("supports_countries").array(),          // Array of country codes where this method is available
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Create a unique constraint on methodType and currency to ensure we don't have duplicates
    methodTypeCurrencyKey: unique("method_type_currency_key").on(table.methodType, table.currency),
  }
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  // Transaction type from the perspective of the taker/initiator
  type: text("type").notNull(),  // 'buy' | 'sell'
  status: text("status").notNull().default('pending'), // 'pending' | 'completed' | 'failed' | 'cancelled' | 'searching' | 'matched' | 'verification' | 'dispute'
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull().default('USD'),
  tokenAmount: decimal("token_amount", { precision: 20, scale: 8 }).notNull(),
  token: text("token").notNull(),
  
  // Party Information with clear role designations
  walletAddress: text("wallet_address").notNull(),         // Transaction initiator (legacy, typically the taker)
  counterpartyAddress: text("counterparty_address"),       // Legacy field - use maker/taker wallet address instead
  makerWalletAddress: text("maker_wallet_address"),        // Wallet address of the maker (offer creator)
  takerWalletAddress: text("taker_wallet_address"),        // Wallet address of the taker (transaction initiator)
  
  // Financial accounts and payment methods
  makerFinancialAccount: json("maker_financial_account"),  // JSON object format
  takerFinancialAccount: json("taker_financial_account"),  // JSON object format
  makerPaymentMethod: text("maker_payment_method"),        // Simple text for payment method
  takerPaymentMethod: text("taker_payment_method"),        // Simple text for payment method
  
  // Timestamps for transaction lifecycle
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  timeoutAt: timestamp("timeout_at"),
  paymentConfirmedAt: timestamp("payment_confirmed_at"),   // When payment was confirmed
  receivedConfirmedAt: timestamp("received_confirmed_at"), // When receipt was confirmed
  disputeRaisedAt: timestamp("dispute_raised_at"),         // When a dispute was raised
  disputeResolvedAt: timestamp("dispute_resolved_at"),     // When dispute was resolved
  
  // Verification system (2/3 signers approval)
  makerApproval: boolean("maker_approval").default(false),       // Has maker approved the transaction
  takerApproval: boolean("taker_approval").default(false),       // Has taker approved the transaction
  platformApproval: boolean("platform_approval").default(false), // Has platform (us) approved
  platformApprovalReason: text("platform_approval_reason"),      // Reason for platform approval decision

  // Evidence and documentation
  paymentEvidence: json("payment_evidence"),               // Evidence of payment (URLs to screenshots, etc.)
  disputeReason: text("dispute_reason"),                   // Reason for dispute
  disputeEvidence: json("dispute_evidence"),               // Evidence in case of dispute
  failureReason: text("failure_reason"),                   // Reason for failure
  
  // Relationships
  makerId: integer("maker_id").references(() => makers.id),
  offerId: integer("offer_id").references(() => offers.id),
  countryCode: text("country_code"),
  userId: integer("user_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAdminSchema = createInsertSchema(admins)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    role: z.enum([
      ADMIN_ROLES.SUPER_ADMIN,
      ADMIN_ROLES.SUPPORT_ADMIN,
      ADMIN_ROLES.DISPUTE_MANAGER,
      ADMIN_ROLES.FINANCIAL_ADMIN, 
      ADMIN_ROLES.READ_ONLY
    ]).default(ADMIN_ROLES.READ_ONLY),
    permissions: z.record(z.any()).nullable().optional(),
  });

export const insertMakerSchema = createInsertSchema(makers)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    riskCategory: z.enum([
      USER_RISK_CATEGORIES.LOW,
      USER_RISK_CATEGORIES.MEDIUM,
      USER_RISK_CATEGORIES.HIGH
    ]).default(USER_RISK_CATEGORIES.MEDIUM),
    riskScore: z.number().min(0).max(100).optional(),
    riskFactors: z.record(z.any()).nullable().optional(),
  });

export const insertOfferSchema = createInsertSchema(offers)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    amount: z.string().or(z.number()).transform(val => String(val)),
    lockedAmount: z.string().or(z.number()).transform(val => String(val)).default('0'),
    price: z.string().or(z.number()).transform(val => String(val)),
    priceMargin: z.string().or(z.number()).nullish().transform(val => val ? String(val) : null),
    minOrderAmount: z.string().or(z.number()).nullish().transform(val => val ? String(val) : null),
    maxOrderAmount: z.string().or(z.number()).nullish().transform(val => val ? String(val) : null),
    paymentMethods: z.array(z.string().min(1, "Payment method cannot be empty")).min(1, "At least one payment method is required"),
    availableRegions: z.array(z.string()).optional(),
    counterpartyConditions: z.record(z.any()).or(z.null()).optional(),
    fiatCurrency: z.string().default('USD'),
    priceType: z.enum(['fixed', 'floating']).default('fixed'),
    paymentTimeLimit: z.number().optional().default(15),
    remarks: z.string().optional(),
    autoReply: z.string().optional(),
    visibility: z.enum(['public', 'private']).default('public'),
    financialAccountId: z.string().optional(), // ID of the connected financial account
    makerFinancialAccountDetails: z.union([
      z.string().transform(val => {
        try { return typeof val === 'string' ? JSON.parse(val) : val; } 
        catch (e) { return null; }
      }),
      z.record(z.any()),
      z.null()
    ]).optional() // Complete financial account object
  });

export const insertMakerPricingSchema = createInsertSchema(makerPricing)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertMakerPaymentInstructionsSchema = createInsertSchema(makerPaymentInstructions)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Create insert schema for payment methods
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    methodType: z.string().min(1, "Method type cannot be empty"),
    currency: z.string().length(3, "Currency must be a 3-letter ISO code"),
    name: z.string().min(1, "Name cannot be empty"),
    description: z.string().optional(),
    enabled: z.boolean().default(true),
    accountType: z.enum(['bank_account', 'e-wallet', 'mobile_money', 'crypto_wallet', 'cash']).optional(),
    fields: z.union([
      z.string().transform(val => {
        try { return typeof val === 'string' ? JSON.parse(val) : val; }
        catch (e) { return []; }
      }),
      z.array(z.object({
        name: z.string(),
        label: z.string(),
        type: z.string(),
        required: z.boolean(),
        description: z.string().optional(),
        validation: z.string().optional(),
        copyable: z.boolean().optional(),
        position: z.number().optional()
      })),
    ]),
    supportsCountries: z.array(z.string()).optional()
  });

// Create insert schema for financial accounts
export const insertFinancialAccountSchema = createInsertSchema(financialAccounts)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    paymentMethodId: z.number().int().positive().nullable().optional(),
  });

// Debug log the schema structure
console.log('📊 SCHEMA: Financial Account Insert Schema:', 
  JSON.stringify(insertFinancialAccountSchema.shape, null, 2));

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .merge(z.object({
    timeoutAt: z.string().transform((val) => {
      try {
        console.log("⏰ Parsing timeoutAt:", val);
        return new Date(val);
      } catch (error) {
        console.error("❌ Error parsing timeoutAt:", error);
        return null;
      }
    }),
    amount: z.string().or(z.number()).transform(val => {
      console.log("💰 Transforming amount:", val, typeof val);
      if (typeof val === 'string') {
        return val.replace(/,/g, '');
      }
      return String(val);
    }),
    currency: z.string().default('USD'),
    tokenAmount: z.string().or(z.number()).transform(val => {
      console.log("🪙 Transforming tokenAmount:", val, typeof val);
      if (typeof val === 'string') {
        return val.replace(/,/g, '');
      }
      return String(val);
    }),
    makerFinancialAccount: z.union([
      z.string().transform((val) => {
        try {
          return typeof val === 'string' ? JSON.parse(val) : val;
        } catch (e) {
          console.error("❌ Failed to parse makerFinancialAccount:", e);
          return null;
        }
      }),
      z.record(z.any()),
      z.null(),
      z.array(z.string())
    ]).optional(),
    takerFinancialAccount: z.union([
      z.string().transform((val) => {
        try {
          console.log("🔍 Parsing takerFinancialAccount:", val);
          return typeof val === 'string' ? JSON.parse(val) : val;
        } catch (e) {
          console.error("❌ Failed to parse takerFinancialAccount:", e);
          return null;
        }
      }),
      z.record(z.any()),
      z.null(),
      z.array(z.string())
    ]).optional(),
    makerPaymentMethod: z.string().optional(),
    takerPaymentMethod: z.string().optional(),
    countryCode: z.string().optional(),
    offerId: z.number().optional(),
    makerWalletAddress: z.string().optional(),
    takerWalletAddress: z.string().optional(),
    
    // For matching functionality
    allowSelfMatch: z.boolean().optional().default(false), // Allow matching with your own offers (for testing)
    
    // New verification fields
    paymentConfirmedAt: z.string().or(z.date()).optional().nullable(),
    receivedConfirmedAt: z.string().or(z.date()).optional().nullable(),
    disputeRaisedAt: z.string().or(z.date()).optional().nullable(),
    disputeResolvedAt: z.string().or(z.date()).optional().nullable(),
    
    // Approval fields
    makerApproval: z.boolean().optional().default(false),
    takerApproval: z.boolean().optional().default(false),
    platformApproval: z.boolean().optional().default(false),
    platformApprovalReason: z.string().optional().nullable(),
    
    // Evidence fields
    paymentEvidence: z.union([
      z.string().transform(val => {
        try { return JSON.parse(val); } 
        catch (e) { return null; }
      }),
      z.record(z.any()),
      z.array(z.any()),
      z.null()
    ]).optional(),
    disputeReason: z.string().optional().nullable(),
    disputeEvidence: z.union([
      z.string().transform(val => {
        try { return JSON.parse(val); } 
        catch (e) { return null; }
      }),
      z.record(z.any()),
      z.array(z.any()),
      z.null()
    ]).optional()
  }));

// Create insert schema for messages
export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    content: z.string().min(1, "Message content cannot be empty"),
    status: z.enum([
      MESSAGE_STATUS.SENT, 
      MESSAGE_STATUS.DELIVERED, 
      MESSAGE_STATUS.READ, 
      MESSAGE_STATUS.FAILED
    ]).default(MESSAGE_STATUS.SENT),
    systemMessage: z.boolean().default(false),
    read: z.boolean().default(false),
    attachmentUrl: z.string().optional().nullable(),
    attachmentType: z.string().optional().nullable(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Maker = typeof makers.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type MakerPricing = typeof makerPricing.$inferSelect;
export type MakerPaymentInstructions = typeof makerPaymentInstructions.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type FinancialAccountDB = typeof financialAccounts.$inferSelect;
export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;