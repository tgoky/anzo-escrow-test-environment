import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertMessageSchema } from '../../shared/schema';

/**
 * Get all messages for a specific transaction
 */
export async function getMessagesByTransactionId(req: Request, res: Response) {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID is required' });
    }
    
    const parsedId = parseInt(transactionId);
    if (isNaN(parsedId)) {
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }
    
    const messages = await storage.getMessagesByTransactionId(parsedId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ message: 'Failed to retrieve messages' });
  }
}

/**
 * Send a new message for a transaction
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    const messageSchema = insertMessageSchema.extend({
      transactionId: z.number(),
      sender: z.string(),
      receiver: z.string(),
      content: z.string().min(1),
      isSystem: z.boolean().optional()
    });
    
    const validationResult = messageSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid message data',
        errors: validationResult.error.format() 
      });
    }
    
    const messageData = validationResult.data;
    
    // Verify the transaction exists
    const transaction = await storage.getTransaction(messageData.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Verify the sender is part of the transaction
    if (
      transaction.walletAddress !== messageData.sender && 
      transaction.counterpartyAddress !== messageData.sender
    ) {
      return res.status(403).json({ message: 'Sender is not part of this transaction' });
    }
    
    // Set isSystem to false if not provided
    if (messageData.isSystem === undefined) {
      messageData.isSystem = false;
    }
    
    const message = await storage.createMessage(messageData);
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
}

/**
 * Mark messages as read for a specific transaction and receiver
 */
export async function markMessagesAsRead(req: Request, res: Response) {
  try {
    const { transactionId } = req.params;
    const { receiverAddress } = req.body;
    
    if (!transactionId || !receiverAddress) {
      return res.status(400).json({ message: 'Transaction ID and receiver address are required' });
    }
    
    const parsedId = parseInt(transactionId);
    if (isNaN(parsedId)) {
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }
    
    await storage.markMessagesAsRead(parsedId, receiverAddress);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }
    
    const count = await storage.getUnreadMessageCount(walletAddress);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread message count:', error);
    res.status(500).json({ message: 'Failed to get unread message count' });
  }
}

/**
 * Get unread message counts per transaction for a user
 */
export async function getUnreadMessageCountsByTransactions(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }
    
    // If transaction IDs are provided in the query, filter by them
    let transactionIds: number[] | undefined = undefined;
    if (req.query.transactionIds) {
      const idsString = req.query.transactionIds as string;
      transactionIds = idsString.split(',').map(id => parseInt(id.trim()));
      
      // Validate that all IDs are valid numbers
      if (transactionIds.some(id => isNaN(id))) {
        return res.status(400).json({ message: 'Invalid transaction ID format in the list' });
      }
    }
    
    const counts = await storage.getUnreadMessageCountsByTransactions(walletAddress, transactionIds);
    res.json(counts);
  } catch (error) {
    console.error('Error getting unread message counts by transactions:', error);
    res.status(500).json({ message: 'Failed to get unread message counts' });
  }
}

/**
 * Send a system message for a transaction
 */
export async function sendSystemMessage(req: Request, res: Response) {
  try {
    const { transactionId, content } = req.body;
    
    if (!transactionId || !content) {
      return res.status(400).json({ message: 'Transaction ID and content are required' });
    }
    
    const parsedId = parseInt(transactionId);
    if (isNaN(parsedId)) {
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }
    
    // Get the transaction to find the participants
    const transaction = await storage.getTransaction(parsedId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // System messages are sent to both parties
    const messageData = {
      transactionId: parsedId,
      sender: 'system',
      receiver: transaction.walletAddress,
      content,
      isSystem: true
    };
    
    // Create message for maker
    await storage.createMessage(messageData);
    
    // If there's a counterparty, create message for them too
    if (transaction.counterpartyAddress) {
      const counterpartyMessage = {
        ...messageData,
        receiver: transaction.counterpartyAddress
      };
      await storage.createMessage(counterpartyMessage);
    }
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error sending system message:', error);
    res.status(500).json({ message: 'Failed to send system message' });
  }
}