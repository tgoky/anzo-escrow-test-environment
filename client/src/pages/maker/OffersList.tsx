import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Ban, 
  CheckCircle2, 
  DollarSign, 
  Loader2, 
  Lock, 
  Pencil, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Offer {
  id: string;
  makerId: number;
  walletAddress: string;
  type: 'buy' | 'sell';
  token: string;
  price: string;
  priceType: 'fixed' | 'market';
  amount: string | {
    total: string;
    pending: string;
    available: string;
  };
  lockedAmount?: string;
  fiatCurrency: string;
  paymentMethods: string[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  restrictions?: {
    minAmount?: string;
    maxAmount?: string;
    allowedCountries?: string[];
    requireVerified?: boolean;
    autoReplyEnabled?: boolean;
  };
}

interface OffersListProps {
  offers: Offer[];
  isLoading: boolean;
  onCreateOffer?: () => void;
  onToggleStatus?: (offerId: string, newStatus: 'active' | 'paused') => void;
  onEditOffer?: (offer: Offer) => void;
  onDeleteOffer?: (offerId: string) => void;
}

// Helper function to get the amount display
const getAmountDisplay = (offer: Offer) => {
  if (typeof offer.amount === 'string') {
    // Handle legacy string amount
    return {
      total: parseFloat(offer.amount),
      pending: offer.lockedAmount ? parseFloat(offer.lockedAmount) : 0,
      available: offer.lockedAmount ? 
        parseFloat(offer.amount) - parseFloat(offer.lockedAmount) : 
        parseFloat(offer.amount)
    };
  }
  
  // Handle structured amount object
  return {
    total: parseFloat(offer.amount.total),
    pending: parseFloat(offer.amount.pending),
    available: parseFloat(offer.amount.available)
  };
};

// Helper function to calculate value from amount and price
const calculateValue = (amount: number, price: string) => {
  return (amount * parseFloat(price)).toFixed(2);
};

// Type guard to check if amount is a string or an object
const isAmountString = (amount: string | {
  total: string;
  pending: string;
  available: string;
}): amount is string => {
  return typeof amount === 'string';
};

export default function OffersList({
  offers,
  isLoading,
  onCreateOffer,
  onToggleStatus,
  onEditOffer,
  onDeleteOffer
}: OffersListProps) {
  // Detailed logging for debugging
  console.log("🧐 OffersList - Rendering component");
  console.log("🧐 OffersList - Props received:", {
    offerCount: offers?.length || 0,
    isLoading,
    hasCreateOffer: typeof onCreateOffer === 'function',
    hasToggleStatus: typeof onToggleStatus === 'function',
    hasEditOffer: typeof onEditOffer === 'function',
    hasDeleteOffer: typeof onDeleteOffer === 'function',
  });
  
  const [location, setLocation] = useLocation();
  const buyOffers = offers.filter(offer => offer.type === 'buy');
  const sellOffers = offers.filter(offer => offer.type === 'sell');

  // Safe way to call onDeleteOffer
  const handleDeleteClick = (e: React.MouseEvent, offerId: string) => {
    e.stopPropagation();
    
    console.log("Delete clicked for offer ID:", offerId);
    console.log("onDeleteOffer is a function?", typeof onDeleteOffer === 'function');
    
    // Additional safety check
    if (typeof onDeleteOffer !== 'function') {
      console.error("Error: onDeleteOffer prop is not a function", onDeleteOffer);
      return;
    }
    
    // If we get here, it's safe to call
    onDeleteOffer(offerId);
  };

  // Render an offer card with consistent styling
  const renderOfferCard = (offer: Offer, isDefault = false) => {
    const amounts = getAmountDisplay(offer);
    const isBuyOffer = offer.type === 'buy';
    const iconColor = isBuyOffer ? 'text-green-500' : 'text-blue-500';
    const bgColor = isBuyOffer ? 'bg-green-500/10' : 'bg-blue-500/10';
    const Icon = isBuyOffer ? ArrowDownLeft : ArrowUpRight;
    
    return (
      <div
        key={offer.id}
        className="flex items-center justify-between p-6 bg-card border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
        onClick={() => setLocation(`/maker/offers/${offer.id}`)}
      >
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${bgColor} rounded-full`}>
              <Icon className={`w-8 h-8 ${iconColor}`} />
            </div>
            <div>
              <p className="font-medium text-base">
                {isBuyOffer ? 'Buy' : 'Sell'} {offer.token}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground">
                {offer.priceType === 'fixed' ? (
                  <DollarSign className="w-3 h-3" />
                ) : (
                  <ArrowUpRight className="w-3 h-3" />
                )}
                <p>
                  {offer.priceType === 'fixed' 
                    ? `${offer.price} ${offer.fiatCurrency || 'USD'}` 
                    : `Market ${parseFloat(offer.price) > 0 ? '+' : ''}${offer.price}%`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">Amount</span>
            <span className="text-sm text-muted-foreground">
              {amounts.total.toLocaleString()} {offer.token}
            </span>
            {amounts.pending > 0 && (
              <div className="flex items-center text-xs text-yellow-600 mt-1">
                <Lock className="w-3 h-3 mr-1" />
                <span>{amounts.pending.toLocaleString()} locked</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">Value</span>
            <span className="text-sm text-muted-foreground">
              {offer.priceType === 'fixed'
                ? `${calculateValue(amounts.total, offer.price)} ${offer.fiatCurrency || 'USD'}`
                : 'Market Price'
              }
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">Available</span>
            <span className="text-sm text-muted-foreground">
              {amounts.available.toLocaleString()} {offer.token}
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">Payment Method</span>
            <div className="flex gap-1">
              {offer.paymentMethods && offer.paymentMethods.length > 0 ? (
                <Badge variant="outline" className="text-xs">
                  {offer.paymentMethods[0]}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">None</Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={offer.status === 'active' ? 'default' : 'secondary'}>
            {offer.status}
          </Badge>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleStatus) {
                onToggleStatus(
                  offer.id, 
                  offer.status === 'active' ? 'paused' : 'active'
                );
              }
            }}
          >
            {offer.status === 'active' ? (
              <Ban className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              if (onEditOffer) {
                onEditOffer(offer);
              }
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => handleDeleteClick(e, offer.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          {/* Filter controls can be added here */}
        </div>
        <Button onClick={onCreateOffer}>
          <Plus className="mr-2 h-4 w-4" /> Create Offer
        </Button>
      </div>
      
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground">
            No offers found. Create your first offer to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Buy Offers Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5 text-green-500" /> Buy Offers
              </h3>
              {buyOffers.length > 0 ? (
                <div className="space-y-3">
                  {buyOffers.map(offer => renderOfferCard(offer))}
                </div>
              ) : (
                <div className="text-center p-4 border rounded-md text-muted-foreground">
                  No buy offers found. Create a buy offer to get started.
                </div>
              )}
            </div>
            
            {/* Sell Offers Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-blue-500" /> Sell Offers
              </h3>
              {sellOffers.length > 0 ? (
                <div className="space-y-3">
                  {sellOffers.map(offer => renderOfferCard(offer))}
                </div>
              ) : (
                <div className="text-center p-4 border rounded-md text-muted-foreground">
                  No sell offers found. Create a sell offer to get started.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}