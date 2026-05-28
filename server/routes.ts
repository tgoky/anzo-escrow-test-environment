import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, insertOfferSchema, Offer, InsertTransaction, transactions, financialAccounts, USER_RISK_CATEGORIES } from "@shared/schema";
import { ZodError } from "zod";
import { Router } from 'express';
import express from 'express';
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import type { FinancialAccount, FinancialInstitution, PaymentCapabilities } from "@shared/types/financial-account";
import { getRiskProfile, updateRiskProfile, calculateRiskScore } from "./routes/risk-profile";

/**
 * Find the best matching offer for a transaction based on:
 * 1. Type (buy/sell)
 * 2. Token
 * 3. Amount (within offer min/max if specified)
 * 4. Payment method (if specified)
 * 5. Price (best price first)
 */
async function findMatchingOffer(transactionData: any): Promise<Offer | null> {
  try {
    console.log(`\n======= MATCHING ENGINE: TRANSACTION ID ${transactionData.id} =======`);
    console.log(`🔍 MATCHING: Finding offers for ${transactionData.type} transaction`);
    console.log(`🔍 MATCHING: Token: ${transactionData.token}`);
    console.log(`🔍 MATCHING: Amount: ${transactionData.amount} ${transactionData.currency}`);
    console.log(`🔍 MATCHING: Taker wallet: ${transactionData.walletAddress}`);
    console.log(`🔍 MATCHING: Payment method: ${transactionData.takerPaymentMethod || 'Any'}`);
    console.log(`🔍 MATCHING: Self-match allowed: ${transactionData.allowSelfMatch ? 'Yes' : 'No'}`);

    // Determine offer type based on transaction type
    // If transaction type is 'buy', we need to find a 'sell' offer and vice versa
    const offerType = transactionData.type === 'buy' ? 'sell' : 'buy';
    console.log(`🔍 MATCHING: Looking for ${offerType.toUpperCase()} offers`);
    
    // Get all active offers that match the token
    const offers = await storage.getActiveOffers(offerType, transactionData.token, transactionData.currency);
    
    if (!offers || offers.length === 0) {
      console.log(`❌ MATCHING: No active ${offerType} offers found for token: ${transactionData.token}`);
      console.log(`======= MATCHING ENGINE: RESULT = NO MATCH =======\n`);
      return null;
    }
    
    console.log(`✅ MATCHING: Found ${offers.length} potential matching offers`);
    
    // Print offer details for debugging
    offers.forEach((offer, index) => {
      console.log(`  Offer #${index + 1}:`);
      console.log(`    ID: ${offer.id}, Type: ${offer.type}, Token: ${offer.token}`);
      console.log(`    Price: ${offer.price} ${offer.fiatCurrency || 'USD'}`);
      console.log(`    Amount: ${offer.amount}, Min: ${offer.minOrderAmount || 'N/A'}, Max: ${offer.maxOrderAmount || 'N/A'}`);
      console.log(`    Maker: ${offer.walletAddress}`);
      console.log(`    Payment methods: ${Array.isArray(offer.paymentMethods) ? offer.paymentMethods.join(', ') : 'None'}`);
      console.log(`    Financial account ID: ${offer.financialAccountId || 'None'}`);
    });
    
    // Filter offers based on payment method if specified
    let filteredOffers = offers;
    if (transactionData.takerPaymentMethod) {
      console.log(`🔍 MATCHING: Filtering by payment method: ${transactionData.takerPaymentMethod}`);
      
      // Define a function to parse payment method IDs
      function parseUniquePaymentMethodId(uniqueId: string): { methodType: string; currency: string } | null {
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
      
      // Extract currency from transaction data
      const transactionCurrency = transactionData.currency || 'USD';
      
      // Check if the taker payment method is already in the unique format (e.g., zelle_USD)
      const parsedTakerMethod = parseUniquePaymentMethodId(transactionData.takerPaymentMethod);
      const takerMethodType = parsedTakerMethod ? parsedTakerMethod.methodType : transactionData.takerPaymentMethod;
      const takerMethodCurrency = parsedTakerMethod ? parsedTakerMethod.currency : transactionCurrency;
      
      // If we have a parsed method, use it directly; otherwise, construct the unique ID
      const uniqueTakerPaymentMethod = parsedTakerMethod 
        ? transactionData.takerPaymentMethod 
        : `${takerMethodType}_${takerMethodCurrency}`;
      
      console.log(`🔍 MATCHING: Using unique payment method ID: ${uniqueTakerPaymentMethod}`);
      
      filteredOffers = offers.filter(offer => {
        // Check if offer's payment methods list contains the unique payment method ID
        let hasPaymentMethod = false;
        
        if (Array.isArray(offer.paymentMethods)) {
          // First, try direct matching with uniqueTakerPaymentMethod (e.g., "zelle_USD")
          hasPaymentMethod = offer.paymentMethods.includes(uniqueTakerPaymentMethod);
          
          // If no match, check if any offer payment methods can be parsed and matched by their components
          if (!hasPaymentMethod) {
            for (const method of offer.paymentMethods) {
              const parsedOfferMethod = parseUniquePaymentMethodId(method);
              
              // If we can parse it as unique ID
              if (parsedOfferMethod) {
                // Match if method types are the same and currencies match
                if (parsedOfferMethod.methodType === takerMethodType && 
                    parsedOfferMethod.currency === takerMethodCurrency) {
                  hasPaymentMethod = true;
                  break;
                }
              } else if (method === takerMethodType) {
                // Legacy support: if offer just has method type without currency
                // and it matches the taker's method type, consider it a match
                hasPaymentMethod = true;
                break;
              }
            }
          }
        }
        
        if (!hasPaymentMethod) {
          console.log(`    Offer ${offer.id}: Payment method ${uniqueTakerPaymentMethod} not supported ❌`);
          console.log(`    Offer ${offer.id} payment methods: ${offer.paymentMethods?.join(', ') || 'None'}`);
        } else {
          console.log(`    Offer ${offer.id}: Payment method ${uniqueTakerPaymentMethod} supported ✅`);
        }
        
        return hasPaymentMethod;
      });
      
      console.log(`✅ MATCHING: After payment method filter: ${filteredOffers.length} offers remain`);
      
      // If no offers match the requested payment method, fall back to all offers
      if (filteredOffers.length === 0) {
        console.log(`⚠️ MATCHING: No offers match the requested payment method, falling back to all offers`);
        filteredOffers = offers;
      }
    }
    
    // Filter offers based on amount
    console.log(`🔍 MATCHING: Filtering by amount: ${transactionData.amount} ${transactionData.currency}`);
    const transactionAmount = parseFloat(transactionData.amount.toString());
    
    filteredOffers = filteredOffers.filter(offer => {
      const minAmount = offer.minOrderAmount ? parseFloat(offer.minOrderAmount.toString()) : 0;
      const maxAmount = offer.maxOrderAmount ? parseFloat(offer.maxOrderAmount.toString()) : parseFloat(offer.amount.toString());
      const offerAmount = parseFloat(offer.amount.toString());
      
      // Check minimum order amount if specified
      if (minAmount > 0 && transactionAmount < minAmount) {
        console.log(`    Offer ${offer.id}: Transaction amount ${transactionAmount} below minimum ${minAmount} ❌`);
        return false;
      }
      
      // Check maximum order amount if specified
      if (maxAmount > 0 && transactionAmount > maxAmount) {
        console.log(`    Offer ${offer.id}: Transaction amount ${transactionAmount} above maximum ${maxAmount} ❌`);
        return false;
      }
      
      // Check if offer has enough remaining amount
      if (offerAmount < transactionAmount) {
        console.log(`    Offer ${offer.id}: Insufficient offer amount ${offerAmount} < ${transactionAmount} ❌`);
        return false;
      }
      
      console.log(`    Offer ${offer.id}: Amount criteria met ✅`);
      return true;
    });
    
    console.log(`✅ MATCHING: After amount filter: ${filteredOffers.length} offers remain`);
    
    if (filteredOffers.length === 0) {
      console.log(`❌ MATCHING: No offers match the amount criteria`);
      console.log(`======= MATCHING ENGINE: RESULT = NO MATCH =======\n`);
      return null;
    }
    
    // Filter out offers from the same wallet address (can't match with yourself)
    // Unless specifically requested for testing
    console.log(`🔍 MATCHING: Checking wallet compatibility`);
    if (!transactionData.allowSelfMatch) {
      console.log(`🔍 MATCHING: Self-matching NOT allowed, filtering own offers`);
      
      filteredOffers = filteredOffers.filter(offer => {
        const isSelfMatch = offer.walletAddress === transactionData.walletAddress;
        
        if (isSelfMatch) {
          console.log(`    Offer ${offer.id}: Self-match rejected, same wallet address ❌`);
        } else {
          console.log(`    Offer ${offer.id}: Different wallet address ✅`);
        }
        
        return !isSelfMatch;
      });
      
      console.log(`✅ MATCHING: After wallet filter: ${filteredOffers.length} offers remain`);
      
      if (filteredOffers.length === 0) {
        console.log(`❌ MATCHING: No offers from different wallets found`);
        console.log(`======= MATCHING ENGINE: RESULT = NO MATCH =======\n`);
        return null;
      }
    } else {
      console.log(`⚠️ MATCHING: Self-matching is ALLOWED for this transaction`);
      
      // Log which offers are self-matches
      filteredOffers.forEach(offer => {
        const isSelfMatch = offer.walletAddress === transactionData.walletAddress;
        console.log(`    Offer ${offer.id}: ${isSelfMatch ? 'Self-match allowed ⚠️' : 'Different wallet ✅'}`);
      });
    }
    
    // Sort offers by price (best price first)
    // For buy transactions, lower price is better
    // For sell transactions, higher price is better
    console.log(`🔍 MATCHING: Sorting offers by price (${transactionData.type === 'buy' ? 'lowest first' : 'highest first'})`);
    
    filteredOffers.sort((a, b) => {
      const priceA = parseFloat(a.price.toString());
      const priceB = parseFloat(b.price.toString());
      
      if (transactionData.type === 'buy') {
        return priceA - priceB; // Lower price first for buy
      } else {
        return priceB - priceA; // Higher price first for sell
      }
    });
    
    // Log sorted offers
    console.log(`✅ MATCHING: Offers after sorting by price:`);
    filteredOffers.forEach((offer, index) => {
      console.log(`    Rank ${index + 1}: Offer ${offer.id}, Price: ${offer.price} ${offer.fiatCurrency || 'USD'}`);
    });
    
    // Return the best matching offer (first after sorting)
    if (filteredOffers.length > 0) {
      const bestMatch = filteredOffers[0];
      
      console.log(`\n✅ MATCHING: BEST MATCH FOUND:`);
      console.log(`    Offer ID: ${bestMatch.id}`);
      console.log(`    Type: ${bestMatch.type}`);
      console.log(`    Token: ${bestMatch.token}`);
      console.log(`    Price: ${bestMatch.price} ${bestMatch.fiatCurrency || 'USD'}`);
      console.log(`    Amount: ${bestMatch.amount}`);
      console.log(`    Maker wallet: ${bestMatch.walletAddress}`);
      console.log(`    Payment methods: ${Array.isArray(bestMatch.paymentMethods) ? bestMatch.paymentMethods.join(', ') : 'None'}`);
      console.log(`    Financial account ID: ${bestMatch.financialAccountId || 'None'}`);
      console.log(`======= MATCHING ENGINE: RESULT = MATCH FOUND =======\n`);
      
      return bestMatch;
    }
    
    console.log(`❌ MATCHING: No suitable match found after all filtering`);
    console.log(`======= MATCHING ENGINE: RESULT = NO MATCH =======\n`);
    return null;
  } catch (error) {
    console.error(`❌ MATCHING ERROR: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    console.log(`======= MATCHING ENGINE: RESULT = ERROR =======\n`);
    return null;
  }
}

// Import manual account routes
import { 
  createManualAccount, 
  getManualAccounts, 
  getManualAccountById,
  updatePaymentMethods, 
  deleteManualAccount,
  getPaymentMethodOptions,
  getFormattedPaymentMethodDetails,
  getPaymentInstructions
} from './routes/manual-accounts';

// Import new offer routes
import {
  createOffer,
  getOfferById,
  getOffersByWallet,
  getActiveOffers,
  updateOfferStatus,
  updateOfferAmount,
  updateOfferVisibility,
  deleteOffer,
  getPendingTransactionsByOfferId
} from './routes/offers';

// Import transaction verification routes
import {
  updateTransactionApproval,
  addPaymentEvidence,
  raiseDispute,
  getTransactionsByOfferId
} from './routes/transaction-verification';

// Import message routes
import {
  getMessagesByTransactionId,
  sendMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
  getUnreadMessageCountsByTransactions,
  sendSystemMessage
} from './routes/messages';

// Import admin routes
import {
  adminMiddleware,
  roleMiddleware,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  setAdminStatus,
  getAdminByWallet,
  checkAdminStatus,
  initializeDefaultAdmin,
  getAllTransactions,
  getPlatformStats,
  updateTransactionStatus,
  resolveDispute
} from './routes/admin';

// Import admin financial account routes
import {
  getAllFinancialAccounts,
  getFinancialAccountById,
  updateFinancialAccountStatus,
  updateFinancialAccountPaymentCapabilities,
  deleteFinancialAccount,
  getAvailableCurrencyPaymentMethods,
  getFinancialAccountStats
} from './routes/admin-financial-accounts';

// Import admin payment method configuration routes
import {
  getSupportedCurrencies,
  getPaymentMethodsByCurrency as getAdminPaymentMethodsByCurrency,
  getPaymentMethod as getAdminPaymentMethod,
  updatePaymentMethod as updateAdminPaymentMethod,
  togglePaymentMethod as toggleAdminPaymentMethod,
  getPaymentMethodCountries,
  deletePaymentMethod as deleteAdminPaymentMethod,
  createPaymentMethod as createAdminPaymentMethod
} from './routes/admin-payment-methods';

// Import the new payment methods endpoints
import {
  getAllPaymentMethods,
  getPaymentMethodsByCurrency,
  getPaymentMethodById,
  getPaymentMethodByTypeAndCurrency,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethod,
  migrateFileBasedPaymentMethods
} from './routes/payment-methods';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test route for currencies API
router.get('/test-currencies', async (req, res) => {
  try {
    console.log('🧪 Testing currencies API directly');
    
    // Import the countries data from the shared module
    const { countries } = await import('../client/src/lib/countries');
    
    // Extract unique currencies from the countries list
    const uniqueCurrencies = Array.from(new Set(countries.map(country => country.currency)));
    
    // Sort currencies alphabetically
    const sortedCurrencies = uniqueCurrencies.sort();
    
    console.log(`✅ Test API: Found ${sortedCurrencies.length} currencies:`, sortedCurrencies);
    res.json({
      count: sortedCurrencies.length,
      currencies: sortedCurrencies
    });
  } catch (error) {
    console.error('❌ Test API Error:', error);
    res.status(500).json({ message: 'Test API failed', error: String(error) });
  }
});

// API routes
router.get('/makers', (req, res) => {
  res.json([
    { id: 1, name: 'Maker 1', fee: 0.01 },
    { id: 2, name: 'Maker 2', fee: 0.02 },
    { id: 3, name: 'Maker 3', fee: 0.03 }
  ]);
});

// Add a dedicated endpoint to get a transaction by ID
// This must be defined BEFORE the wallet route to avoid route conflicts
router.get('/transactions/by-id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transactionId = Number(id);
    
    if (isNaN(transactionId)) {
      console.log("❌ API: Invalid transaction ID format:", id);
      return res.status(400).json({ message: "Invalid transaction ID" });
    }
    
    console.log("🔍 API: Fetching transaction by ID:", transactionId);
    const transaction = await storage.getTransactionById(transactionId);
    
    if (!transaction) {
      console.log(`❌ Transaction not found with ID: ${transactionId}`);
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    console.log(`✅ Found transaction by ID: ${transactionId}`);
    return res.json(transaction);
  } catch (error) {
    console.error("❌ API Transaction fetch error:", error);
    return res.status(500).json({ 
      message: "Failed to fetch transaction",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Fetch transactions by wallet address (separate distinct endpoint)
router.get('/transactions/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    console.log("🔍 API: Fetching transactions for wallet:", walletAddress);

    if (!walletAddress) {
      console.log("❌ API: Missing wallet address");
      return res.status(400).json({ message: "Wallet address is required" });
    }

    // Get transactions for this wallet address
    const transactions = await storage.getTransactionsByWallet(walletAddress);
    console.log(`✅ Found ${transactions.length} transactions for wallet ${walletAddress}`);

    return res.json(transactions);
  } catch (error) {
    console.error("❌ API Transaction fetch error:", error);
    return res.status(500).json({ 
      message: "Failed to fetch transactions",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post("/transactions", async (req, res) => {
  try {
    console.log("📝 Transaction creation request received");
    console.log("📝 Request body:", JSON.stringify(req.body, null, 2));
    
    // Make a deep copy of the request body to avoid modifying the original
    const body = JSON.parse(JSON.stringify(req.body));
    
    console.log("🔍 Processing takerFinancialAccount");
    // Handle the takerFinancialAccount field - convert to proper JSON if needed
    if (body.takerFinancialAccount) {
      try {
        // If it's already an object, no need to parse
        if (typeof body.takerFinancialAccount === 'string') {
          console.log("🔄 Converting takerFinancialAccount from string to object");
          body.takerFinancialAccount = JSON.parse(body.takerFinancialAccount);
        } else {
          console.log("✅ takerFinancialAccount is already an object");
        }
      } catch (e) {
        console.error("❌ Failed to parse takerFinancialAccount:", e);
        console.error("⚠️ Original value:", body.takerFinancialAccount);
        // Don't throw yet, let the schema validation handle this
      }
    }
    
    console.log("🔍 Processing makerFinancialAccount");
    // Handle the makerFinancialAccount field - convert to proper JSON if needed
    if (body.makerFinancialAccount) {
      try {
        // If it's already an object, no need to parse
        if (typeof body.makerFinancialAccount === 'string') {
          console.log("🔄 Converting makerFinancialAccount from string to object");
          body.makerFinancialAccount = JSON.parse(body.makerFinancialAccount);
        } else {
          console.log("✅ makerFinancialAccount is already an object");
        }
      } catch (e) {
        console.error("❌ Failed to parse makerFinancialAccount:", e);
        console.error("⚠️ Original value:", body.makerFinancialAccount);
        // Don't throw yet, let the schema validation handle this
      }
    }
    
    // Validate the transaction data
    console.log("📊 Validating transaction data");
    console.log("📊 Body data to validate:", JSON.stringify(body, null, 2));
    
    try {
      const transactionData = insertTransactionSchema.parse(body);
      console.log("✅ Transaction data validated successfully");
      console.log("✅ Validated data:", JSON.stringify(transactionData, null, 2));
      
      // Check for self-matching flag for testing purposes
      console.log("🔍 Checking for allowSelfMatch flag:", body.allowSelfMatch);
      const allowSelfMatch = body.allowSelfMatch === true;
      if (allowSelfMatch) {
        console.log("⚠️ Self-matching is enabled for this transaction (testing mode)");
      }
      
      // Prepare the matching data with allowSelfMatch flag
      const transactionForMatching = {
        ...transactionData,
        allowSelfMatch: allowSelfMatch
      };
      
      console.log(`🔍 TRANSACTION FLOW: Looking for matching offer with criteria:`);
      console.log(`- Type: ${transactionData.type}`);
      console.log(`- Token: ${transactionData.token}`);
      console.log(`- Amount: ${transactionData.amount} ${transactionData.currency}`);
      console.log(`- Payment Method: ${transactionData.takerPaymentMethod || 'Any'}`);
      console.log(`- Self-match allowed: ${allowSelfMatch}`);
      
      // Find an appropriate offer for this transaction
      const matchedOffer = await findMatchingOffer(transactionForMatching);
      
      // If we found a matching offer, update the transaction data
      if (matchedOffer) {
        console.log(`✅ TRANSACTION FLOW: Found matching offer #${matchedOffer.id}`);
        console.log(`- Offer type: ${matchedOffer.type}`);
        console.log(`- Token: ${matchedOffer.token}`);
        console.log(`- Price: ${matchedOffer.price} ${matchedOffer.fiatCurrency || 'USD'}`);
        console.log(`- Maker wallet: ${matchedOffer.walletAddress}`);
        console.log(`- Payment methods: ${JSON.stringify(matchedOffer.paymentMethods || [])}`);
        console.log(`- Financial account ID: ${matchedOffer.financialAccountId || 'None'}`);
        
        // Update transaction with offer information
        transactionData.offerId = matchedOffer.id;
        transactionData.status = 'matched';
        transactionData.counterpartyAddress = matchedOffer.walletAddress;
        
        // CRITICAL: Set the maker wallet address to the wallet address of the offer creator
        // This ensures proper maker/taker role determination regardless of who initiated the transaction
        transactionData.makerWalletAddress = matchedOffer.walletAddress;
        
        // Add maker financial account information if available
        let makerFinancialAccountDetails = null;
        
        if (matchedOffer.makerFinancialAccountDetails) {
          console.log(`✅ TRANSACTION FLOW: Offer has financial account details attached`);
          
          // Parse if it's a string
          if (typeof matchedOffer.makerFinancialAccountDetails === 'string') {
            try {
              makerFinancialAccountDetails = JSON.parse(matchedOffer.makerFinancialAccountDetails);
              console.log(`✅ TRANSACTION FLOW: Successfully parsed financial account details from string`);
            } catch (e) {
              console.error(`❌ TRANSACTION FLOW: Failed to parse makerFinancialAccountDetails from offer:`, e);
            }
          } else {
            makerFinancialAccountDetails = matchedOffer.makerFinancialAccountDetails;
            console.log(`✅ TRANSACTION FLOW: Using financial account details from object`);
          }
        } else if (matchedOffer.financialAccountId) {
          console.log(`🔍 TRANSACTION FLOW: Offer has financial account ID but no details, trying to fetch: ${matchedOffer.financialAccountId}`);
          
          try {
            // Try to fetch the financial account directly from database
            const makerAccount = await db.query.financialAccounts.findFirst({
              where: eq(financialAccounts.accountId, matchedOffer.financialAccountId)
            });
            
            if (makerAccount) {
              console.log(`✅ TRANSACTION FLOW: Found financial account in database`);
              makerFinancialAccountDetails = makerAccount;
            } else {
              console.log(`⚠️ TRANSACTION FLOW: Financial account not found in database`);
            }
          } catch (err) {
            console.error(`❌ TRANSACTION FLOW: Error fetching financial account:`, err);
          }
        }
        
        // Save financial account details if we have them
        if (makerFinancialAccountDetails) {
          console.log(`✅ TRANSACTION FLOW: Storing financial account details in transaction`);
          transactionData.makerFinancialAccount = JSON.stringify(makerFinancialAccountDetails);
        } else {
          console.log(`⚠️ TRANSACTION FLOW: No financial account details available for transaction`);
        }
        
        // Add maker payment method if available
        if (matchedOffer.paymentMethods && Array.isArray(matchedOffer.paymentMethods) && matchedOffer.paymentMethods.length > 0) {
          // If taker provided a preferred payment method that the maker supports, use that
          if (transactionData.takerPaymentMethod && 
              matchedOffer.paymentMethods.includes(transactionData.takerPaymentMethod)) {
            console.log(`✅ TRANSACTION FLOW: Using taker's preferred payment method: ${transactionData.takerPaymentMethod}`);
            transactionData.makerPaymentMethod = transactionData.takerPaymentMethod;
          } else {
            // Otherwise use the first available method
            console.log(`✅ TRANSACTION FLOW: Using first available payment method: ${matchedOffer.paymentMethods[0]}`);
            transactionData.makerPaymentMethod = matchedOffer.paymentMethods[0];
          }
        } else {
          console.log(`⚠️ TRANSACTION FLOW: No payment methods defined in the offer`);
        }
        
        console.log(`✅ TRANSACTION FLOW: Transaction updated with match details:`);
        console.log(`- Status: matched`);
        console.log(`- Offer ID: ${transactionData.offerId}`);
        console.log(`- Counterparty: ${transactionData.counterpartyAddress}`);
        console.log(`- Payment method: ${transactionData.makerPaymentMethod || 'Not specified'}`);
        console.log(`- Has financial account: ${transactionData.makerFinancialAccount ? 'Yes' : 'No'}`);
      } else {
        console.log(`⚠️ TRANSACTION FLOW: No matching offer found, continuing with searching status`);
        transactionData.status = 'searching';
      }
      
      // If the transaction is matched with an offer, lock the offer amount
      if (transactionData.status === 'matched' && transactionData.offerId) {
        try {
          console.log(`🔒 TRANSACTION FLOW: Locking offer amount for offer #${transactionData.offerId}`);
          
          // Calculate the amount to lock based on the transaction amount
          const amountToLock = transactionData.tokenAmount || transactionData.amount;
          console.log(`🔒 TRANSACTION FLOW: Amount to lock: ${amountToLock}`);
          
          // Lock the amount in the offer
          await storage.lockOfferAmount(transactionData.offerId, String(amountToLock));
          console.log(`✅ TRANSACTION FLOW: Successfully locked ${amountToLock} for offer #${transactionData.offerId}`);
        } catch (lockError) {
          console.error(`❌ TRANSACTION FLOW: Failed to lock amount for offer:`, lockError);
          return res.status(400).json({ 
            error: 'Failed to lock offer amount', 
            message: lockError instanceof Error ? lockError.message : String(lockError)
          });
        }
      }
      
      // Create the transaction
      const transaction = await storage.createTransaction(transactionData);
      console.log("✅ Transaction created:", transaction);
      
      // If matched with an offer, send a system message to both parties
      if (transaction.status === 'matched' && transaction.offerId) {
        try {
          // Get the offer to determine the correct roles
          const offer = await storage.getOfferById(transaction.offerId);
          
          if (!offer) {
            console.error(`❌ Could not find offer with ID ${transaction.offerId}`);
            return res.status(400).json({ message: "Offer not found" });
          }
          
          // Determine if taker is buyer or seller based on offer type
          // If offer type is 'sell', taker is the buyer
          // If offer type is 'buy', taker is the seller
          const takerIsBuyer = offer.type === 'sell';
          
          // System message for the taker
          await storage.createMessage({
            transactionId: transaction.id,
            senderAddress: 'SYSTEM',
            receiverAddress: transaction.walletAddress,
            content: takerIsBuyer 
              ? 'You have been matched with a seller. Please complete the payment using the provided payment details.' 
              : 'You have been matched with a buyer. Please wait for them to complete the payment.',
            status: 'sent',
            systemMessage: true,
            read: false,
          });
          
          // System message for the maker
          await storage.createMessage({
            transactionId: transaction.id,
            senderAddress: 'SYSTEM',
            receiverAddress: transaction.counterpartyAddress || "",
            content: takerIsBuyer
              ? 'A buyer has been matched with your sell offer. They will make payment to you. Please check transaction details and be ready to confirm receipt.'
              : 'A seller has been matched with your buy offer. Please complete the payment using the provided payment details.',
            status: 'sent',
            systemMessage: true,
            read: false,
          });
          
          console.log("✅ System messages sent to both parties");
        } catch (msgError) {
          console.error("❌ Error sending system messages:", msgError);
          // Don't fail the whole request if just the messages fail
        }
      }
      
      return res.status(201).json(transaction);
    } catch (error) {
      console.error("❌ Error in transaction creation process:", error);
      
      if (error instanceof ZodError) {
        console.error("❌ Detailed ZodError validation problems:");
        error.errors.forEach((err, idx) => {
          console.error(`Error ${idx + 1}:`, 
            `Path: ${err.path.join('.')}, `,
            `Code: ${err.code}, `,
            `Message: ${err.message}`);
        });
      }
      
      throw error; // Let the outer catch handle the response
    }
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("❌ Validation error:", error.errors);
      return res.status(400).json({ 
        message: "Invalid transaction data", 
        details: error.errors 
      });
    }
    console.error("❌ Transaction creation error:", error);
    // Add more detailed error message for debugging
    let errorMsg = error instanceof Error ? error.message : String(error);
    let detailedError = {};
    
    // Check if it's a PostgreSQL error with additional details
    if (error && typeof error === 'object' && 'detail' in error) {
      // Cast to any to access PostgreSQL error properties
      const pgError = error as any;
      detailedError = {
        detail: pgError.detail || 'No details provided',
        hint: pgError.hint || 'No hint provided',
        code: pgError.code || 'Unknown code'
      };
      console.error("📌 PostgreSQL error details:", detailedError);
    }
    
    return res.status(500).json({ 
      message: "Failed to create transaction",
      error: errorMsg,
      details: Object.keys(detailedError).length > 0 ? detailedError : undefined
    });
  }
});

router.patch("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const transaction = await storage.updateTransactionStatus(parseInt(id), status);
    return res.json(transaction);
  } catch (error) {
    console.error("Transaction update error:", error);
    return res.status(500).json({ message: "Failed to update transaction" });
  }
});

// Add an endpoint to check for matching offers for searching transactions
router.post("/transactions/match/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const transactionId = parseInt(id, 10);
    
    if (isNaN(transactionId)) {
      return res.status(400).json({ error: "Invalid transaction ID" });
    }
    
    // Get the transaction from storage
    const transaction = await storage.getTransactionById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    // Only try to match transactions in the 'searching' state
    if (transaction.status !== 'searching') {
      return res.status(400).json({ 
        error: "Transaction is not in searching state",
        status: transaction.status
      });
    }
    
    // Check if self-matching is allowed based on transaction data
    // This could be stored in the original transaction or passed in the request
    const allowSelfMatch = req.body && req.body.allowSelfMatch === true;
    
    // Build the transaction data in the format needed for matching
    const transactionForMatching = {
      id: transaction.id,
      type: transaction.type,
      token: transaction.token,
      amount: transaction.amount,
      currency: transaction.currency,
      walletAddress: transaction.walletAddress,
      takerPaymentMethod: transaction.takerPaymentMethod,
      // Allow self-matching if explicitly requested
      allowSelfMatch: allowSelfMatch
    };
    
    if (allowSelfMatch) {
      console.log("⚠️ Self-matching is enabled for this match request (testing mode)");
    }
    
    // Find a matching offer for this transaction
    const matchedOffer = await findMatchingOffer(transactionForMatching);
    
    if (!matchedOffer) {
      return res.json({ 
        matched: false, 
        message: "No matching offer found" 
      });
    }
    
    // Try to lock the amount for the matched offer
    try {
      console.log(`🔒 TRANSACTION FLOW: Locking offer amount for offer #${matchedOffer.id}`);
      
      // Calculate the amount to lock based on the transaction amount
      const amountToLock = transaction.tokenAmount || transaction.amount;
      console.log(`🔒 TRANSACTION FLOW: Amount to lock: ${amountToLock}`);
      
      // Lock the amount in the offer
      await storage.lockOfferAmount(matchedOffer.id, String(amountToLock));
      console.log(`✅ TRANSACTION FLOW: Successfully locked ${amountToLock} for offer #${matchedOffer.id}`);
    } catch (lockError) {
      console.error(`❌ TRANSACTION FLOW: Failed to lock amount for offer:`, lockError);
      return res.status(400).json({ 
        error: 'Failed to lock offer amount', 
        message: lockError instanceof Error ? lockError.message : String(lockError)
      });
    }
    
    // Update the transaction status to matched
    const updatedTransaction = await storage.updateTransactionStatus(
      transaction.id, 
      'matched'
    );
    
    // Update transaction fields with offer details
    await storage.updateTransactionFields(transaction.id, {
      counterpartyAddress: matchedOffer.walletAddress, // Legacy field maintained for backward compatibility
      offerId: matchedOffer.id,
      // Set maker and taker wallet addresses for clear role designation
      makerWalletAddress: matchedOffer.walletAddress, // Maker is always the offer creator
      takerWalletAddress: transaction.walletAddress   // Taker is always the transaction initiator
    });
    
    // Add maker financial account information if available
    if (matchedOffer.makerFinancialAccountDetails) {
      let makerFinancialAccountDetails;
      
      // Parse if it's a string
      if (typeof matchedOffer.makerFinancialAccountDetails === 'string') {
        try {
          makerFinancialAccountDetails = JSON.parse(matchedOffer.makerFinancialAccountDetails);
        } catch (e) {
          console.error("❌ Failed to parse makerFinancialAccountDetails from offer:", e);
        }
      } else {
        makerFinancialAccountDetails = matchedOffer.makerFinancialAccountDetails;
      }
      
      if (makerFinancialAccountDetails) {
        await storage.updateTransactionFields(transaction.id, {
          makerFinancialAccount: JSON.stringify(makerFinancialAccountDetails)
        });
      }
    }
    
    // Add maker payment method if available
    if (matchedOffer.paymentMethods && Array.isArray(matchedOffer.paymentMethods) && matchedOffer.paymentMethods.length > 0) {
      await storage.updateTransactionFields(transaction.id, {
        makerPaymentMethod: matchedOffer.paymentMethods[0]
      });
    }
    
    // Get the updated transaction with all changes
    const finalTransaction = await storage.getTransactionById(transactionId);
    
    // Send system messages to both parties
    try {
      // Determine if taker is buyer or seller based on offer type
      // If offer type is 'sell', taker is the buyer
      // If offer type is 'buy', taker is the seller
      const takerIsBuyer = matchedOffer.type === 'sell';
      
      // System message for the taker
      await storage.createMessage({
        transactionId: transaction.id,
        senderAddress: 'SYSTEM',
        receiverAddress: transaction.walletAddress,
        content: takerIsBuyer 
          ? 'You have been matched with a seller. Please complete the payment using the provided payment details.' 
          : 'You have been matched with a buyer. Please wait for them to complete the payment.',
        status: 'sent',
        systemMessage: true,
        read: false,
      });
      
      // System message for the maker
      await storage.createMessage({
        transactionId: transaction.id,
        senderAddress: 'SYSTEM',
        receiverAddress: matchedOffer.walletAddress,
        content: takerIsBuyer
          ? 'A buyer has been matched with your sell offer. They will make payment to you. Please check transaction details and be ready to confirm receipt.'
          : 'A seller has been matched with your buy offer. Please complete the payment using the provided payment details.',
        status: 'sent',
        systemMessage: true,
        read: false,
      });
      
      console.log("✅ System messages sent to both parties");
    } catch (msgError) {
      console.error("❌ Error sending system messages:", msgError);
      // Don't fail the whole request if just the messages fail
    }
    
    return res.json({
      matched: true,
      offer: matchedOffer,
      transaction: finalTransaction
    });
    
  } catch (error) {
    console.error("Error matching transaction:", error);
    return res.status(500).json({ error: "Failed to match transaction" });
  }
});

router.delete("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await storage.getTransactionById(parseInt(id));

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (!['pending', 'matched', 'searching'].includes(transaction.status)) {
      return res.status(400).json({ 
        message: `Transaction cannot be cancelled in ${transaction.status} status` 
      });
    }
    
    // If transaction was matched with an offer, unlock the amount
    if (transaction.status === 'matched' && transaction.offerId) {
      try {
        console.log(`🔓 TRANSACTION FLOW: Unlocking offer amount for offer #${transaction.offerId} (transaction cancellation)`);
        
        // Calculate the amount to unlock based on the transaction amount
        const amountToUnlock = transaction.tokenAmount || transaction.amount;
        console.log(`🔓 TRANSACTION FLOW: Amount to unlock: ${amountToUnlock}`);
        
        // Unlock the amount in the offer
        await storage.unlockOfferAmount(transaction.offerId, String(amountToUnlock));
        console.log(`✅ TRANSACTION FLOW: Successfully unlocked ${amountToUnlock} for offer #${transaction.offerId}`);
      } catch (unlockError) {
        console.error(`❌ TRANSACTION FLOW: Failed to unlock amount for offer:`, unlockError);
        // Don't fail the cancellation if unlocking fails, but log the error
      }
    }

    await storage.updateTransactionStatus(parseInt(id), 'cancelled');
    return res.json({ message: "Transaction cancelled successfully" });
  } catch (error) {
    console.error("Transaction cancellation error:", error);
    return res.status(500).json({ message: "Failed to cancel transaction" });
  }
});

// Map /offers route to also handle offer creation (for backward compatibility with client)
router.post("/offers", async (req, res) => {
  try {
    console.log("Received offer creation request at /api/offers");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    // Add priceType if missing (should default to 'fixed')
    if (!req.body.priceType) {
      req.body.priceType = 'fixed';
    }
    
    try {
      const offerData = insertOfferSchema.parse(req.body);
      console.log("Parsed offer data:", JSON.stringify(offerData, null, 2));
      
      const maker = await storage.getMakerByWallet(offerData.walletAddress);

      if (!maker) {
        console.log("Creating new maker for wallet:", offerData.walletAddress);
        const newMaker = await storage.createMaker({
          walletAddress: offerData.walletAddress,
          isActive: true
        });
        offerData.makerId = newMaker.id;
        console.log("Created new maker with ID:", newMaker.id);
      } else {
        console.log("Found existing maker:", maker);
        offerData.makerId = maker.id;
      }

      const result = await storage.createOffer(offerData);
      console.log("Successfully created offer:", result);
      return res.status(201).json(result);
    } catch (zodError) {
      if (zodError instanceof ZodError) {
        console.error("Validation error:", zodError.errors);
        return res.status(400).json({ 
          message: "Invalid offer data", 
          details: zodError.errors 
        });
      }
      throw zodError; // Re-throw if it's not a ZodError
    }
  } catch (error) {
    console.error("Offer creation error:", error);
    return res.status(500).json({ 
      message: "Failed to create offer", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Keep original route for compatibility
router.post("/maker/offers", async (req, res) => {
  try {
    console.log("Received offer creation request at /api/maker/offers");
    const offerData = insertOfferSchema.parse(req.body);
    const maker = await storage.getMakerByWallet(offerData.walletAddress);

    if (!maker) {
      console.log("Creating new maker for wallet:", offerData.walletAddress);
      const newMaker = await storage.createMaker({
        walletAddress: offerData.walletAddress,
        isActive: true
      });
      offerData.makerId = newMaker.id;
    } else {
      console.log("Found existing maker:", maker);
      offerData.makerId = maker.id;
    }

    const result = await storage.createOffer(offerData);
    return res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Invalid offer data", details: error.errors });
    }
    console.error("Offer creation error:", error);
    return res.status(500).json({ 
      message: "Failed to create offer", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Original inline handler replaced by registered handler at line ~546
// router.get('/maker/offers/:walletAddress', getOffersByWallet);

router.delete("/transactions/:walletAddress/pending", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const transactions = await storage.getTransactionsByWallet(walletAddress);
    
    console.log(`🔍 TRANSACTION FLOW: Found ${transactions.length} transactions for wallet ${walletAddress}`);

    for (const transaction of transactions) {
      // Only process pending or searching transactions
      if (transaction.status === 'pending' || transaction.status === 'searching' || transaction.status === 'matched') {
        console.log(`🗑️ TRANSACTION FLOW: Deleting transaction #${transaction.id} in ${transaction.status} status`);
        
        // If transaction was matched with an offer, unlock the amount
        if (transaction.status === 'matched' && transaction.offerId) {
          try {
            console.log(`🔓 TRANSACTION FLOW: Unlocking offer amount for offer #${transaction.offerId} (bulk deletion)`);
            
            // Calculate the amount to unlock based on the transaction amount
            const amountToUnlock = transaction.tokenAmount || transaction.amount;
            console.log(`🔓 TRANSACTION FLOW: Amount to unlock: ${amountToUnlock}`);
            
            // Unlock the amount in the offer
            await storage.unlockOfferAmount(transaction.offerId, String(amountToUnlock));
            console.log(`✅ TRANSACTION FLOW: Successfully unlocked ${amountToUnlock} for offer #${transaction.offerId}`);
          } catch (unlockError) {
            console.error(`❌ TRANSACTION FLOW: Failed to unlock amount for offer:`, unlockError);
            // Continue with deletion even if unlocking fails
          }
        }
        
        await storage.updateTransactionStatus(transaction.id, 'deleted');
      }
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Bulk transaction deletion error:", error);
    return res.status(500).json({ message: "Failed to delete transactions" });
  }
});


// The ad-hoc handler has been removed and replaced by the dedicated getOfferById route handler
// from server/routes/offers.ts - see the proper route registration below

router.post("/maker/offers/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      const offer = await storage.getOfferById(parseInt(id));
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }

      // Get the locked amount from the offer (defaulting to 0 if not present)
      const lockedAmount = parseFloat(offer.lockedAmount || '0');
      
      // Calculate the actually available amount (total - locked)
      const totalAmount = parseFloat(offer.amount);
      const availableAmount = Math.max(0, totalAmount - lockedAmount);

      console.log(`Cancellation attempt for offer ${id}:`, {
        totalAmount,
        lockedAmount,
        availableAmount,
        requestedAmount: amount ? parseFloat(amount) : 'all available'
      });

      // Check if the requested amount is available for cancellation
      if (amount && parseFloat(amount) > availableAmount) {
        return res.status(400).json({ 
          message: "Cannot cancel more than available amount",
          availableAmount: availableAmount.toString(),
          lockedAmount: lockedAmount.toString()
        });
      }

      const amountToCancel = amount ? parseFloat(amount) : availableAmount;
      const newAmount = (totalAmount - amountToCancel).toString();

      // Delete the offer if we're cancelling all available and no amount is locked
      if (amountToCancel === availableAmount && lockedAmount === 0) {
        await storage.deleteOffer(parseInt(id));
        return res.status(200).json({ message: "Offer deleted successfully" });
      }

      // Otherwise update the amount
      const updatedOffer = await storage.updateOfferAmount(parseInt(id), newAmount);
      return res.json(updatedOffer);
    } catch (error) {
      console.error("Offer cancellation error:", error);
      return res.status(500).json({ message: "Failed to cancel offer" });
    }
});

// Enhanced debug endpoints for transaction flow analysis
router.get('/debug/transactions', async (req, res) => {
    try {
      console.log("🔍 Fetching all transactions for debugging");
      const allTransactions = await storage.getAllTransactions();
      console.log(`📋 Found ${allTransactions.length} total transactions in database`);
      return res.json(allTransactions);
    } catch (error) {
      console.error("Debug transaction fetch error:", error);
      return res.status(500).json({ message: "Failed to fetch transactions" });
    }
});

// Add a transaction flow debugger endpoint
router.get('/debug/transaction/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const transactionId = parseInt(id);
      
      console.log(`🔍 DEBUG: Analyzing transaction flow for ID: ${transactionId}`);
      
      // Get the transaction details
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      console.log(`📋 DEBUG: Transaction ${transactionId} details:`, JSON.stringify(transaction, null, 2));
      
      // Define the type for matchingAnalysis to handle both matched and searching statuses
      interface MatchedAnalysis {
        status: "matched";
        matchedWith: {
          offerId: number | null;
          counterpartyAddress?: string | null;
          offerDetails: any;
        };
        paymentInfo: {
          makerPaymentMethod?: string | null;
          takerPaymentMethod?: string | null;
          makerFinancialAccount: any;
          takerFinancialAccount: any;
        };
        messages: Array<{
          id: number;
          sender: string;
          receiver: string;
          isSystem: boolean | null;
          content: string;
          timestamp: Date;
        }>;
      }
      
      interface SearchingAnalysis {
        status: "searching";
        searchCriteria: {
          type: string;
          token: string;
          amount: string;
          currency?: string | null;
          paymentMethod?: string | null;
        };
        potentialMatches: Array<{
          offerId: number;
          makerAddress: string;
          type: string;
          token: string;
          amount: string;
          currency: string;
          paymentMethods: string[];
          compatibility: {
            paymentMethodMatch: boolean;
            amountMatch: boolean;
            selfMatchPossible: boolean;
            overallCompatible: boolean;
          };
        }>;
      }
      
      let matchingAnalysis: MatchedAnalysis | SearchingAnalysis | Record<string, never> = {};
      
      // Analyze based on transaction status
      if (transaction.status === 'matched') {
        // Get the related offer info if it exists
        let relatedOffer = null;
        if (transaction.offerId) {
          relatedOffer = await storage.getOfferById(transaction.offerId);
          console.log(`📋 DEBUG: Related offer:`, JSON.stringify(relatedOffer, null, 2));
        }
        
        // Get messages for this transaction
        const messages = await storage.getMessagesByTransactionId(transaction.id);
        console.log(`📋 DEBUG: Transaction has ${messages.length} messages`);
        
        matchingAnalysis = {
          status: "matched",
          matchedWith: {
            offerId: transaction.offerId,
            counterpartyAddress: transaction.counterpartyAddress,
            offerDetails: relatedOffer,
          },
          paymentInfo: {
            makerPaymentMethod: transaction.makerPaymentMethod,
            takerPaymentMethod: transaction.takerPaymentMethod,
            makerFinancialAccount: transaction.makerFinancialAccount ? 
              (typeof transaction.makerFinancialAccount === 'string' ? 
                JSON.parse(transaction.makerFinancialAccount) : transaction.makerFinancialAccount) : null,
            takerFinancialAccount: transaction.takerFinancialAccount ? 
              (typeof transaction.takerFinancialAccount === 'string' ? 
                JSON.parse(transaction.takerFinancialAccount) : transaction.takerFinancialAccount) : null,
          },
          messages: messages.map(msg => ({
            id: msg.id,
            sender: msg.senderAddress,
            receiver: msg.receiverAddress,
            isSystem: msg.systemMessage,
            content: msg.content,
            timestamp: msg.createdAt
          }))
        };
      } else if (transaction.status === 'searching') {
        // For searching transactions, analyze what we're looking for
        matchingAnalysis = {
          status: "searching",
          searchCriteria: {
            type: transaction.type,
            token: transaction.token,
            amount: transaction.amount,
            currency: transaction.currency || null,
            paymentMethod: transaction.takerPaymentMethod || null
          },
          potentialMatches: []
        };
        
        // Find potential matches
        const offerType = transaction.type === 'buy' ? 'sell' : 'buy';
        const potentialOffers = await storage.getActiveOffers(offerType, transaction.token, transaction.currency);
        
        console.log(`📋 DEBUG: Found ${potentialOffers.length} potential matching offers`);
        
        // Analyze each potential match
        for (const offer of potentialOffers) {
          // Check payment method compatibility
          const paymentMethodMatch = !transaction.takerPaymentMethod || 
            (Array.isArray(offer.paymentMethods) && offer.paymentMethods.includes(transaction.takerPaymentMethod));
          
          // Check amount compatibility
          const txAmount = parseFloat(transaction.amount);
          const offerAmount = parseFloat(offer.amount);
          const minOrderAmount = offer.minOrderAmount ? parseFloat(offer.minOrderAmount) : 0;
          const maxOrderAmount = offer.maxOrderAmount ? parseFloat(offer.maxOrderAmount) : offerAmount;
          
          const amountMatch = txAmount >= minOrderAmount && txAmount <= maxOrderAmount;
          
          // Check wallet compatibility (for self-matching)
          const selfMatchPossible = offer.walletAddress === transaction.walletAddress;
          
          if (matchingAnalysis.status === 'searching') {
            matchingAnalysis.potentialMatches.push({
              offerId: offer.id,
              makerAddress: offer.walletAddress,
              type: offer.type,
              token: offer.token,
              amount: offer.amount,
              currency: offer.fiatCurrency || 'USD',
              paymentMethods: offer.paymentMethods,
              compatibility: {
                paymentMethodMatch,
                amountMatch,
                selfMatchPossible,
                // Handle the allowSelfMatch field - use a type guard to check if field exists
                overallCompatible: paymentMethodMatch && amountMatch && 
                  (selfMatchPossible ? 
                    ('allowSelfMatch' in transaction && transaction.allowSelfMatch === true) : 
                    true
                  )
              }
            });
          }
        }
      }
      
      const result = {
        transaction,
        analysis: matchingAnalysis
      };
      
      return res.json(result);
    } catch (error) {
      console.error("Transaction flow analysis error:", error);
      return res.status(500).json({ 
        message: "Failed to analyze transaction flow",
        error: error instanceof Error ? error.message : String(error)
      });
    }
});

// Manual financial account routes
router.post('/manual-accounts', createManualAccount);
router.get('/manual-accounts/:walletAddress', getManualAccounts);
router.get('/manual-accounts/account/:accountId', getManualAccountById);
router.patch('/manual-accounts/:accountId/payment-methods', updatePaymentMethods);
router.delete('/manual-accounts/:accountId', deleteManualAccount);
router.get('/payment-method-options', getPaymentMethodOptions);
router.get('/manual-accounts/:accountId/payment-method/:methodType', getFormattedPaymentMethodDetails);
router.get('/manual-accounts/:accountId/payment-instructions/:methodType', getPaymentInstructions);

// Payment methods routes (new DB-based approach)
router.get('/payment-methods', getAllPaymentMethods);
router.get('/payment-methods/currency/:currency', getPaymentMethodsByCurrency);
router.get('/payment-methods/:id', getPaymentMethodById);
router.get('/payment-methods/lookup/:methodType/:currency', getPaymentMethodByTypeAndCurrency);
router.post('/payment-methods', createPaymentMethod);
router.put('/payment-methods/:id', updatePaymentMethod);
router.delete('/payment-methods/:id', deletePaymentMethod);
router.patch('/payment-methods/:id/toggle', togglePaymentMethod);
router.post('/payment-methods/migrate', migrateFileBasedPaymentMethods);

// Admin routes
router.get('/admin/status', checkAdminStatus);
router.get('/admin/admins', adminMiddleware, getAdmins);
router.post('/admin/admins', adminMiddleware, createAdmin);
router.get('/admin/admins/:walletAddress', adminMiddleware, getAdminByWallet);
router.patch('/admin/admins/:id', adminMiddleware, updateAdmin);
router.delete('/admin/admins/:id', adminMiddleware, deleteAdmin);
router.patch('/admin/admins/:id/status', adminMiddleware, setAdminStatus);

// Admin financial account management
router.get('/admin/financial-accounts', adminMiddleware, getAllFinancialAccounts);
router.get('/admin/financial-accounts/:id', adminMiddleware, getFinancialAccountById);
router.patch('/admin/financial-accounts/:id/status', adminMiddleware, updateFinancialAccountStatus);
router.patch('/admin/financial-accounts/:id/payment-capabilities', adminMiddleware, updateFinancialAccountPaymentCapabilities);
router.delete('/admin/financial-accounts/:id', adminMiddleware, deleteFinancialAccount);
router.get('/admin/financial-accounts/stats', adminMiddleware, getFinancialAccountStats);
router.get('/admin/financial-accounts/payment-methods', adminMiddleware, getAvailableCurrencyPaymentMethods);

// Payment method configuration routes
router.get('/admin/payment-methods/currencies', adminMiddleware, getSupportedCurrencies);
router.get('/admin/payment-methods/:currency', adminMiddleware, getAdminPaymentMethodsByCurrency);
router.get('/admin/payment-methods/:currency/:methodType', adminMiddleware, getAdminPaymentMethod);
router.put('/admin/payment-methods/:currency/:methodType', adminMiddleware, updateAdminPaymentMethod);
router.patch('/admin/payment-methods/:currency/:methodType/toggle', adminMiddleware, toggleAdminPaymentMethod);
router.delete('/admin/payment-methods/:currency/:methodType', adminMiddleware, deleteAdminPaymentMethod);
router.post('/admin/payment-methods', adminMiddleware, createAdminPaymentMethod);
router.get('/admin/payment-methods/:currency/:methodType/countries', adminMiddleware, getPaymentMethodCountries);

// Admin transaction management
router.get('/admin/transactions', adminMiddleware, getAllTransactions);
router.get('/admin/stats', adminMiddleware, getPlatformStats);
router.patch('/admin/transactions/:id/status', adminMiddleware, updateTransactionStatus);
router.post('/admin/transactions/:id/resolve-dispute', adminMiddleware, resolveDispute);

// New offers API routes
// Important: Register specific routes before wildcard routes
// Fixed-path routes must come before parameter routes (e.g., /offers/active before /offers/:id)
router.get('/maker/offers/:walletAddress', getOffersByWallet); // Register the wallet-based offer lookup
router.post('/offers', createOffer);

// Register the fixed-path 'active' route before the wildcard ID route
router.get('/offers/active', getActiveOffers);

// Register routes with ID parameters
router.get('/offers/:offerId/transactions', getTransactionsByOfferId);
router.patch('/offers/:id/status', updateOfferStatus);
router.patch('/offers/:id/amount', updateOfferAmount);
router.patch('/offers/:id/visibility', updateOfferVisibility);
router.delete('/offers/:id', deleteOffer);

// The generic ID route should come AFTER any specific routes
// This is important as Express routes are matched in order
router.get('/offers/:id', getOfferById);

// Transaction verification routes
router.patch('/transactions/:id/approval', updateTransactionApproval);
router.post('/transactions/:id/evidence', addPaymentEvidence);
router.post('/transactions/:id/dispute', raiseDispute);

// Message routes
router.get('/transactions/:transactionId/messages', getMessagesByTransactionId);
router.post('/messages', sendMessage);
router.post('/transactions/:transactionId/messages', sendMessage); // Added for frontend compatibility
router.post('/transactions/:transactionId/read-messages', markMessagesAsRead);
router.get('/messages/unread/:walletAddress', getUnreadMessageCount);
router.post('/messages/transaction-counts/:walletAddress', getUnreadMessageCountsByTransactions);
router.post('/system-messages', sendSystemMessage);
router.post('/transactions/:transactionId/system-messages', sendSystemMessage); // Added for frontend compatibility

// Risk profile routes
router.get('/risk-profile/:walletAddress', getRiskProfile);
router.put('/risk-profile/:walletAddress', updateRiskProfile);
router.post('/risk-profile/:walletAddress/calculate', calculateRiskScore);

// Financial account payment method integration routes
import { linkPaymentMethod, unlinkPaymentMethod, getPaymentMethodForAccount, addPaymentMethodType, removePaymentMethodType, getAccountsByPaymentMethod, findMatchingPaymentMethods } from './routes/financial-account-payment-methods';

// Link and unlink payment methods
// Only wallet owners and admins should be able to link payment methods to accounts
router.post('/financial-accounts/payment-methods/link', linkPaymentMethod);
router.post('/financial-accounts/payment-methods/unlink', unlinkPaymentMethod);

// Get payment method for an account - public endpoint, permissions checked inside
router.get('/financial-accounts/:accountId/payment-method', getPaymentMethodForAccount);

// Add and remove payment method types (capabilities)
router.post('/financial-accounts/payment-method-types/add', addPaymentMethodType);
router.post('/financial-accounts/payment-method-types/remove', removePaymentMethodType);

// Admin-only endpoints for payment method management
router.get('/admin/payment-methods/:paymentMethodId/accounts', adminMiddleware, getAccountsByPaymentMethod);

// Find matching payment methods between accounts (for transaction matching)
// This is used during transaction flow, so it needs to be accessible
router.post('/financial-accounts/matching-payment-methods', findMatchingPaymentMethods);

// Define the apiRouter so it can be used in registerRoutes
const apiRouter = router;
export { apiRouter };

export function registerRoutes(app: Express): Server {
  // Configure express middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add diagnostic middleware
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
  });

  // Mount all routes under /api prefix
  app.use('/api', apiRouter);

  // Log API endpoints after registration
  console.log('📝 API endpoints:');
  console.log('- GET  /api/health');
  console.log('- GET  /api/transactions/:walletAddress');
  console.log('- GET  /api/transactions/by-id/:id');
  console.log('- POST /api/transactions');
  console.log('- PATCH /api/transactions/:id');
  console.log('- DELETE /api/transactions/:id');
  console.log('- GET  /api/maker/offers/:walletAddress');
  console.log('- POST /api/maker/offers');
  console.log('- GET  /api/offers/:id');
  console.log('- POST /api/maker/offers/:id/cancel');
  
  // Log new offer endpoints
  console.log('📊 P2P Offer Endpoints:');
  console.log('- GET  /api/offers/active');
  console.log('- GET  /api/offers/:id/transactions');
  console.log('- PATCH /api/offers/:id/status');
  console.log('- PATCH /api/offers/:id/visibility');
  
  // Log transaction verification endpoints
  console.log('📊 Transaction Verification Endpoints:');
  console.log('- PATCH /api/transactions/:id/approval');
  console.log('- POST  /api/transactions/:id/evidence');
  console.log('- POST  /api/transactions/:id/dispute');

  // Log manual account routes
  console.log('📊 Manual Financial Account Endpoints:');
  console.log('- POST /api/manual-accounts');
  console.log('- GET  /api/manual-accounts/:walletAddress');
  console.log('- GET  /api/manual-accounts/account/:accountId');
  console.log('- PATCH /api/manual-accounts/:accountId/payment-methods');
  console.log('- DELETE /api/manual-accounts/:accountId');
  console.log('- GET  /api/payment-method-options');
  console.log('- GET  /api/manual-accounts/:accountId/payment-method/:methodType');
  console.log('- GET  /api/manual-accounts/:accountId/payment-instructions/:methodType');
  
  // Log message endpoints
  console.log('📊 Message Endpoints:');
  console.log('- GET  /api/transactions/:transactionId/messages');
  console.log('- POST /api/messages');
  console.log('- POST /api/transactions/:transactionId/read-messages');
  console.log('- GET  /api/messages/unread/:walletAddress');
  console.log('- POST /api/messages/transaction-counts/:walletAddress');
  console.log('- POST /api/system-messages');
  
  // Log risk profile endpoints
  console.log('📊 Risk Profile Endpoints:');
  console.log('- GET  /api/risk-profile/:walletAddress');
  console.log('- PUT  /api/risk-profile/:walletAddress');
  console.log('- POST /api/risk-profile/:walletAddress/calculate');
  
  // Log financial account payment method integration endpoints
  console.log('📊 Financial Account Payment Method Integration:');
  console.log('- POST /api/financial-accounts/payment-methods/link');
  console.log('- POST /api/financial-accounts/payment-methods/unlink');
  console.log('- GET  /api/financial-accounts/:accountId/payment-method');
  console.log('- POST /api/financial-accounts/payment-method-types/add');
  console.log('- POST /api/financial-accounts/payment-method-types/remove');
  console.log('- GET  /api/payment-methods/:paymentMethodId/accounts');
  console.log('- POST /api/financial-accounts/matching-payment-methods');
  
  // Log admin endpoints
  console.log('📊 Admin Endpoints:');
  console.log('- GET  /api/admin/status');
  console.log('- GET  /api/admin/admins');
  console.log('- POST /api/admin/admins');
  console.log('- GET  /api/admin/admins/:walletAddress');
  console.log('- PATCH /api/admin/admins/:id');
  console.log('- DELETE /api/admin/admins/:id');
  console.log('- PATCH /api/admin/admins/:id/status');
  
  // Log admin transaction management endpoints
  console.log('📊 Admin Transaction Management:');
  console.log('- GET  /api/admin/transactions');
  console.log('- GET  /api/admin/stats');
  console.log('- PATCH /api/admin/transactions/:id/status');
  console.log('- POST /api/admin/transactions/:id/resolve-dispute');

  // Add catch-all error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('❌ Global error handler:', err);
    res.status(500).json({ message: "Internal server error" });
  });

  const httpServer = createServer(app);
  return httpServer;
}