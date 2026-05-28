import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWalletStore } from "@/lib/walletStore";
import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import axios from "axios";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Loader2,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Copy,
  ExternalLink,
  Lock,
  CreditCard,
  Send,
  Wallet
} from "lucide-react";
import { WalletDialog } from "@/components/exchange/WalletDialog";
import { AccountConnectionDialog } from "@/components/ui/account-connection-dialog";
import type { FinancialAccount } from '@shared/types/financial-account';

// Interface for offer data
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

// Helper to format time intervals
function formatResponseTime(minutes: number): string {
  if (minutes < 1) return 'instantly';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

// Get the available amount for an offer
function getAmountDisplay(offer: MarketplaceOffer) {
  if (typeof offer.amount === 'string') {
    return {
      total: parseFloat(offer.amount),
      available: parseFloat(offer.amount)
    };
  }
  
  return {
    total: parseFloat(offer.amount.total),
    available: parseFloat(offer.amount.available)
  };
}

interface TradeDialogProps {
  offer: MarketplaceOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'link' | 'regular';
  initialAmount?: string;
}

export function TradeDialog({
  offer,
  open,
  onOpenChange,
  mode = 'regular',
  initialAmount = ''
}: TradeDialogProps) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [amount, setAmount] = useState(initialAmount);
  const [fiatAmount, setFiatAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [tradeShareLink, setTradeShareLink] = useState('');
  
  // Get wallet from store
  const { connectedWallet } = useWalletStore();
  
  // Get connected accounts
  const { connectedAccounts, addAccount } = useFinancialAccountStore();
  
  // Flag to track if user is ready to trade
  const [isReadyToTrade, setIsReadyToTrade] = useState(false);
  
  // Check if user is ready to trade
  useEffect(() => {
    if (connectedWallet && connectedAccounts.length > 0) {
      setIsReadyToTrade(true);
    } else {
      setIsReadyToTrade(false);
    }
  }, [connectedWallet, connectedAccounts]);
  
  // Update fiat amount when token amount changes
  useEffect(() => {
    if (offer && amount) {
      const fiatValue = parseFloat(amount) * parseFloat(offer.price);
      setFiatAmount(fiatValue.toFixed(2));
    }
  }, [amount, offer]);
  
  // Reset form when offer changes
  useEffect(() => {
    if (offer) {
      if (initialAmount) {
        setAmount(initialAmount);
      } else if (offer.restrictions?.minAmount) {
        // Set default to minimum amount if specified
        const minTokenAmount = parseFloat(offer.restrictions.minAmount) / parseFloat(offer.price);
        setAmount(minTokenAmount.toFixed(6));
      } else {
        // Default to 100 units of the token
        setAmount('100');
      }
      
      if (offer.paymentMethods?.length > 0) {
        setSelectedPaymentMethod(offer.paymentMethods[0]);
      }
      
      // Generate shareable link
      const baseUrl = window.location.origin;
      const offerLinkUrl = `${baseUrl}/offer/${offer.id}`;
      setTradeShareLink(offerLinkUrl);
    }
  }, [offer, initialAmount]);
  
  // Handle account connection
  const handleAccountConnect = (account: FinancialAccount) => {
    addAccount(account);
    toast({
      title: "Account connected",
      description: `${account.accountName} has been connected successfully.`,
    });
  };
  
  // Function to validate input
  const validateInput = (): boolean => {
    if (!offer) return false;
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive"
      });
      return false;
    }
    
    const amountNum = parseFloat(amount);
    const amountDisplay = getAmountDisplay(offer);
    
    // Check if amount exceeds available
    if (amountNum > amountDisplay.available) {
      toast({
        title: "Insufficient funds",
        description: `The maximum available amount is ${amountDisplay.available} ${offer.token}.`,
        variant: "destructive"
      });
      return false;
    }
    
    // Check min/max restrictions
    if (offer.restrictions) {
      const fiatAmountNum = parseFloat(fiatAmount);
      
      if (offer.restrictions.minAmount && fiatAmountNum < parseFloat(offer.restrictions.minAmount)) {
        toast({
          title: "Below minimum",
          description: `The minimum trade amount is ${parseFloat(offer.restrictions.minAmount).toLocaleString()} ${offer.fiatCurrency}.`,
          variant: "destructive"
        });
        return false;
      }
      
      if (offer.restrictions.maxAmount && fiatAmountNum > parseFloat(offer.restrictions.maxAmount)) {
        toast({
          title: "Above maximum",
          description: `The maximum trade amount is ${parseFloat(offer.restrictions.maxAmount).toLocaleString()} ${offer.fiatCurrency}.`,
          variant: "destructive"
        });
        return false;
      }
    }
    
    if (!selectedPaymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method to continue.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateInput() || !offer || !connectedWallet) return;
    
    try {
      setIsSubmitting(true);
      
      // Get the current date/time and add 30 minutes for timeout
      const timeoutDate = new Date();
      timeoutDate.setMinutes(timeoutDate.getMinutes() + 30);
      
      // Prepare transaction data
      // When a maker offers to "buy", the taker is "selling" to them and vice versa
      // This is from the taker's perspective
      const takerType = offer.type === 'buy' ? 'sell' : 'buy';
      
      const transactionData = {
        offerId: offer.id,
        makerWalletAddress: offer.walletAddress,
        takerWalletAddress: connectedWallet,
        
        // Required fields from schema - set to matched directly for P2P flow
        type: takerType, // Taker's perspective - opposite of offer.type
        status: 'matched',
        timeoutAt: timeoutDate.toISOString(),
        
        // Transaction amounts
        amount: fiatAmount.toString(),  // Convert to string for consistency
        currency: offer.fiatCurrency,
        tokenAmount: amount.toString(), // Convert to string for consistency
        token: offer.token,
        
        // Payment details
        takerPaymentMethod: selectedPaymentMethod,
        
        // Store original wallet address in legacy field for compatibility
        walletAddress: connectedWallet,
        counterpartyAddress: offer.walletAddress,
        
        // Add empty objects for financial accounts if not set
        // These will be filled in during the transaction flow
        makerFinancialAccount: null,
        takerFinancialAccount: null,
        
        // Additional required fields
        makerApproved: false,
        takerApproved: false,
        platformApproved: false,
      };
      
      // Log transaction data for debugging
      console.log('Transaction data being sent:', JSON.stringify(transactionData, null, 2));
      
      // Create transaction
      const response = await axios.post('/api/transactions', transactionData);
      
      if (response.data && response.data.id) {
        const transactionId = response.data.id.toString();
        
        // Store transaction ID in local storage for recovery
        localStorage.setItem('currentTransactionId', transactionId);
        
        toast({
          title: "Transaction created",
          description: "Your trade has been initiated successfully.",
        });
        
        // Redirect to maker dashboard and include the transaction ID
        // This ensures the dashboard will display the correct transaction
        setLocation(`/maker?activeTab=activity&transactionId=${transactionId}`);
        onOpenChange(false); // Close the dialog
      } else {
        throw new Error('Invalid server response');
      }
    } catch (error: any) {
      console.error('Transaction creation error:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      
      // Show user-friendly error message
      toast({
        title: "Error creating transaction",
        description: error.response?.data?.message || error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Copy trade link to clipboard
  const copyTradeLink = () => {
    navigator.clipboard.writeText(tradeShareLink);
    toast({
      title: "Link copied",
      description: "Trade link has been copied to your clipboard.",
    });
  };
  
  // If no offer is provided, don't render
  if (!offer) return null;
  
  const isBuyOffer = offer.type === 'buy';
  const isSellOffer = offer.type === 'sell';
  const amountDisplay = getAmountDisplay(offer);
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              {isSellOffer ? (
                <>
                  <ArrowDownLeft className="h-5 w-5 mr-2 text-green-500" />
                  Buy {offer.token}
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-5 w-5 mr-2 text-blue-500" />
                  Sell {offer.token}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="flex flex-col space-y-1">
                <div className="font-medium text-base">
                  Price: {parseFloat(offer.price).toLocaleString()} {offer.fiatCurrency} per {offer.token}
                </div>
                <div className="text-sm text-muted-foreground">
                  Available: {amountDisplay.available.toLocaleString()} {offer.token}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-5 py-4">
            {/* Maker info */}
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Trader</span>
                <span className="font-medium">{offer.walletAddress.substring(0, 6)}...{offer.walletAddress.substring(offer.walletAddress.length - 4)}</span>
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
            
            {/* Trade details */}
            <div className="space-y-4">
              {/* Amount input */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="token-amount">Amount ({offer.token})</Label>
                  <div className="relative">
                    <Input
                      id="token-amount"
                      type="number"
                      placeholder={`Enter ${offer.token} amount`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-16"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                      {offer.token}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fiat-amount">Amount ({offer.fiatCurrency})</Label>
                  <div className="relative">
                    <Input
                      id="fiat-amount"
                      type="number"
                      placeholder={`Enter ${offer.fiatCurrency} amount`}
                      value={fiatAmount}
                      onChange={(e) => {
                        setFiatAmount(e.target.value);
                        // Update token amount based on fiat input
                        if (offer && e.target.value) {
                          const tokenValue = parseFloat(e.target.value) / parseFloat(offer.price);
                          setAmount(tokenValue.toFixed(6));
                        }
                      }}
                      className="pr-16"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                      {offer.fiatCurrency}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment methods */}
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {offer.paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {formatPaymentMethod(method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Limits */}
              {offer.restrictions && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {offer.restrictions.minAmount && (
                    <Badge variant="outline" className="bg-muted/50">
                      Min: {parseFloat(offer.restrictions.minAmount).toLocaleString()} {offer.fiatCurrency}
                    </Badge>
                  )}
                  {offer.restrictions.maxAmount && (
                    <Badge variant="outline" className="bg-muted/50">
                      Max: {parseFloat(offer.restrictions.maxAmount).toLocaleString()} {offer.fiatCurrency}
                    </Badge>
                  )}
                  {offer.restrictions.requireVerified && (
                    <Badge variant="outline" className="bg-muted/50">
                      <Lock className="h-3 w-3 mr-1" />
                      Verified users only
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Share link (for makers only) */}
            {mode === 'link' && (
              <div className="space-y-2 mt-2">
                <Label>Share Trade Link</Label>
                <div className="flex space-x-2">
                  <Input value={tradeShareLink} readOnly className="flex-1" />
                  <Button variant="outline" size="icon" onClick={copyTradeLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => window.open(tradeShareLink, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this link with others so they can easily trade with your offer.
                </p>
              </div>
            )}
            
            {/* Warning for unconnected users */}
            {!connectedWallet && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start mt-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Wallet connection required</p>
                  <p className="text-amber-700">You need to connect your wallet before you can trade.</p>
                </div>
              </div>
            )}
            
            {/* Warning for no payment method */}
            {connectedWallet && connectedAccounts.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start mt-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Payment method required</p>
                  <p className="text-amber-700">Add a payment method to complete this trade.</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            {!connectedWallet ? (
              <Button className="w-full" onClick={() => setWalletDialogOpen(true)}>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            ) : connectedAccounts.length === 0 ? (
              <Button className="w-full" onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            ) : (
              <Button 
                className="w-full" 
                onClick={handleSubmit} 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {isSellOffer ? 'Buy' : 'Sell'} {offer.token}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
    </>
  );
}