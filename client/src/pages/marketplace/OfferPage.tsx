import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useWalletStore } from "@/lib/walletStore";
import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  DollarSign, 
  Loader2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  Share2, 
  ArrowLeft,
  Copy,
  Wallet,
  CreditCard,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { TradeDialog } from "@/components/marketplace/TradeDialog";
import { WalletDialog } from "@/components/exchange/WalletDialog";
import { AccountConnectionDialog } from "@/components/ui/account-connection-dialog";
import type { FinancialAccount } from '@shared/types/financial-account';

// Define marketplace offer type
interface MarketplaceOffer {
  id: number;
  makerId: number;
  walletAddress: string;
  type: 'buy' | 'sell';
  token: string;
  price: string;
  amount: string | {
    total: string;
    pending: string;
    available: string;
  };
  fiatCurrency: string;
  paymentMethods: string[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  restrictions?: {
    minAmount?: string;
    maxAmount?: string;
    allowedCountries?: string[];
    requireVerified?: boolean;
  };
  makerDetails?: {
    completionRate?: number;
    totalOrders?: number;
    avgResponseTime?: number; // in minutes
  };
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
  makerFinancialAccountDetails?: any;
}

// Helper to format payment methods
function formatPaymentMethod(method: string): string {
  if (!method) return 'Unknown';
  
  const methodMap: Record<string, string> = {
    'bank_transfer': 'Bank Transfer',
    'zelle': 'Zelle',
    'mpesa': 'M-Pesa',
    'paypal': 'PayPal',
    'cash_deposit': 'Cash Deposit',
    'venmo': 'Venmo',
    'cash_app': 'Cash App',
    'revolut': 'Revolut',
    'wise': 'Wise',
    'UPI': 'UPI',
    'paytm': 'Paytm',
    'alipay': 'Alipay',
    'wechat_pay': 'WeChat Pay'
  };

  if (methodMap[method.toLowerCase()]) {
    return methodMap[method.toLowerCase()];
  }
  
  return method
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to display time thresholds
function formatResponseTime(minutes: number): string {
  if (minutes < 1) return 'instantly';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

// Get the amount display for an offer
function getAmountDisplay(offer: MarketplaceOffer) {
  if (typeof offer.amount === 'string') {
    return {
      total: parseFloat(offer.amount),
      available: parseFloat(offer.amount) // Legacy offers don't track locked amounts separately
    };
  }
  
  return {
    total: parseFloat(offer.amount.total),
    available: parseFloat(offer.amount.available)
  };
}

export default function OfferPage() {
  const params = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Get wallet info
  const { connectedWallet } = useWalletStore();
  
  // Get connected accounts
  const { connectedAccounts, addAccount } = useFinancialAccountStore();
  
  // Flag to track if user is ready to trade
  const [isReadyToTrade, setIsReadyToTrade] = useState(false);
  
  // Extract offer ID from URL
  const offerId = params?.id ? parseInt(params.id) : null;
  
  // Set share URL
  useEffect(() => {
    if (offerId) {
      setShareUrl(window.location.href);
    }
  }, [offerId]);
  
  // Check if user is ready to trade
  useEffect(() => {
    if (connectedWallet && connectedAccounts.length > 0) {
      setIsReadyToTrade(true);
    } else {
      setIsReadyToTrade(false);
    }
  }, [connectedWallet, connectedAccounts]);
  
  // Handle account connection
  const handleAccountConnect = (account: FinancialAccount) => {
    addAccount(account);
    toast({
      title: "Account connected",
      description: `${account.accountName} has been connected successfully.`,
    });
  };
  
  // Copy share link to clipboard
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied",
      description: "Offer link has been copied to your clipboard.",
    });
  };
  
  // Fetch offer data
  const { data: offer, isLoading, error, refetch } = useQuery({
    queryKey: ['offer-details', offerId],
    queryFn: async () => {
      if (!offerId) throw new Error('No offer ID provided');
      
      try {
        const response = await axios.get(`/api/offers/${offerId}`);
        return response.data;
      } catch (err) {
        console.error('❌ Error fetching offer:', err);
        throw err;
      }
    },
    enabled: !!offerId,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false
  });
  
  // Handle trade button click
  const handleTradeClick = () => {
    if (!connectedWallet) {
      setWalletDialogOpen(true);
      return;
    }
    
    if (connectedAccounts.length === 0) {
      setPaymentDialogOpen(true);
      return;
    }
    
    setTradeDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="container py-24 max-w-3xl mx-auto px-4">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }
  
  if (error || !offer) {
    return (
      <div className="container py-24 max-w-3xl mx-auto px-4">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Offer Not Found</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            We couldn't find the offer you're looking for. It may have been removed, paused, or expired.
          </p>
          <Button onClick={() => setLocation('/marketplace')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }
  
  const isBuyOffer = offer.type === 'buy';
  const isSellOffer = offer.type === 'sell';
  const amountDisplay = getAmountDisplay(offer);
  
  return (
    <div className="container py-24 max-w-3xl mx-auto px-4">
      <Card className="overflow-hidden">
        <div className="p-6">
          {/* Header with back button */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setLocation('/marketplace')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
            <div className="flex items-center">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Offer title */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold flex items-center">
                {isSellOffer ? (
                  <>
                    <ArrowDownLeft className="h-7 w-7 mr-2 text-green-500" />
                    Buy {offer.token}
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-7 w-7 mr-2 text-blue-500" />
                    Sell {offer.token}
                  </>
                )}
              </h1>
              
              <Badge 
                className={`ml-4 ${
                  offer.status === 'active' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                }`}
              >
                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
              </Badge>
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">{parseFloat(offer.price).toLocaleString()}</span>
                <span className="text-xl ml-2">{offer.fiatCurrency}</span>
              </div>
              <div className="text-muted-foreground">Price per {offer.token}</div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Offer details */}
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Advertiser</h3>
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {offer.walletAddress.substring(0, 6)}...{offer.walletAddress.substring(offer.walletAddress.length - 4)}
                </div>
                
                <div className="flex flex-col items-end">
                  {offer.makerDetails?.completionRate && (
                    <div className="flex items-center text-sm">
                      <ShieldCheck className="h-4 w-4 mr-1 text-green-500" />
                      <span>{(offer.makerDetails.completionRate * 100).toFixed(1)}% completion</span>
                    </div>
                  )}
                  {offer.makerDetails?.avgResponseTime && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Responds {formatResponseTime(offer.makerDetails.avgResponseTime)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount Available</h3>
              <div className="font-medium">{amountDisplay.available.toLocaleString()} {offer.token}</div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Payment Methods</h3>
              <div className="flex flex-wrap gap-2">
                {offer.paymentMethods.map((method: string) => (
                  <Badge key={method} variant="outline">
                    {formatPaymentMethod(method)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Limits */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Trade Limits</h3>
              <div className="space-y-2">
                {offer.restrictions?.minAmount && (
                  <div className="flex justify-between">
                    <span>Minimum</span>
                    <span className="font-medium">{parseFloat(offer.restrictions.minAmount).toLocaleString()} {offer.fiatCurrency}</span>
                  </div>
                )}
                {offer.restrictions?.maxAmount && (
                  <div className="flex justify-between">
                    <span>Maximum</span>
                    <span className="font-medium">{parseFloat(offer.restrictions.maxAmount).toLocaleString()} {offer.fiatCurrency}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Share url */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Share This Offer</h3>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={copyShareLink}
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </Button>
              </div>
            </div>
            
            {/* Ready check */}
            {!isReadyToTrade && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Before You Trade</h3>
                <div className="space-y-2">
                  {!connectedWallet && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setWalletDialogOpen(true)}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </Button>
                  )}
                  {connectedWallet && connectedAccounts.length === 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setPaymentDialogOpen(true)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Action buttons */}
        <div className="p-6">
          <Button 
            className={`w-full py-6 text-lg ${
              isSellOffer 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={handleTradeClick}
          >
            {isSellOffer ? (
              <>
                <ArrowDownLeft className="h-5 w-5 mr-2" />
                Buy {offer.token}
              </>
            ) : (
              <>
                <ArrowUpRight className="h-5 w-5 mr-2" />
                Sell {offer.token}
              </>
            )}
          </Button>
        </div>
      </Card>
      
      {/* Wallet dialog */}
      <WalletDialog
        open={walletDialogOpen}
        onOpenChange={setWalletDialogOpen}
        onConnect={(publicKey) => {
          toast({
            title: "Wallet connected",
            description: `Wallet ${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)} has been connected.`,
          });
        }}
      />
      
      {/* Payment method dialog */}
      <AccountConnectionDialog 
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onOpenChange={setPaymentDialogOpen}
        onAccountConnect={handleAccountConnect}
        walletAddress={connectedWallet || ''}
        source="marketplace"
      />
      
      {/* Trade dialog */}
      <TradeDialog
        offer={offer}
        open={tradeDialogOpen}
        onOpenChange={setTradeDialogOpen}
        mode="link"
      />
    </div>
  );
}