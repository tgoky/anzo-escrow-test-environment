import { Request, Response } from 'express';
import { storage } from '../storage';

/**
 * Update transaction approval status by a party
 */
export async function updateTransactionApproval(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }
    
    const { approvalType, approved, reason } = req.body;
    
    if (!approvalType || !['maker', 'taker', 'platform'].includes(approvalType)) {
      return res.status(400).json({ message: "Invalid approval type" });
    }
    
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ message: "Approved must be a boolean" });
    }
    
    const transaction = await storage.updateTransactionApproval(id, approvalType, approved, reason);
    
    res.json(transaction);
  } catch (error) {
    console.error("Error updating transaction approval:", error);
    res.status(500).json({ message: "Failed to update transaction approval" });
  }
}

/**
 * Add payment evidence to a transaction
 */
export async function addPaymentEvidence(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }
    
    // Make evidence optional, use a default minimal evidence object if not provided
    const evidence = req.body.evidence || {
      type: "payment_made",
      timestamp: new Date().toISOString(),
      details: {
        status: "completed"
      }
    };
    
    console.log(`[Debug] Processing payment evidence for transaction ${id}:`, evidence);
    
    const transaction = await storage.addPaymentEvidence(id, evidence);
    
    res.json(transaction);
  } catch (error) {
    console.error("Error adding payment evidence:", error);
    res.status(500).json({ message: "Failed to add payment evidence" });
  }
}

/**
 * Raise a dispute for a transaction
 */
export async function raiseDispute(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }
    
    const { reason, evidence } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: "Dispute reason is required" });
    }
    
    const transaction = await storage.addDisputeEvidence(id, reason, evidence || []);
    
    res.json(transaction);
  } catch (error) {
    console.error("Error raising dispute:", error);
    res.status(500).json({ message: "Failed to raise dispute" });
  }
}

/**
 * Get transactions by offer ID
 */
export async function getTransactionsByOfferId(req: Request, res: Response) {
  try {
    const offerId = parseInt(req.params.offerId);
    
    if (isNaN(offerId)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }
    
    console.log(`[API] Fetching transactions for offer ID: ${offerId}`);
    const transactions = await storage.getTransactionsByOfferId(offerId);
    console.log(`[API] Found ${transactions.length} transactions for offer ${offerId}`);
    
    res.json(transactions);
  } catch (error) {
    console.error("Error getting transactions by offer ID:", error);
    res.status(500).json({ message: "Failed to get transactions" });
  }
}