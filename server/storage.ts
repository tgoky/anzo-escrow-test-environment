import { 
  users, transactions, offers, makers, messages,
  type User, type InsertUser, type Transaction, type InsertTransaction, 
  type Offer, type InsertOffer, type Maker, type Message,
  insertMakerSchema, insertMessageSchema, MESSAGE_STATUS
} from "@shared/schema";
import { z } from "zod";

// Define types
type InsertMaker = z.infer<typeof insertMakerSchema>;
type InsertMessage = z.infer<typeof insertMessageSchema>;
import { desc, eq, and, or, inArray, sql, asc } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Risk profile methods
  getMakerRiskProfile(walletAddress: string): Promise<{ 
    riskCategory: string; 
    riskScore?: number; 
    riskFactors?: Record<string, any>; 
  } | undefined>;
  updateMakerRiskProfile(
    walletAddress: string, 
    riskProfile: { 
      riskCategory: string; 
      riskScore?: number; 
      riskFactors?: Record<string, any>; 
    }
  ): Promise<Maker>;

  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByWallet(walletAddress: string): Promise<Transaction[]>;
  updateTransactionStatus(id: number, status: string, failureReason?: string): Promise<Transaction>;
  updateTransactionFields(id: number, fields: Partial<Transaction>): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getAllTransactions(): Promise<Transaction[]>;
  
  // Transaction verification methods
  updateTransactionApproval(
    id: number, 
    approvalType: 'maker' | 'taker' | 'platform', 
    approved: boolean, 
    reason?: string
  ): Promise<Transaction>;
  addPaymentEvidence(id: number, evidence: any): Promise<Transaction>;
  addDisputeEvidence(id: number, reason: string, evidence: any): Promise<Transaction>;
  getTransactionsByOfferId(offerId: number): Promise<Transaction[]>;

  // Offer methods
  createOffer(offer: InsertOffer): Promise<Offer>;
  getOffersByWallet(walletAddress: string): Promise<Offer[]>;
  getActiveOffers(type?: string, token?: string, fiatCurrency?: string): Promise<Offer[]>;
  updateOfferStatus(id: number, status: string): Promise<Offer>;
  getOfferById(id: number): Promise<Offer | undefined>;
  deleteOffer(id: number): Promise<void>;
  updateOfferAmount(id: number, amount: string): Promise<Offer>;
  updateOfferVisibility(id: number, visibility: string): Promise<Offer>;
  getPendingTransactionsByOfferId(offerId: number): Promise<Transaction[]>;
  
  // Offer locking methods
  lockOfferAmount(offerId: number, amountToLock: string): Promise<Offer>;
  unlockOfferAmount(offerId: number, amountToUnlock: string): Promise<Offer>;
  getAvailableOfferAmount(offerId: number): Promise<string>;

  // Maker methods
  getMakerByWallet(walletAddress: string): Promise<Maker | undefined>;
  createMaker(maker: z.infer<typeof insertMakerSchema>): Promise<Maker>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByTransactionId(transactionId: number): Promise<Message[]>;
  markMessagesAsRead(transactionId: number, receiverAddress: string): Promise<void>;
  getUnreadMessageCount(receiverAddress: string): Promise<number>;
  getUnreadMessageCountsByTransactions(receiverAddress: string, transactionIds?: number[]): Promise<Record<number, number>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    console.log("🔄 Creating transaction with data:", transaction);
    try {
      const values = {
        type: transaction.type,
        status: transaction.status || 'searching', // Start with searching status
        amount: transaction.amount,
        currency: transaction.currency || 'USD',
        tokenAmount: transaction.tokenAmount,
        token: transaction.token,
        walletAddress: transaction.walletAddress,
        counterpartyAddress: transaction.counterpartyAddress,
        // IMPORTANT: Only set makerWalletAddress if it's explicitly provided
        // DO NOT default to walletAddress (taker) - this causes maker/taker role confusion
        // In matched transactions, makerWalletAddress is set from the offer's wallet address
        makerWalletAddress: transaction.makerWalletAddress,
        // Set takerWalletAddress to matching fields or default to walletAddress which is typically the taker
        takerWalletAddress: transaction.takerWalletAddress || transaction.walletAddress,
        // Handle financial account data for PostgreSQL JSON
        // If it's a string, it's already a serialized JSON - send as is
        // If it's an object, Drizzle ORM will handle serialization
        makerFinancialAccount: transaction.makerFinancialAccount ?? null,
        takerFinancialAccount: transaction.takerFinancialAccount ?? null,
        makerPaymentMethod: transaction.makerPaymentMethod || null,
        takerPaymentMethod: transaction.takerPaymentMethod || null,
        timeoutAt: transaction.timeoutAt instanceof Date ? transaction.timeoutAt : null,
        makerId: transaction.makerId,
        offerId: transaction.offerId,
        countryCode: transaction.countryCode
      };

      console.log("📄 Final values to insert:", values);

      const [result] = await db
        .insert(transactions)
        .values(values)
        .returning();

      console.log("✅ Transaction successfully created in database:", result);
      return result;
    } catch (error) {
      console.error("❌ Error creating transaction:", error);
      console.error("❌ Error details:", error instanceof Error ? error.message : String(error));
      console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
      throw error;
    }
  }

  async getTransactionsByWallet(walletAddress: string): Promise<Transaction[]> {
    try {
      // Query transactions for this wallet address using any role-based address field
      const result = await db.select()
        .from(transactions)
        .where(
          or(
            eq(transactions.walletAddress, walletAddress),         // Legacy: User initiated the transaction (taker)
            eq(transactions.counterpartyAddress, walletAddress),   // Legacy: User is the counterparty (maker)
            eq(transactions.makerWalletAddress, walletAddress),    // User is explicitly identified as maker
            eq(transactions.takerWalletAddress, walletAddress)     // User is explicitly identified as taker
          )
        )
        .orderBy(desc(transactions.createdAt));
      
      console.log(`[Storage] Found ${result.length} transactions for wallet ${walletAddress}`);
      return result;
    } catch (error) {
      console.error("❌ Error getting transactions by wallet:", error);
      throw error;
    }
  }

  async updateTransactionStatus(id: number, status: string, failureReason?: string): Promise<Transaction> {
    console.log(`[Storage] Updating transaction ${id} to status ${status}`);
    try {
      const [updated] = await db
        .update(transactions)
        .set({
          status,
          failureReason,
          updatedAt: new Date()
        })
        .where(eq(transactions.id, id))
        .returning();
      console.log(`[Storage] Update successful:`, updated);
      return updated;
    } catch (error) {
      console.error(`[Storage] Error updating transaction ${id}:`, error);
      throw error;
    }
  }
  
  async updateTransactionFields(id: number, fields: Partial<Transaction>): Promise<Transaction> {
    console.log(`[Storage] Updating transaction ${id} with fields:`, JSON.stringify(fields));
    try {
      // Add updatedAt field if not provided
      if (!fields.updatedAt) {
        fields.updatedAt = new Date();
      }
      
      const [updated] = await db
        .update(transactions)
        .set(fields)
        .where(eq(transactions.id, id))
        .returning();
      console.log(`[Storage] Fields update successful:`, updated);
      return updated;
    } catch (error) {
      console.error(`[Storage] Error updating transaction ${id} fields:`, error);
      throw error;
    }
  }

  /**
   * Get a transaction by its ID
   * @param id The transaction ID to look up
   * @returns The transaction if found, undefined otherwise
   * @deprecated Use getTransactionById instead for consistency with API routes
   */
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.getTransactionById(id);
  }

  /**
   * Get a transaction by its ID (primary method)
   * @param id The transaction ID to look up
   * @returns The transaction if found, undefined otherwise
   */
  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async getMakerByWallet(walletAddress: string): Promise<Maker | undefined> {
    const [maker] = await db
      .select()
      .from(makers)
      .where(eq(makers.walletAddress, walletAddress));
    return maker;
  }

  async createMaker(maker: z.infer<typeof insertMakerSchema>): Promise<Maker> {
    const [created] = await db
      .insert(makers)
      .values(maker)
      .returning();
    return created;
  }
  
  /**
   * Get a maker's risk profile
   */
  async getMakerRiskProfile(walletAddress: string): Promise<{ 
    riskCategory: string; 
    riskScore?: number; 
    riskFactors?: Record<string, any>; 
  } | undefined> {
    try {
      const [maker] = await db
        .select({
          riskCategory: makers.riskCategory,
          riskScore: makers.riskScore,
          riskFactors: makers.riskFactors
        })
        .from(makers)
        .where(eq(makers.walletAddress, walletAddress));
      
      return maker;
    } catch (error) {
      console.error(`[Storage] Error getting risk profile for wallet ${walletAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Update a maker's risk profile
   */
  async updateMakerRiskProfile(
    walletAddress: string, 
    riskProfile: { 
      riskCategory: string; 
      riskScore?: number; 
      riskFactors?: Record<string, any>; 
    }
  ): Promise<Maker> {
    try {
      const [updated] = await db
        .update(makers)
        .set({
          riskCategory: riskProfile.riskCategory,
          riskScore: riskProfile.riskScore || null,
          riskFactors: riskProfile.riskFactors || null,
          updatedAt: new Date()
        })
        .where(eq(makers.walletAddress, walletAddress))
        .returning();
      
      if (!updated) {
        throw new Error(`Maker with wallet address ${walletAddress} not found`);
      }
      
      return updated;
    } catch (error) {
      console.error(`[Storage] Error updating risk profile for wallet ${walletAddress}:`, error);
      throw error;
    }
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    console.log('[Storage] Creating offer with data:', offer);
    try {
      const [createdOffer] = await db
        .insert(offers)
        .values({
          ...offer,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          // Initialize lockedAmount as zero
          lockedAmount: "0",
          // Make sure paymentMethods is an array as per the schema
          paymentMethods: offer.paymentMethods
        })
        .returning();

      console.log('[Storage] Created offer:', createdOffer);
      return createdOffer;
    } catch (error) {
      console.error('[Storage] Error creating offer:', error);
      throw error;
    }
  }

  async getOffersByWallet(walletAddress: string): Promise<Offer[]> {
    console.log('[Storage] Getting offers for wallet:', walletAddress);
    console.log('[Storage] Wallet address data type:', typeof walletAddress);
    console.log('[Storage] Wallet address length:', walletAddress.length);
    
    try {
      // Add query debugging
      const query = db
        .select()
        .from(offers)
        .where(eq(offers.walletAddress, walletAddress))
        .orderBy(desc(offers.createdAt));
        
      console.log('[Storage] SQL Query structure:', query.toSQL());
      
      // Also fetch all offers for debugging
      const allOffers = await db.select().from(offers);
      console.log(`[Storage] Total offers in database: ${allOffers.length}`);
      
      if (allOffers.length > 0) {
        // List wallet addresses from offers for debugging
        const walletAddresses = [...new Set(allOffers.map(o => o.walletAddress))];
        console.log('[Storage] All wallet addresses with offers:', walletAddresses);
      }
      
      const results = await query;
      console.log(`[Storage] Found ${results.length} offers for wallet ${walletAddress}:`, results);
      return results;
    } catch (error) {
      console.error('[Storage] Error getting offers by wallet:', error);
      throw error;
    }
  }

  async updateOfferStatus(id: number, status: string): Promise<Offer> {
    const [updated] = await db
      .update(offers)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(offers.id, id))
      .returning();
    return updated;
  }

  async getOfferById(id: number): Promise<Offer | undefined> {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.id, id));
    return offer;
  }

  async deleteOffer(id: number): Promise<void> {
    await db
      .delete(offers)
      .where(eq(offers.id, id));
  }

  async updateOfferAmount(id: number, amount: string): Promise<Offer> {
    const [updated] = await db
      .update(offers)
      .set({
        amount,
        updatedAt: new Date()
      })
      .where(eq(offers.id, id))
      .returning();
    return updated;
  }

  async updateOfferVisibility(id: number, visibility: string): Promise<Offer> {
    const [updated] = await db
      .update(offers)
      .set({
        visibility,
        updatedAt: new Date()
      })
      .where(eq(offers.id, id))
      .returning();
    return updated;
  }

  async getPendingTransactionsByOfferId(offerId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.offerId, offerId),
          inArray(transactions.status, ['pending', 'searching', 'matched', 'verification', 'dispute'])
        )
      );
  }
  
  async getTransactionsByOfferId(offerId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.offerId, offerId))
      .orderBy(desc(transactions.createdAt));
  }
  
  async updateTransactionApproval(
    id: number, 
    approvalType: 'maker' | 'taker' | 'platform', 
    approved: boolean, 
    reason?: string
  ): Promise<Transaction> {
    console.log(`[Storage] Updating transaction ${id} ${approvalType} approval to ${approved}`);
    
    try {
      const updateValues: any = {
        updatedAt: new Date()
      };
      
      // Set the appropriate approval field
      if (approvalType === 'maker') {
        updateValues.makerApproval = approved;
      } else if (approvalType === 'taker') {
        updateValues.takerApproval = approved;
      } else if (approvalType === 'platform') {
        updateValues.platformApproval = approved;
        updateValues.platformApprovalReason = reason || null;
      }
      
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));
      
      if (!transaction) {
        throw new Error(`Transaction with ID ${id} not found`);
      }
      
      // Check if we have 2/3 approvals to complete the transaction
      // Calculate the new approval state based on current transaction state plus the change
      const approvals = {
        maker: approvalType === 'maker' ? approved : Boolean(transaction.makerApproval),
        taker: approvalType === 'taker' ? approved : Boolean(transaction.takerApproval),
        platform: approvalType === 'platform' ? approved : Boolean(transaction.platformApproval),
      };
      
      const approvalCount = Object.values(approvals).filter(Boolean).length;
      
      console.log(`[Storage] Transaction has ${approvalCount} approvals`);
      
      // Update status if needed based on 2/3 signers system
      // If we have 2 or more approvals, mark as completed
      if (approvalCount >= 2) {
        updateValues.status = 'completed';
        updateValues.completedAt = new Date();
      }
      
      const [updated] = await db
        .update(transactions)
        .set(updateValues)
        .where(eq(transactions.id, id))
        .returning();
      
      console.log(`[Storage] Transaction approval updated:`, updated);
      
      // If transaction is now completed, update the associated offer amount
      if (updated.status === 'completed' && updated.offerId) {
        console.log(`[Storage] Transaction completed, updating offer amount for offer ${updated.offerId}`);
        
        try {
          // Get the current offer
          const offer = await this.getOfferById(updated.offerId);
          
          if (offer) {
            // Get transaction amount and convert to string for consistency
            const transactionAmount = String(updated.amount);
            
            console.log(`[Storage] Offer ${offer.id} current amount: ${offer.amount}, locked: ${offer.lockedAmount}`);
            console.log(`[Storage] Transaction amount to subtract: ${transactionAmount}`);
            
            // Parse amounts to numbers for calculation
            const currentOfferAmount = parseFloat(offer.amount.toString());
            const completedTransactionAmount = parseFloat(transactionAmount);
            
            // Calculate new offer amount (total amount minus transaction amount)
            const newOfferAmount = Math.max(0, currentOfferAmount - completedTransactionAmount);
            
            console.log(`[Storage] New calculated offer amount: ${newOfferAmount}`);
            
            // Update offer with new total amount
            await this.updateOfferAmount(offer.id, String(newOfferAmount));
            
            // Also unlock any pending amount for this transaction
            await this.unlockOfferAmount(offer.id, transactionAmount);
            
            console.log(`[Storage] Successfully updated offer amounts for completed transaction`);
          }
        } catch (error) {
          console.error(`[Storage] Error updating offer amount for completed transaction:`, error);
          // Don't throw the error here to avoid breaking the transaction approval process
          // The transaction should still be marked as completed even if offer update fails
        }
      }
      
      return updated;
    } catch (error) {
      console.error(`[Storage] Error updating transaction approval:`, error);
      throw error;
    }
  }
  
  async addPaymentEvidence(id: number, evidence: any): Promise<Transaction> {
    console.log(`[Storage] Adding payment evidence for transaction ${id}`);
    
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));
      
      if (!transaction) {
        throw new Error(`Transaction with ID ${id} not found`);
      }
      
      // Create an array or add to existing evidence array
      const paymentEvidence = transaction.paymentEvidence ? 
        (Array.isArray(transaction.paymentEvidence) ? [...transaction.paymentEvidence, evidence] : [evidence]) : 
        [evidence];
      
      // Determine if this is from maker or taker based on evidence sender
      // If evidence contains sender information, use it; otherwise infer from transaction type
      const isMakerSendingPayment = transaction.type === 'sell';
      const approvalField = isMakerSendingPayment ? 'makerApproval' : 'takerApproval';
      
      console.log(`[Storage] Setting ${approvalField} to true as part of payment evidence`);
      
      const updateValues: any = {
        paymentEvidence,
        status: 'verification', // Update status to verification when payment evidence is added
        updatedAt: new Date(),
        paymentConfirmedAt: new Date() // Mark payment as confirmed
      };
      
      // Set the appropriate approval field
      updateValues[approvalField] = true;
      
      const [updated] = await db
        .update(transactions)
        .set(updateValues)
        .where(eq(transactions.id, id))
        .returning();
      
      console.log(`[Storage] Payment evidence added:`, updated);
      return updated;
    } catch (error) {
      console.error(`[Storage] Error adding payment evidence:`, error);
      throw error;
    }
  }
  
  async addDisputeEvidence(id: number, reason: string, evidence: any): Promise<Transaction> {
    console.log(`[Storage] Adding dispute for transaction ${id}: ${reason}`);
    
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));
      
      if (!transaction) {
        throw new Error(`Transaction with ID ${id} not found`);
      }
      
      // Create an array or add to existing evidence array
      const disputeEvidence = transaction.disputeEvidence 
        ? (Array.isArray(transaction.disputeEvidence) 
            ? [...transaction.disputeEvidence, { reason, evidence, createdAt: new Date() }]
            : [{ reason, evidence, createdAt: new Date() }]) 
        : [{ reason, evidence, createdAt: new Date() }];
      
      const [updated] = await db
        .update(transactions)
        .set({
          status: 'dispute',
          disputeEvidence,
          updatedAt: new Date(),
          disputeRaisedAt: new Date(),
          disputeReason: reason
        })
        .where(eq(transactions.id, id))
        .returning();
      
      console.log(`[Storage] Dispute evidence added:`, updated);
      return updated;
    } catch (error) {
      console.error(`[Storage] Error adding dispute evidence:`, error);
      throw error;
    }
  }
  
  /**
   * Get active offers with optional filters
   */
  async getActiveOffers(type?: string, token?: string, fiatCurrency?: string): Promise<Offer[]> {
    console.log(`[Storage] Getting active offers with filters: type=${type}, token=${token}, fiatCurrency=${fiatCurrency}`);
    
    try {
      // First get all offers for debugging
      const allOffers = await db.select().from(offers);
      console.log(`[Storage] Total offers in database: ${allOffers.length}`);
      
      if (allOffers.length > 0) {
        // Log sample data and available values to help with debugging
        const offerTypes = [...new Set(allOffers.map(o => o.type))];
        const offerStatuses = [...new Set(allOffers.map(o => o.status))];
        const offerTokens = [...new Set(allOffers.map(o => o.token))];
        const offerCurrencies = [...new Set(allOffers.map(o => o.fiatCurrency))];
        
        console.log(`[Storage] Available offer types:`, offerTypes);
        console.log(`[Storage] Available offer statuses:`, offerStatuses);
        console.log(`[Storage] Available tokens:`, offerTokens);
        console.log(`[Storage] Available currencies:`, offerCurrencies);
      }
      
      // Build the query step by step to avoid TypeScript errors
      let baseFilters = [eq(offers.status, 'active'), eq(offers.visibility, 'public')];
      
      // Only apply type filter if it's a valid value
      if (type && typeof type === 'string' && type.length > 0) {
        console.log(`[Storage] Adding type filter: ${type}`);
        baseFilters.push(eq(offers.type, type));
      }
      
      // Only apply token filter if it's a valid value
      if (token && typeof token === 'string' && token.length > 0) {
        console.log(`[Storage] Adding token filter: ${token}`);
        baseFilters.push(eq(offers.token, token));
      }
      
      // Only apply currency filter if it's a valid value
      if (fiatCurrency && typeof fiatCurrency === 'string' && fiatCurrency.length > 0) {
        console.log(`[Storage] Adding fiatCurrency filter: ${fiatCurrency}`);
        baseFilters.push(eq(offers.fiatCurrency, fiatCurrency));
      }
      
      // Create a new query with all filters applied at once to avoid TypeScript errors
      const query = db
        .select()
        .from(offers)
        .where(and(...baseFilters))
        .orderBy(desc(offers.createdAt));
      
      // Execute query
      console.log(`[Storage] Executing query: ${query.toSQL().sql}`);
      const result = await query;
      console.log(`[Storage] Found ${result.length} matching active offers`);
      
      // Log sample of matching offers
      if (result.length > 0) {
        console.log(`[Storage] First matching offer: id=${result[0].id}, type=${result[0].type}, token=${result[0].token}, fiatCurrency=${result[0].fiatCurrency}`);
      }
      
      return result;
    } catch (error) {
      console.error(`[Storage] Error getting active offers:`, error);
      // Return empty array instead of throwing to make the endpoint more resilient
      return [];
    }
  }
  
  /**
   * Create a new message
   */
  async createMessage(message: InsertMessage): Promise<Message> {
    console.log(`[Storage] Creating new message: ${message.content} (transaction: ${message.transactionId})`);
    
    try {
      const [created] = await db
        .insert(messages)
        .values({
          ...message,
          createdAt: new Date(),
          status: message.status || MESSAGE_STATUS.DELIVERED
        })
        .returning();
      
      console.log(`[Storage] Message created:`, created);
      return created;
    } catch (error) {
      console.error(`[Storage] Error creating message:`, error);
      throw error;
    }
  }
  
  /**
   * Get messages for a transaction
   */
  async getMessagesByTransactionId(transactionId: number): Promise<Message[]> {
    console.log(`[Storage] Getting messages for transaction ${transactionId}`);
    
    try {
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.transactionId, transactionId))
        .orderBy(asc(messages.createdAt));
      
      console.log(`[Storage] Found ${result.length} messages for transaction ${transactionId}`);
      return result;
    } catch (error) {
      console.error(`[Storage] Error getting messages for transaction:`, error);
      throw error;
    }
  }
  
  /**
   * Mark messages as read for a transaction and receiver
   */
  async markMessagesAsRead(transactionId: number, receiverAddress: string): Promise<void> {
    console.log(`[Storage] Marking messages as read for transaction ${transactionId} and receiver ${receiverAddress}`);
    
    try {
      await db
        .update(messages)
        .set({
          status: MESSAGE_STATUS.READ,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(messages.transactionId, transactionId),
            eq(messages.receiverAddress, receiverAddress),
            eq(messages.status, MESSAGE_STATUS.DELIVERED)
          )
        );
      
      console.log(`[Storage] Messages marked as read for transaction ${transactionId}`);
    } catch (error) {
      console.error(`[Storage] Error marking messages as read:`, error);
      throw error;
    }
  }
  
  /**
   * Get unread message count for a user
   */
  async getUnreadMessageCount(receiverAddress: string): Promise<number> {
    console.log(`[Storage] Getting unread message count for ${receiverAddress}`);
    
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.receiverAddress, receiverAddress),
            eq(messages.status, MESSAGE_STATUS.DELIVERED)
          )
        );
      
      const count = result[0]?.count || 0;
      console.log(`[Storage] Found ${count} unread messages for ${receiverAddress}`);
      return count;
    } catch (error) {
      console.error(`[Storage] Error getting unread message count:`, error);
      throw error;
    }
  }
  
  /**
   * Get unread message counts by transaction
   */
  async getUnreadMessageCountsByTransactions(
    receiverAddress: string, 
    transactionIds?: number[]
  ): Promise<Record<number, number>> {
    console.log(`[Storage] Getting unread message counts for ${receiverAddress} by transactions`);
    
    try {
      // Build conditions first
      const baseConditions = and(
        eq(messages.receiverAddress, receiverAddress),
        eq(messages.status, MESSAGE_STATUS.DELIVERED)
      );
      
      // Create two separate queries to avoid TypeScript errors
      let query;
      if (transactionIds && transactionIds.length > 0) {
        // If we have transaction IDs, include them in the where clause
        query = db
          .select({
            transactionId: messages.transactionId,
            count: sql<number>`count(*)`
          })
          .from(messages)
          .where(
            and(
              baseConditions,
              inArray(messages.transactionId, transactionIds)
            )
          )
          .groupBy(messages.transactionId);
      } else {
        // If no transaction IDs, just use the base conditions
        query = db
          .select({
            transactionId: messages.transactionId,
            count: sql<number>`count(*)`
          })
          .from(messages)
          .where(baseConditions)
          .groupBy(messages.transactionId);
      }
      
      const result = await query;
      
      // Convert array of counts to a record object
      const countsByTransaction: Record<number, number> = {};
      for (const row of result) {
        countsByTransaction[row.transactionId] = Number(row.count);
      }
      
      console.log(`[Storage] Unread message counts by transaction:`, countsByTransaction);
      return countsByTransaction;
    } catch (error) {
      console.error(`[Storage] Error getting unread message counts by transaction:`, error);
      throw error;
    }
  }
  
  // Offer locking methods
  async lockOfferAmount(offerId: number, amountToLock: string): Promise<Offer> {
    console.log(`[Storage] Locking amount ${amountToLock} for offer ${offerId}`);
    
    try {
      // First get the current offer
      const offer = await this.getOfferById(offerId);
      
      if (!offer) {
        throw new Error(`Offer with ID ${offerId} not found`);
      }
      
      // Parse the amounts
      const currentAmount = parseFloat(offer.amount.toString());
      const currentLockedAmount = offer.lockedAmount ? parseFloat(offer.lockedAmount.toString()) : 0;
      const lockAmount = parseFloat(amountToLock);
      
      // Calculate new locked amount
      const newLockedAmount = currentLockedAmount + lockAmount;
      
      // Verify there's enough available to lock
      const availableAmount = currentAmount - currentLockedAmount;
      
      if (lockAmount > availableAmount) {
        throw new Error(`Cannot lock ${lockAmount}, only ${availableAmount} is available out of ${currentAmount} total`);
      }
      
      // Update the offer with the new locked amount
      const [updated] = await db
        .update(offers)
        .set({
          lockedAmount: String(newLockedAmount),
          updatedAt: new Date()
        })
        .where(eq(offers.id, offerId))
        .returning();
        
      console.log(`[Storage] Successfully locked amount. New locked amount: ${updated.lockedAmount}`);
      return updated;
    } catch (error) {
      console.error(`[Storage] Error locking amount for offer ${offerId}:`, error);
      throw error;
    }
  }
  
  async unlockOfferAmount(offerId: number, amountToUnlock: string): Promise<Offer> {
    console.log(`[Storage] Unlocking amount ${amountToUnlock} for offer ${offerId}`);
    
    try {
      // First get the current offer
      const offer = await this.getOfferById(offerId);
      
      if (!offer) {
        throw new Error(`Offer with ID ${offerId} not found`);
      }
      
      // Parse the amounts
      const currentLockedAmount = offer.lockedAmount ? parseFloat(offer.lockedAmount.toString()) : 0;
      const unlockAmount = parseFloat(amountToUnlock);
      
      // Calculate new locked amount
      let newLockedAmount = currentLockedAmount - unlockAmount;
      
      // Don't allow negative locked amounts
      if (newLockedAmount < 0) {
        console.warn(`[Storage] Warning: Attempt to unlock more than is locked. Capping at 0.`);
        newLockedAmount = 0;
      }
      
      // Update the offer with the new locked amount
      const [updated] = await db
        .update(offers)
        .set({
          lockedAmount: String(newLockedAmount),
          updatedAt: new Date()
        })
        .where(eq(offers.id, offerId))
        .returning();
        
      console.log(`[Storage] Successfully unlocked amount. New locked amount: ${updated.lockedAmount}`);
      return updated;
    } catch (error) {
      console.error(`[Storage] Error unlocking amount for offer ${offerId}:`, error);
      throw error;
    }
  }
  
  async getAvailableOfferAmount(offerId: number): Promise<string> {
    console.log(`[Storage] Getting available amount for offer ${offerId}`);
    
    try {
      // Get the current offer
      const offer = await this.getOfferById(offerId);
      
      if (!offer) {
        throw new Error(`Offer with ID ${offerId} not found`);
      }
      
      // Parse the amounts
      const totalAmount = parseFloat(offer.amount.toString());
      const lockedAmount = offer.lockedAmount ? parseFloat(offer.lockedAmount.toString()) : 0;
      
      // Calculate available amount
      const availableAmount = totalAmount - lockedAmount;
      
      console.log(`[Storage] Available amount for offer ${offerId}: ${availableAmount} (Total: ${totalAmount}, Locked: ${lockedAmount})`);
      return String(availableAmount);
    } catch (error) {
      console.error(`[Storage] Error getting available amount for offer ${offerId}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();