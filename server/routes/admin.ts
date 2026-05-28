import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { admins, ADMIN_ROLES, transactions as transactionsTable, messages as messagesTable, makers, offers } from "@shared/schema";
import { z } from "zod";

// Validation schemas
const createAdminSchema = z.object({
  walletAddress: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  isActive: z.boolean().default(true)
});

const updateAdminSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  isActive: z.boolean().optional()
});

/**
 * Check if a wallet address is an admin
 */
export async function isAdmin(walletAddress: string): Promise<boolean> {
  try {
    const admin = await db.query.admins.findFirst({
      where: eq(admins.walletAddress, walletAddress)
    });
    return !!admin && admin.isActive;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Check if a wallet address has a specific admin role
 */
export async function hasAdminRole(walletAddress: string, role: string): Promise<boolean> {
  try {
    const admin = await db.query.admins.findFirst({
      where: eq(admins.walletAddress, walletAddress)
    });
    return !!admin && admin.isActive && admin.role === role;
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}

/**
 * Admin middleware to check if the requester is an admin
 */
export function adminMiddleware(req: Request, res: Response, next: Function) {
  // Get the wallet address from the request
  const walletAddress = req.headers["x-wallet-address"] as string;
  
  if (!walletAddress) {
    return res.status(401).json({ message: "Unauthorized - Wallet address is required" });
  }

  // Check if the wallet address is an admin
  isAdmin(walletAddress)
    .then((isAdminUser) => {
      if (isAdminUser) {
        next();
      } else {
        res.status(403).json({ message: "Forbidden - Insufficient privileges" });
      }
    })
    .catch((error) => {
      console.error("Admin middleware error:", error);
      res.status(500).json({ message: "Internal server error" });
    });
}

/**
 * Role-based middleware for specific admin roles
 */
export function roleMiddleware(role: string) {
  return (req: Request, res: Response, next: Function) => {
    // Get the wallet address from the request
    const walletAddress = req.headers["x-wallet-address"] as string;
    
    if (!walletAddress) {
      return res.status(401).json({ message: "Unauthorized - Wallet address is required" });
    }

    // Check if the wallet address has the required role
    hasAdminRole(walletAddress, role)
      .then((hasRole) => {
        if (hasRole) {
          next();
        } else {
          res.status(403).json({ message: `Forbidden - ${role} privilege required` });
        }
      })
      .catch((error) => {
        console.error("Role middleware error:", error);
        res.status(500).json({ message: "Internal server error" });
      });
  };
}

/**
 * Get all admin users
 */
export async function getAdmins(req: Request, res: Response) {
  try {
    const adminUsers = await db.query.admins.findMany({
      orderBy: (admins, { desc }) => [desc(admins.updatedAt)]
    });
    
    res.json(adminUsers);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Failed to fetch admin users" });
  }
}

/**
 * Create a new admin user
 */
export async function createAdmin(req: Request, res: Response) {
  try {
    // Validate the request body
    const validatedData = createAdminSchema.parse(req.body);
    
    // Check if admin with this wallet already exists
    const existingAdmin = await db.query.admins.findFirst({
      where: eq(admins.walletAddress, validatedData.walletAddress)
    });
    
    if (existingAdmin) {
      return res.status(409).json({ message: "Admin with this wallet address already exists" });
    }
    
    // Create the new admin
    const newAdmin = await db.insert(admins).values({
      walletAddress: validatedData.walletAddress,
      name: validatedData.name,
      role: validatedData.role,
      isActive: validatedData.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    res.status(201).json(newAdmin[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    
    console.error("Error creating admin:", error);
    res.status(500).json({ message: "Failed to create admin user" });
  }
}

/**
 * Update an admin user
 */
export async function updateAdmin(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminId = parseInt(id);
    
    if (isNaN(adminId)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }
    
    // Validate the request body
    const validatedData = updateAdminSchema.parse(req.body);
    
    // Check if admin exists
    const existingAdmin = await db.query.admins.findFirst({
      where: eq(admins.id, adminId)
    });
    
    if (!existingAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    // Update the admin
    const updatedAdmin = await db.update(admins)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(admins.id, adminId))
      .returning();
    
    res.json(updatedAdmin[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    
    console.error("Error updating admin:", error);
    res.status(500).json({ message: "Failed to update admin user" });
  }
}

/**
 * Delete an admin user
 */
export async function deleteAdmin(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminId = parseInt(id);
    
    if (isNaN(adminId)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }
    
    // Check if admin exists
    const existingAdmin = await db.query.admins.findFirst({
      where: eq(admins.id, adminId)
    });
    
    if (!existingAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    // Delete the admin
    await db.delete(admins).where(eq(admins.id, adminId));
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ message: "Failed to delete admin user" });
  }
}

/**
 * Activate or deactivate an admin user
 */
export async function setAdminStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminId = parseInt(id);
    
    if (isNaN(adminId)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }
    
    // Validate the request body
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }
    
    // Check if admin exists
    const existingAdmin = await db.query.admins.findFirst({
      where: eq(admins.id, adminId)
    });
    
    if (!existingAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    // Update the admin status
    const updatedAdmin = await db.update(admins)
      .set({
        isActive,
        updatedAt: new Date()
      })
      .where(eq(admins.id, adminId))
      .returning();
    
    res.json(updatedAdmin[0]);
  } catch (error) {
    console.error("Error updating admin status:", error);
    res.status(500).json({ message: "Failed to update admin status" });
  }
}

/**
 * Get an admin by wallet address
 */
export async function getAdminByWallet(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address is required" });
    }
    
    // Find the admin by wallet address
    const admin = await db.query.admins.findFirst({
      where: eq(admins.walletAddress, walletAddress)
    });
    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    res.json(admin);
  } catch (error) {
    console.error("Error fetching admin by wallet:", error);
    res.status(500).json({ message: "Failed to fetch admin user" });
  }
}

/**
 * Initialize default admin (for first-time setup)
 * This adds the specified wallet address as a super admin if no admins exist
 */
export async function initializeDefaultAdmin(walletAddress: string = '6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ'): Promise<boolean> {
  try {
    // Check if there are any existing admins
    const adminCount = await db.query.admins.findMany({
      limit: 1
    });
    
    // If there are no admins, create a default super admin
    if (adminCount.length === 0) {
      console.log(`Creating default super admin with wallet: ${walletAddress}`);
      
      await db.insert(admins).values({
        walletAddress,
        name: 'System Admin',
        role: ADMIN_ROLES.SUPER_ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Default super admin created successfully');
      return true;
    }
    
    console.log('Admin initialization skipped - existing admins found');
    return false;
  } catch (error) {
    console.error('Error initializing default admin:', error);
    return false;
  }
}

/**
 * Check if current user is an admin
 */
export async function checkAdminStatus(req: Request, res: Response) {
  try {
    const walletAddress = req.headers["x-wallet-address"] as string;
    
    if (!walletAddress) {
      return res.status(401).json({ 
        isAdmin: false,
        message: "Wallet address is required"
      });
    }
    
    // Find the admin by wallet address
    const admin = await db.query.admins.findFirst({
      where: eq(admins.walletAddress, walletAddress)
    });
    
    if (!admin || !admin.isActive) {
      return res.json({
        isAdmin: false,
        message: "User is not an admin or admin account is inactive"
      });
    }
    
    // Return admin status with role information
    return res.json({
      isAdmin: true,
      admin: {
        id: admin.id,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        walletAddress: admin.walletAddress
      }
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ 
      isAdmin: false,
      message: "Failed to check admin status"
    });
  }
}

/**
 * Get all transactions for admin dashboard
 */
export async function getAllTransactions(req: Request, res: Response) {
  try {
    // Optional filtering parameters
    const { status, type, token, fromDate, toDate, limit } = req.query;
    
    // Get all transactions
    const allTransactions = await db.query.transactions.findMany({
      orderBy: (transactions, { desc }) => [desc(transactions.createdAt)]
    });
    
    // Apply filters if provided
    let filteredTransactions = allTransactions;
    
    if (status) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.status === status
      );
    }
    
    if (type) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.type === type
      );
    }
    
    if (token) {
      filteredTransactions = filteredTransactions.filter(tx => 
        tx.token === token
      );
    }
    
    if (fromDate) {
      const fromDateTime = new Date(fromDate as string).getTime();
      filteredTransactions = filteredTransactions.filter(tx => 
        new Date(tx.createdAt).getTime() >= fromDateTime
      );
    }
    
    if (toDate) {
      const toDateTime = new Date(toDate as string).getTime();
      filteredTransactions = filteredTransactions.filter(tx => 
        new Date(tx.createdAt).getTime() <= toDateTime
      );
    }
    
    // Apply limit if provided
    if (limit && !isNaN(parseInt(limit as string))) {
      const limitNum = parseInt(limit as string);
      filteredTransactions = filteredTransactions.slice(0, limitNum);
    }
    
    res.json(filteredTransactions);
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
}

/**
 * Get platform statistics for admin dashboard
 */
export async function getPlatformStats(req: Request, res: Response) {
  try {
    // Get all transactions
    const allTransactions = await db.query.transactions.findMany();
    
    // Get all makers
    const allMakers = await db.query.makers.findMany();
    
    // Get all offers
    const allOffers = await db.query.offers.findMany();
    
    // Calculate statistics
    const stats = {
      totalTransactions: allTransactions.length,
      totalVolume: calculateTotalVolume(allTransactions),
      activeOffers: allOffers.filter(offer => offer.status === 'active').length,
      totalMakers: allMakers.length,
      
      // Status breakdown
      statusBreakdown: {
        completed: allTransactions.filter(tx => tx.status === 'completed').length,
        pending: allTransactions.filter(tx => tx.status === 'pending').length,
        searching: allTransactions.filter(tx => tx.status === 'searching').length,
        matched: allTransactions.filter(tx => tx.status === 'matched').length,
        verification: allTransactions.filter(tx => tx.status === 'verification').length,
        dispute: allTransactions.filter(tx => tx.status === 'dispute').length,
        cancelled: allTransactions.filter(tx => tx.status === 'cancelled').length,
        failed: allTransactions.filter(tx => tx.status === 'failed').length
      },
      
      // Token breakdown
      tokenBreakdown: calculateTokenBreakdown(allTransactions),
      
      // Recent activity (last 30 days)
      recentActivity: calculateRecentActivity(allTransactions),
      
      // Top makers by volume
      topMakers: calculateTopMakers(allTransactions, allMakers)
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error getting platform stats:", error);
    res.status(500).json({ message: "Failed to fetch platform statistics" });
  }
}

/**
 * Manually update transaction status (admin only)
 */
export async function updateTransactionStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const transactionId = parseInt(id);
    
    if (isNaN(transactionId)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }
    
    // Validate the request body
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    // Check if transaction exists
    const existingTransaction = await db.query.transactions.findFirst({
      where: eq(transactionsTable.id, transactionId)
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    // Update the transaction status
    const updatedTransaction = await db.update(transactionsTable)
      .set({
        status,
        ...(reason && { failureReason: reason }),
        updatedAt: new Date()
      })
      .where(eq(transactionsTable.id, transactionId))
      .returning();
    
    // Add a system message about the status change
    try {
      const content = `Admin has changed transaction status to ${status}${reason ? `: ${reason}` : ''}`;
      
      await db.insert(messagesTable).values({
        transactionId,
        senderAddress: 'SYSTEM',
        receiverAddress: existingTransaction.walletAddress,
        content,
        status: 'sent',
        systemMessage: true,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Also notify the counterparty if present
      if (existingTransaction.counterpartyAddress) {
        await db.insert(messagesTable).values({
          transactionId,
          senderAddress: 'SYSTEM',
          receiverAddress: existingTransaction.counterpartyAddress,
          content,
          status: 'sent',
          systemMessage: true,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      console.log(`✅ System messages sent for transaction ${transactionId} status update`);
    } catch (msgError) {
      console.error(`❌ Error sending system messages for transaction ${transactionId}:`, msgError);
      // Don't fail the whole request if just the messages fail
    }
    
    res.json(updatedTransaction[0]);
  } catch (error) {
    console.error("Error updating transaction status:", error);
    res.status(500).json({ message: "Failed to update transaction status" });
  }
}

/**
 * Resolve a dispute (admin only)
 */
export async function resolveDispute(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const transactionId = parseInt(id);
    
    if (isNaN(transactionId)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }
    
    // Validate the request body
    const { resolution, reason, infavor } = req.body;
    
    if (!resolution || !infavor) {
      return res.status(400).json({ message: "Resolution and in-favor party are required" });
    }
    
    // Check if transaction exists and is in dispute status
    const existingTransaction = await db.query.transactions.findFirst({
      where: eq(transactionsTable.id, transactionId)
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    if (existingTransaction.status !== 'dispute') {
      return res.status(400).json({ message: "Transaction is not in dispute status" });
    }
    
    // Update the transaction status based on resolution
    let newStatus = 'completed'; // Default to completed for 'release'
    if (resolution === 'refund' || resolution === 'cancel') {
      newStatus = 'cancelled';
    }
    
    const updatedTransaction = await db.update(transactionsTable)
      .set({
        status: newStatus,
        platformApproval: true,
        updatedAt: new Date(),
        ...(reason && { failureReason: reason })
      })
      .where(eq(transactionsTable.id, transactionId))
      .returning();
    
    // Send system messages to both parties
    try {
      const content = `Dispute resolved by admin: ${resolution}${reason ? ` - ${reason}` : ''}. Resolution in favor of ${infavor}.`;
      
      // Message to taker
      await db.insert(messagesTable).values({
        transactionId,
        senderAddress: 'SYSTEM',
        receiverAddress: existingTransaction.walletAddress,
        content,
        status: 'sent',
        systemMessage: true,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Message to maker
      if (existingTransaction.counterpartyAddress) {
        await db.insert(messagesTable).values({
          transactionId,
          senderAddress: 'SYSTEM',
          receiverAddress: existingTransaction.counterpartyAddress,
          content,
          status: 'sent',
          systemMessage: true,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      console.log(`✅ Dispute resolution messages sent for transaction ${transactionId}`);
    } catch (msgError) {
      console.error(`❌ Error sending dispute resolution messages for transaction ${transactionId}:`, msgError);
      // Don't fail the whole request if just the messages fail
    }
    
    res.json(updatedTransaction[0]);
  } catch (error) {
    console.error("Error resolving dispute:", error);
    res.status(500).json({ message: "Failed to resolve dispute" });
  }
}

/**
 * Helper function to calculate total volume by currency
 */
function calculateTotalVolume(transactions: any[]): Record<string, number> {
  // Group by currency and sum amounts
  const volumeByCurrency: Record<string, number> = {};
  
  transactions.forEach(tx => {
    const currency = tx.fiatCurrency || 'USD';
    const amount = parseFloat(tx.amount) || 0;
    
    if (tx.status === 'completed') {
      if (volumeByCurrency[currency]) {
        volumeByCurrency[currency] += amount;
      } else {
        volumeByCurrency[currency] = amount;
      }
    }
  });
  
  // Round the values to 2 decimal places
  Object.keys(volumeByCurrency).forEach(currency => {
    volumeByCurrency[currency] = Math.round(volumeByCurrency[currency] * 100) / 100;
  });
  
  return volumeByCurrency;
}

/**
 * Helper function to calculate token breakdown
 */
function calculateTokenBreakdown(transactions: any[]): Record<string, number> {
  // Count transactions by token
  const tokenCounts: Record<string, number> = {};
  
  transactions.forEach(tx => {
    const token = tx.token || 'Unknown';
    
    if (tokenCounts[token]) {
      tokenCounts[token]++;
    } else {
      tokenCounts[token] = 1;
    }
  });
  
  return tokenCounts;
}

/**
 * Helper function to calculate recent activity (last 30 days)
 */
function calculateRecentActivity(transactions: any[]): { date: string; count: number }[] {
  // Group transactions by day for the last 30 days
  const activityByDay: Record<string, number> = {};
  const today = new Date();
  
  // Initialize all days in the last 30 days with 0 count
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    activityByDay[dateString] = 0;
  }
  
  // Count transactions by day
  transactions.forEach(tx => {
    const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
    const txTime = new Date(tx.createdAt).getTime();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (txTime >= thirtyDaysAgo.getTime() && activityByDay[txDate] !== undefined) {
      activityByDay[txDate]++;
    }
  });
  
  // Convert to array for charting
  return Object.keys(activityByDay)
    .sort()
    .map(date => ({
      date,
      count: activityByDay[date]
    }));
}

/**
 * Helper function to calculate top makers by volume
 */
function calculateTopMakers(transactions: any[], makers: any[]): { id: number; walletAddress: string; volumeByCurrency: Record<string, number>; transactionCount: number }[] {
  // Calculate total volume by maker
  const makerVolumes: Record<string, { volumeByCurrency: Record<string, number>; transactionCount: number }> = {};
  
  transactions.forEach(tx => {
    const makerAddress = tx.makerWalletAddress;
    
    if (!makerAddress) return;
    
    if (!makerVolumes[makerAddress]) {
      makerVolumes[makerAddress] = {
        volumeByCurrency: {},
        transactionCount: 0
      };
    }
    
    const currency = tx.fiatCurrency || 'USD';
    const amount = parseFloat(tx.amount) || 0;
    
    if (tx.status === 'completed') {
      // Increment transaction count
      makerVolumes[makerAddress].transactionCount++;
      
      // Add to volume by currency
      if (makerVolumes[makerAddress].volumeByCurrency[currency]) {
        makerVolumes[makerAddress].volumeByCurrency[currency] += amount;
      } else {
        makerVolumes[makerAddress].volumeByCurrency[currency] = amount;
      }
    }
  });
  
  // Match with maker details and sort by total volume
  const topMakers = Object.keys(makerVolumes).map(walletAddress => {
    const maker = makers.find(m => m.walletAddress === walletAddress);
    
    return {
      id: maker?.id || 0,
      walletAddress,
      volumeByCurrency: makerVolumes[walletAddress].volumeByCurrency,
      transactionCount: makerVolumes[walletAddress].transactionCount
    };
  });
  
  // Sort by transaction count (descending)
  return topMakers.sort((a, b) => b.transactionCount - a.transactionCount);
}