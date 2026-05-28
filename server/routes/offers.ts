import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertOfferSchema } from '@shared/schema';
import { z } from 'zod';

/**
 * Create a new offer
 */
export async function createOffer(req: Request, res: Response) {
  try {
    console.log("Raw offer data received:", req.body);
    
    // Check if financialAccountId exists in the request
    console.log("Financial Account ID:", req.body.financialAccountId);
    
    const offerData = insertOfferSchema.parse(req.body);
    
    console.log("Validated offer data:", offerData);
    
    // Check if maker exists, if not create one
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
    
    const offer = await storage.createOffer(offerData);
    
    res.status(201).json(offer);
  } catch (error) {
    console.error("Error creating offer:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid offer data",
        errors: error.errors
      });
    }
    res.status(500).json({ message: "Failed to create offer", error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Get offer by ID
 */
export async function getOfferById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log('[GET /api/offers] Fetching offer by ID:', id);
    
    const offerId = parseInt(id);
    if (isNaN(offerId)) {
      console.warn('[GET /api/offers] Invalid offer ID format:', id);
      return res.status(400).json({ message: "Invalid offer ID format" });
    }
    
    const offer = await storage.getOfferById(offerId);
    
    if (!offer) {
      console.warn('[GET /api/offers] Offer not found with ID:', offerId);
      return res.status(404).json({ message: "Offer not found" });
    }
    
    // Create a copy of the offer to avoid modifying the original
    const enhancedOffer = { ...offer };

    // Check if the offer has financial account details and parse them
    if (enhancedOffer.makerFinancialAccountDetails) {
      console.log("[GET /api/offers] Offer has financial account details:", 
          typeof enhancedOffer.makerFinancialAccountDetails);

      // If it's a string, try to parse it as JSON
      if (typeof enhancedOffer.makerFinancialAccountDetails === 'string') {
        try {
          enhancedOffer.makerFinancialAccountDetails = JSON.parse(enhancedOffer.makerFinancialAccountDetails);
        } catch (error) {
          console.error("[GET /api/offers] Error parsing financial account details:", error);
          // If parsing fails, keep it as is or set to null depending on requirements
        }
      }
    }

    // Process payment methods
    if (enhancedOffer.paymentMethods) {
      // If it's a string, try to parse it as JSON
      if (typeof enhancedOffer.paymentMethods === 'string') {
        try {
          enhancedOffer.paymentMethods = JSON.parse(enhancedOffer.paymentMethods);
        } catch (error) {
          console.error("[GET /api/offers] Error parsing payment methods:", error);
          // If parsing fails, try to split by comma
          if (typeof enhancedOffer.paymentMethods === 'string') {
            enhancedOffer.paymentMethods = enhancedOffer.paymentMethods
              .split(',')
              .map(method => method.trim());
          }
        }
      }
      // Ensure it's an array
      if (!Array.isArray(enhancedOffer.paymentMethods)) {
        console.warn("[GET /api/offers] Offer has no payment methods array, converting to array");
        enhancedOffer.paymentMethods = [];
      }
    } else {
      enhancedOffer.paymentMethods = [];
    }

    // Process restrictions if needed
    if (enhancedOffer.restrictions && typeof enhancedOffer.restrictions === 'string') {
      try {
        enhancedOffer.restrictions = JSON.parse(enhancedOffer.restrictions);
      } catch (error) {
        console.error("[GET /api/offers] Error parsing restrictions:", error);
        enhancedOffer.restrictions = {};
      }
    } else if (!enhancedOffer.restrictions) {
      // Create restrictions object and add min/max order amounts if they exist
      enhancedOffer.restrictions = {};
      
      // Add minAmount if available
      if (enhancedOffer.minOrderAmount) {
        enhancedOffer.restrictions.minAmount = String(enhancedOffer.minOrderAmount);
        console.log(`[GET /api/offers] Added min order amount: ${enhancedOffer.restrictions.minAmount}`);
      }
      
      // Add maxAmount if available
      if (enhancedOffer.maxOrderAmount) {
        enhancedOffer.restrictions.maxAmount = String(enhancedOffer.maxOrderAmount);
        console.log(`[GET /api/offers] Added max order amount: ${enhancedOffer.restrictions.maxAmount}`);
      }
      
      // Add any existing available regions to restrictions
      if (enhancedOffer.availableRegions) {
        enhancedOffer.restrictions.allowedCountries = 
          Array.isArray(enhancedOffer.availableRegions) 
            ? enhancedOffer.availableRegions 
            : [];
      }
    }

    // Process maker details if needed
    if (enhancedOffer.makerDetails && typeof enhancedOffer.makerDetails === 'string') {
      try {
        enhancedOffer.makerDetails = JSON.parse(enhancedOffer.makerDetails);
      } catch (error) {
        console.error("[GET /api/offers] Error parsing maker details:", error);
        enhancedOffer.makerDetails = {};
      }
    }

    // Add amount structure if needed
    if (enhancedOffer.amount && typeof enhancedOffer.amount === 'string' && enhancedOffer.lockedAmount) {
      const total = enhancedOffer.amount;
      const locked = enhancedOffer.lockedAmount || '0';
      const available = (parseFloat(total) - parseFloat(locked)).toString();
      
      enhancedOffer.amount = {
        total,
        pending: locked,
        available
      };
    }

    console.log('[GET /api/offers] Returning offer:', enhancedOffer);
    res.json(enhancedOffer);
  } catch (error) {
    console.error("[GET /api/offers] Error fetching offer:", error);
    res.status(500).json({ message: "Error fetching offer details" });
  }
}

/**
 * Get offers by wallet address
 */
export async function getOffersByWallet(req: Request, res: Response) {
  try {
    const walletAddress = req.params.walletAddress;
    
    console.log("🔍 [API] getOffersByWallet called with params:", req.params);
    console.log("🔍 [API] Wallet address:", walletAddress);
    console.log("🔍 [API] Wallet address type:", typeof walletAddress);
    
    if (!walletAddress) {
      console.log("⚠️ [API] Wallet address is missing in request params");
      return res.status(400).json({ message: "Wallet address is required" });
    }
    
    // Get all offers for this wallet address
    const offers = await storage.getOffersByWallet(walletAddress);
    
    console.log(`✅ [API] Found ${offers.length} offers for wallet ${walletAddress}`);
    if (offers.length > 0) {
      console.log("🧩 [API] First offer sample:", JSON.stringify(offers[0], null, 2).substring(0, 200) + "...");
    }
    
    // Process offers to include restrictions objects from min/max order amounts
    const processedOffers = offers.map(offer => {
      const processedOffer = { ...offer };
      
      // Add restrictions if they don't exist
      if (!processedOffer.restrictions) {
        processedOffer.restrictions = {};
        
        // Add minAmount if available
        if (processedOffer.minOrderAmount) {
          processedOffer.restrictions.minAmount = String(processedOffer.minOrderAmount);
          console.log(`[getOffersByWallet] Added min order amount: ${processedOffer.restrictions.minAmount}`);
        }
        
        // Add maxAmount if available
        if (processedOffer.maxOrderAmount) {
          processedOffer.restrictions.maxAmount = String(processedOffer.maxOrderAmount);
          console.log(`[getOffersByWallet] Added max order amount: ${processedOffer.restrictions.maxAmount}`);
        }
        
        // Add any existing available regions to restrictions
        if (processedOffer.availableRegions) {
          processedOffer.restrictions.allowedCountries = 
            Array.isArray(processedOffer.availableRegions) 
              ? processedOffer.availableRegions 
              : [];
        }
      }
      
      return processedOffer;
    });
    
    return res.json(processedOffers);
  } catch (error) {
    console.error("❌ [API] Error getting offers by wallet:", error);
    return res.status(500).json({ 
      message: "Failed to get offers",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get active offers with optional filters
 */
export async function getActiveOffers(req: Request, res: Response) {
  try {
    console.log("[GET /api/offers/active] Request query:", req.query);
    console.log("[GET /api/offers/active] Request query types:", {
      type: typeof req.query.type,
      token: typeof req.query.token,
      fiatCurrency: typeof req.query.fiatCurrency,
      paymentMethod: typeof req.query.paymentMethod
    });
    
    // Handle empty and "all" values as undefined to ignore these in the filter
    let { type, token, fiatCurrency, paymentMethod } = req.query as {
      type?: string;
      token?: string;
      fiatCurrency?: string;
      paymentMethod?: string; 
    };
    
    // Set default type to "buy" if not provided or invalid
    if (!type || type === 'all' || type === '') {
      console.log('[GET /api/offers/active] Type is empty or "all", defaulting to "buy"');
      type = 'buy';
    }

    // Normalize type to be lowercase
    type = (typeof type === 'string' ? type : '').toLowerCase();
    
    // Convert empty values and 'all' to undefined (no filter)
    if (!token || token === 'all' || token === '') token = undefined;
    if (!fiatCurrency || fiatCurrency === 'all' || fiatCurrency === '') fiatCurrency = undefined;
    if (!paymentMethod || paymentMethod === 'all' || paymentMethod === '') paymentMethod = undefined;
    
    console.log(`[GET /api/offers/active] Filtered query params:`, { type, token, fiatCurrency, paymentMethod });
    
    try {
      // Get all active offers matching the base criteria
      const offers = await storage.getActiveOffers(type, token, fiatCurrency);
      console.log(`[GET /api/offers/active] Found ${offers.length} offers before payment method filtering`);
      
      if (offers.length === 0) {
        console.log('[GET /api/offers/active] No offers found, returning empty array');
        return res.json([]);
      }
      
      // Process payment methods for sample offer to debug format
      if (offers.length > 0) {
        const sampleOffer = offers[0];
        console.log(`[GET /api/offers/active] Sample offer payment methods:`, sampleOffer.paymentMethods);
        console.log(`[GET /api/offers/active] Sample offer payment methods type:`, typeof sampleOffer.paymentMethods);
      }
      
      // If paymentMethod is specified, filter offers that include that payment method
      let filteredOffers = offers;
      if (paymentMethod) {
        console.log(`[GET /api/offers/active] Filtering by payment method: ${paymentMethod}`);
        
        filteredOffers = offers.filter(offer => {
          try {
            // Payment methods can be stored in different formats
            let methods: string[] = [];
            
            if (Array.isArray(offer.paymentMethods)) {
              methods = offer.paymentMethods;
            } else if (typeof offer.paymentMethods === 'string') {
              try {
                // Try to parse as JSON
                methods = JSON.parse(offer.paymentMethods);
              } catch (parseErr) {
                // If parsing fails, handle as string or empty array
                const methodsString = offer.paymentMethods as string;
                if (typeof methodsString === 'string') {
                  methods = methodsString.split(',').map((m: string) => m.trim());
                } else {
                  methods = [];
                }
              }
            } else if (offer.paymentMethods && typeof offer.paymentMethods === 'object') {
              // Handle case where it's already an object but not an array
              methods = Object.values(offer.paymentMethods);
            }
            
            // Log the parsed methods for debugging
            console.log(`[GET /api/offers/active] Offer ${offer.id} parsed payment methods:`, methods);
            
            return methods.some(m => m === paymentMethod || m.includes(paymentMethod));
          } catch (err) {
            console.error(`[GET /api/offers/active] Error processing payment methods for offer ${offer.id}:`, err);
            return false;
          }
        });
        
        console.log(`[GET /api/offers/active] After payment method filtering: ${filteredOffers.length} offers`);
      }
      
      // Process offers for consistent format
      const processedOffers = filteredOffers.map(offer => {
        let processedOffer = { ...offer };
        
        // Ensure payment methods is always an array
        try {
          if (!Array.isArray(processedOffer.paymentMethods)) {
            if (typeof processedOffer.paymentMethods === 'string') {
              try {
                processedOffer.paymentMethods = JSON.parse(processedOffer.paymentMethods);
              } catch (e) {
                const methodsString = processedOffer.paymentMethods as string;
                if (typeof methodsString === 'string') {
                  processedOffer.paymentMethods = methodsString.split(',').map((m: string) => m.trim());
                } else {
                  processedOffer.paymentMethods = [];
                }
              }
            } else if (!processedOffer.paymentMethods) {
              processedOffer.paymentMethods = [];
            }
          }
        } catch (e) {
          console.error(`[GET /api/offers/active] Error normalizing payment methods:`, e);
          processedOffer.paymentMethods = [];
        }
        
        // Add restrictions object with min/max order amounts
        if (!processedOffer.restrictions) {
          processedOffer.restrictions = {};
          
          // Add minAmount if available
          if (processedOffer.minOrderAmount) {
            processedOffer.restrictions.minAmount = String(processedOffer.minOrderAmount);
            console.log(`[GET /api/offers/active] Added min order amount: ${processedOffer.restrictions.minAmount}`);
          }
          
          // Add maxAmount if available
          if (processedOffer.maxOrderAmount) {
            processedOffer.restrictions.maxAmount = String(processedOffer.maxOrderAmount);
            console.log(`[GET /api/offers/active] Added max order amount: ${processedOffer.restrictions.maxAmount}`);
          }
          
          // Add any existing available regions to restrictions
          if (processedOffer.availableRegions) {
            processedOffer.restrictions.allowedCountries = 
              Array.isArray(processedOffer.availableRegions) 
                ? processedOffer.availableRegions 
                : [];
          }
        }
        
        return processedOffer;
      });
      
      // Send the processed offers to the client
      res.json(processedOffers);
    } catch (storageError) {
      console.error("[GET /api/offers/active] Error from storage:", storageError);
      
      // Return empty array rather than error to prevent frontend from crashing
      res.json([]);
    }
  } catch (error) {
    console.error("Error getting active offers:", error);
    // Return empty array for client resiliency
    res.json([]);
  }
}

/**
 * Update offer status
 */
export async function updateOfferStatus(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }
    
    const { status } = req.body;
    
    if (!status || !['active', 'paused', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    
    const updatedOffer = await storage.updateOfferStatus(id, status);
    
    res.json(updatedOffer);
  } catch (error) {
    console.error("Error updating offer status:", error);
    res.status(500).json({ message: "Failed to update offer status" });
  }
}

/**
 * Update offer amount
 */
export async function updateOfferAmount(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }
    
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }
    
    const updatedOffer = await storage.updateOfferAmount(id, amount);
    
    res.json(updatedOffer);
  } catch (error) {
    console.error("Error updating offer amount:", error);
    res.status(500).json({ message: "Failed to update offer amount" });
  }
}

/**
 * Update offer visibility
 */
export async function updateOfferVisibility(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }
    
    const { visibility } = req.body;
    
    if (!visibility || !['public', 'private'].includes(visibility)) {
      return res.status(400).json({ message: "Invalid visibility value" });
    }
    
    const updatedOffer = await storage.updateOfferVisibility(id, visibility);
    
    res.json(updatedOffer);
  } catch (error) {
    console.error("Error updating offer visibility:", error);
    res.status(500).json({ message: "Failed to update offer visibility" });
  }
}

/**
 * Delete an offer
 */
export async function deleteOffer(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }
    
    await storage.deleteOffer(id);
    
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ message: "Failed to delete offer" });
  }
}

/**
 * Get pending transactions for an offer
 */
export async function getPendingTransactionsByOfferId(req: Request, res: Response) {
  try {
    const offerId = parseInt(req.params.offerId);
    
    if (isNaN(offerId)) {
      return res.status(400).json({ message: "Invalid offer ID" });
    }
    
    const transactions = await storage.getPendingTransactionsByOfferId(offerId);
    
    res.json(transactions);
  } catch (error) {
    console.error("Error getting pending transactions for offer:", error);
    res.status(500).json({ message: "Failed to get pending transactions" });
  }
}