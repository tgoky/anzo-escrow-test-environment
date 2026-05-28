import { Request, Response } from 'express';
import { storage } from '../storage';
import { USER_RISK_CATEGORIES } from '@shared/schema';

/**
 * Get the risk profile for a wallet address
 */
export async function getRiskProfile(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Get maker record (will create one if doesn't exist with default medium risk)
    let maker = await storage.getMakerByWallet(walletAddress);
    
    if (!maker) {
      // Create a maker profile with default medium risk
      maker = await storage.createMaker({
        walletAddress,
        isActive: true,
        riskCategory: USER_RISK_CATEGORIES.MEDIUM,
        riskScore: 50, // Default middle score
        riskFactors: { 
          lastUpdated: new Date().toISOString(),
          factorBreakdown: {
            transactionHistory: 'Not enough history',
            accountAge: 'New account',
            verificationStatus: 'Not verified'
          }
        }
      });
      console.log(`[Risk API] Created new maker profile with default risk for ${walletAddress}`);
    }

    // Get risk profile
    const riskProfile = await storage.getMakerRiskProfile(walletAddress);
    
    if (!riskProfile) {
      return res.status(404).json({ error: 'Risk profile not found' });
    }
    
    return res.status(200).json({
      walletAddress,
      riskCategory: riskProfile.riskCategory || USER_RISK_CATEGORIES.MEDIUM,
      riskScore: riskProfile.riskScore || 50,
      riskFactors: riskProfile.riskFactors || {
        lastUpdated: new Date().toISOString(),
        factorBreakdown: {
          transactionHistory: 'Not enough history',
          accountAge: 'New account',
          verificationStatus: 'Not verified'
        }
      }
    });
  } catch (error) {
    console.error('[Risk API] Error getting risk profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update the risk profile for a wallet address (admin only)
 */
export async function updateRiskProfile(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    const { riskCategory, riskScore, riskFactors } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate risk category
    if (riskCategory && ![USER_RISK_CATEGORIES.LOW, USER_RISK_CATEGORIES.MEDIUM, USER_RISK_CATEGORIES.HIGH].includes(riskCategory)) {
      return res.status(400).json({ error: 'Invalid risk category' });
    }

    // Validate risk score
    if (riskScore !== undefined && (typeof riskScore !== 'number' || riskScore < 0 || riskScore > 100)) {
      return res.status(400).json({ error: 'Risk score must be a number between 0 and 100' });
    }

    // Get existing maker
    const maker = await storage.getMakerByWallet(walletAddress);
    
    if (!maker) {
      return res.status(404).json({ error: 'Maker not found' });
    }

    // Update risk profile
    const updatedMaker = await storage.updateMakerRiskProfile(walletAddress, {
      riskCategory: riskCategory || maker.riskCategory || USER_RISK_CATEGORIES.MEDIUM,
      riskScore: riskScore !== undefined ? riskScore : maker.riskScore,
      riskFactors: riskFactors || maker.riskFactors
    });
    
    return res.status(200).json({
      walletAddress,
      riskCategory: updatedMaker.riskCategory,
      riskScore: updatedMaker.riskScore,
      riskFactors: updatedMaker.riskFactors,
      updated: true
    });
  } catch (error) {
    console.error('[Risk API] Error updating risk profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Calculate a risk score based on transaction history (this would be more complex in production)
 */
export async function calculateRiskScore(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Get maker
    const maker = await storage.getMakerByWallet(walletAddress);
    
    if (!maker) {
      return res.status(404).json({ error: 'Maker not found' });
    }

    // Get transaction history
    const transactions = await storage.getTransactionsByWallet(walletAddress);
    
    // Simple algorithm to calculate risk score (this would be more sophisticated in production)
    let riskScore = 50; // Default medium risk
    
    // Factor 1: Number of transactions
    const transactionCount = transactions.length;
    if (transactionCount > 20) {
      riskScore -= 15; // Lower risk with more transaction history
    } else if (transactionCount > 10) {
      riskScore -= 10;
    } else if (transactionCount > 5) {
      riskScore -= 5;
    }
    
    // Factor 2: Successful transactions ratio
    const completedTransactions = transactions.filter(t => t.status === 'completed').length;
    const successRatio = transactionCount > 0 ? completedTransactions / transactionCount : 0;
    
    if (successRatio > 0.9) {
      riskScore -= 15; // Lower risk with high success rate
    } else if (successRatio > 0.8) {
      riskScore -= 10;
    } else if (successRatio > 0.7) {
      riskScore -= 5;
    } else if (successRatio < 0.5 && transactionCount > 3) {
      riskScore += 15; // Higher risk with low success rate
    }
    
    // Factor 3: Disputes
    const disputeCount = transactions.filter(t => t.status === 'dispute').length;
    if (disputeCount > 2) {
      riskScore += 25; // Higher risk with multiple disputes
    } else if (disputeCount > 0) {
      riskScore += 15;
    }

    // Clamp score between 0-100
    riskScore = Math.max(0, Math.min(100, riskScore));
    
    // Determine risk category based on score
    let riskCategory: "low" | "medium" | "high" = USER_RISK_CATEGORIES.MEDIUM;
    if (riskScore < 30) {
      riskCategory = USER_RISK_CATEGORIES.LOW as "low";
    } else if (riskScore > 70) {
      riskCategory = USER_RISK_CATEGORIES.HIGH as "high";
    }
    
    // Create risk factors explanation
    const riskFactors = {
      lastUpdated: new Date().toISOString(),
      factorBreakdown: {
        transactionHistory: `${transactionCount} total transactions`,
        completionRate: `${Math.round(successRatio * 100)}% completion rate`,
        disputes: `${disputeCount} disputes`
      }
    };
    
    // Update risk profile in database
    await storage.updateMakerRiskProfile(walletAddress, {
      riskCategory,
      riskScore,
      riskFactors
    });
    
    return res.status(200).json({
      walletAddress,
      riskCategory,
      riskScore,
      riskFactors,
      calculated: true
    });
  } catch (error) {
    console.error('[Risk API] Error calculating risk score:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}