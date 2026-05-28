import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { useWalletStore } from '@/lib/walletStore';
import { useFinancialAccountStore } from '@/lib/financialAccountStore';
import { SUPPORTED_CURRENCIES, SUPPORTED_TOKENS, getPaymentMethodsForCurrency } from '@/lib/supportedCurrencies';
import { PaymentMethodSelect } from "@/components/marketplace/PaymentMethodSelect";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Loader2,
  Search,
  RefreshCw,
  Check,
  Clock,
  ChevronDown,
  CreditCard,
  PiggyBank,
  Wallet,
  User,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WalletDialog } from "@/components/exchange/WalletDialog";
import type { FinancialAccount } from '@shared/types/financial-account';
import { AccountConnectionDialog } from "@/components/ui/account-connection-dialog";
import { TradeDialog } from "@/components/marketplace/TradeDialog";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";

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
  lockedAmount?: string; // Amount locked due to pending transactions
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

// Payment method formatting helper
function formatPaymentMethod(method: string): string {
  if (!method) return 'Unknown';
  
  // Common payment methods
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

  // If we have a special name for this method, return it
  if (methodMap[method.toLowerCase()]) {
    return methodMap[method.toLowerCase()];
  }
  
  // Otherwise try to format it nicely
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
    // For legacy offers, check if lockedAmount exists
    const total = parseFloat(offer.amount);
    const locked = offer.lockedAmount ? parseFloat(offer.lockedAmount) : 0;
    const available = Math.max(0, total - locked); // Ensure we don't have negative amounts
    
    return {
      total: total,
      available: Math.floor(available)
    };
  }
  
  return {
    total: parseFloat(offer.amount.total),
    available: Math.floor(parseFloat(offer.amount.available))
  };
}

// Calculate the fiat value of a token amount
function calculateFiatValue(amount: number, price: string, currency: string): string {
  const value = amount * parseFloat(price);
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default function MarketplacePage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState<'buy' | 'sell'>('buy');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>('USDT');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [amount, setAmount] = useState<string>('');
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'plaid'>('select');
  
  // Get wallet from store
  const { connectedWallet } = useWalletStore();
  
  // Get connected accounts
  const { 
    connectedAccounts,
    addAccount
  } = useFinancialAccountStore();
  
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
  
  // Fetch active offers
  const { data: offers, isLoading, error, refetch } = useQuery({
    queryKey: ['active-offers', currentTab, selectedToken, selectedCurrency, selectedPaymentMethod],
    queryFn: async () => {
      try {
        // When user is in "buy" tab, they want to see "sell" offers and vice versa
        const offerType = currentTab === 'buy' ? 'sell' : 'buy';
        
        console.log('🔄 Fetching offers with filters:', { 
          type: offerType, 
          token: selectedToken, 
          currency: selectedCurrency,
          paymentMethod: selectedPaymentMethod 
        });
        
        const params = new URLSearchParams();
        params.append('type', offerType); // Use the opposite type
        
        // Only add defined filters
        if (selectedToken && selectedToken !== 'all') params.append('token', selectedToken);
        if (selectedCurrency && selectedCurrency !== 'all') params.append('fiatCurrency', selectedCurrency);
        if (selectedPaymentMethod && selectedPaymentMethod !== 'all') params.append('paymentMethod', selectedPaymentMethod);
        
        const queryString = params.toString();
        console.log(`🔍 API Request: /api/offers/active?${queryString}`);
        
        const response = await axios.get(`/api/offers/active?${queryString}`);
        console.log(`✅ Received ${response.data?.length || 0} offers from API`);
        
        return response.data || [];
      } catch (err) {
        console.error('❌ Error fetching offers:', err);
        return []; // Return empty array on error to avoid breaking the UI
      }
    },
    retry: 2, // Retry failed requests twice
    retryDelay: 1000, // Wait 1 second between retries
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  });
  
  // Handle account connection
  const handleAccountConnect = (account: FinancialAccount) => {
    addAccount(account);
    toast({
      title: "Account connected",
      description: `${account.accountName} has been connected successfully.`,
    });
  };
  
  // State for trade dialog
  const [selectedOffer, setSelectedOffer] = useState<MarketplaceOffer | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  
  // Handle trade button click
  const handleTradeClick = (offer: MarketplaceOffer) => {
    setSelectedOffer(offer);
    setTradeDialogOpen(true);
  };
  
  return (
    <div className="container py-24 max-w-7xl mx-auto px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-4xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">
            Buy and sell cryptocurrencies directly with other users using your preferred payment methods.
          </p>
        </div>
        
        {/* Getting Started Card */}
        {(!connectedWallet || connectedAccounts.length === 0) && (
          <Card className="p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-3">Getting Started</h2>
                <p className="text-muted-foreground mb-4">
                  To start trading on the marketplace, you'll need to complete these steps:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className={`flex h-6 w-6 rounded-full items-center justify-center mr-3 ${connectedWallet ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {connectedWallet ? <Check className="h-4 w-4" /> : "1"}
                    </div>
                    <div>
                      <p className="font-medium">Connect your wallet</p>
                      <p className="text-sm text-muted-foreground">Link your Solana wallet to identify yourself</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className={`flex h-6 w-6 rounded-full items-center justify-center mr-3 ${connectedAccounts.length > 0 ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {connectedAccounts.length > 0 ? <Check className="h-4 w-4" /> : "2"}
                    </div>
                    <div>
                      <p className="font-medium">Add a payment method</p>
                      <p className="text-sm text-muted-foreground">Connect a bank account or add a manual payment method</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {!connectedWallet && (
                  <Button className="px-8" onClick={() => setWalletDialogOpen(true)}>
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Button>
                )}
                {connectedWallet && connectedAccounts.length === 0 && (
                  <Button className="px-8" onClick={() => setPaymentDialogOpen(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
        
        <Card className="p-6">
          <div className="flex flex-col space-y-6">
            {/* Tab navigation */}
            <Tabs defaultValue="buy" value={currentTab} onValueChange={(v) => setCurrentTab(v as 'buy' | 'sell')}>
              <div className="flex justify-between items-center">
                <TabsList className="bg-muted">
                  <TabsTrigger value="buy" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Buy</TabsTrigger>
                  <TabsTrigger value="sell" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sell</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="hover:bg-muted">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* Filters section */}
              <div className="flex flex-col md:flex-row flex-wrap gap-3 py-4 items-center">
                <div className="w-full md:w-32">
                  <Select value={selectedToken} onValueChange={setSelectedToken}>
                    <SelectTrigger>
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_TOKENS.map(token => (
                        <SelectItem key={token.code} value={token.code}>
                          {token.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-32">
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-40">
                  <PaymentMethodSelect 
                    value={selectedPaymentMethod} 
                    onValueChange={setSelectedPaymentMethod}
                    currency={selectedCurrency}
                  />
                </div>
                
                <div className="w-full md:flex-1 md:min-w-[150px]">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="flex w-full md:w-auto gap-2 mt-2 md:mt-0">
                  <Button variant="outline" onClick={() => setFilterDialogOpen(true)} className="flex-1 md:flex-none">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                  
                  <Button variant="default" className="flex-1 md:flex-none">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
              
              {/* Table header */}
              <div className="hidden md:grid grid-cols-7 gap-4 py-3 px-4 bg-muted rounded-t-lg font-medium text-sm">
                <div className="col-span-1">Advertiser</div>
                <div className="col-span-1">Price</div>
                <div className="col-span-1">Limit/Available</div>
                <div className="col-span-2">Payment Method</div>
                <div className="col-span-1">Trade</div>
                <div className="col-span-1"></div>
              </div>
              
              {/* Offers list */}
              <TabsContent value="buy" className="mt-0 p-0">
                {!connectedWallet ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                      <CreditCard className="h-8 w-8 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                    <p className="text-center text-muted-foreground max-w-md mb-6">
                      You need to connect your wallet to view and trade on the marketplace.
                    </p>
                    <Button onClick={() => setWalletDialogOpen(true)}>
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </Button>
                  </div>
                ) : !isReadyToTrade ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                      <PiggyBank className="h-8 w-8 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Add a Payment Method</h3>
                    <p className="text-center text-muted-foreground max-w-md mb-6">
                      You need to add at least one payment method to start trading.
                    </p>
                    <Button onClick={() => setPaymentDialogOpen(true)}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                ) : isLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                  </div>
                ) : (offers && offers.filter((o: MarketplaceOffer) => o.type === 'sell').length > 0) ? (
                  <div className="divide-y">
                    {offers
                      .filter((o: MarketplaceOffer) => o.type === 'sell')
                      .map((offer: MarketplaceOffer) => {
                        const amounts = getAmountDisplay(offer);
                        return (
                          <div key={offer.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 py-4 px-4">
                            {/* Maker info */}
                            <div className="w-full md:col-span-1">
                              <div className="font-medium flex items-center">
                                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="truncate">
                                  {offer.walletAddress.substring(0, 4)}...{offer.walletAddress.substring(offer.walletAddress.length - 4)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                                {offer.makerDetails?.completionRate && (
                                  <span>{Math.round(offer.makerDetails.completionRate * 100)}% completion</span>
                                )}
                                {offer.makerDetails?.totalOrders && (
                                  <span>{offer.makerDetails.totalOrders}+ trades</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Price */}
                            <div className="w-full md:col-span-1">
                              <div className="text-xs text-muted-foreground">1 {offer.token} =</div>
                              <div className="font-medium">{parseFloat(offer.price).toLocaleString()} {offer.fiatCurrency}</div>
                            </div>
                            
                            {/* Available and Limits - both mobile and desktop */}
                            <div className="w-full md:w-auto md:col-span-1">
                              <div className="flex flex-col">
                                <div>
                                  <span className="font-medium whitespace-nowrap">{Math.floor(amounts.available).toLocaleString()} {offer.token}</span>
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap md:block gap-x-3 mt-1">
                                  {offer.restrictions?.minAmount && (
                                    <span className="whitespace-nowrap inline-block">Min: {parseFloat(offer.restrictions.minAmount).toLocaleString()} {offer.fiatCurrency}</span>
                                  )}
                                  {offer.restrictions?.minAmount && offer.restrictions?.maxAmount && (
                                    <span className="mx-1 hidden md:inline-block">•</span>
                                  )}
                                  {offer.restrictions?.maxAmount && (
                                    <span className="whitespace-nowrap inline-block">Max: {parseFloat(offer.restrictions.maxAmount).toLocaleString()} {offer.fiatCurrency}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Payment Methods */}
                            <div className="w-full md:col-span-2 mt-2 md:mt-0">
                              <div className="flex flex-wrap gap-1">
                                {offer.paymentMethods.map((method, index) => (
                                  <Badge key={index} variant="outline" className="px-2">
                                    {formatPaymentMethod(method)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            {/* Trade button */}
                            <div className="w-full md:col-span-2 flex md:justify-start items-center mt-2 md:mt-0">
                              <Button
                                className="w-full md:w-auto !bg-green-600 hover:!bg-green-700 text-white"
                                style={{ backgroundColor: '#16a34a' }}
                                disabled={!isReadyToTrade}
                                onClick={() => handleTradeClick(offer)}
                              >
                                <ArrowDownLeft className="h-4 w-4 mr-2" />
                                Buy {offer.token}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Offers Found</h3>
                    <p className="text-muted-foreground mt-1 max-w-md">
                      There are no active sell offers matching your criteria. Try changing your filters or check back later.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sell" className="mt-0 p-0">
                {!connectedWallet ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                      <CreditCard className="h-8 w-8 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                    <p className="text-center text-muted-foreground max-w-md mb-6">
                      You need to connect your wallet to view and trade on the marketplace.
                    </p>
                    <Button onClick={() => setWalletDialogOpen(true)}>
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </Button>
                  </div>
                ) : !isReadyToTrade ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                      <PiggyBank className="h-8 w-8 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Add a Payment Method</h3>
                    <p className="text-center text-muted-foreground max-w-md mb-6">
                      You need to add at least one payment method to start trading.
                    </p>
                    <Button onClick={() => setPaymentDialogOpen(true)}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                ) : isLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                  </div>
                ) : (offers && offers.filter((o: MarketplaceOffer) => o.type === 'buy').length > 0) ? (
                  <div className="divide-y">
                    {offers
                      .filter((o: MarketplaceOffer) => o.type === 'buy')
                      .map((offer: MarketplaceOffer) => {
                        const amounts = getAmountDisplay(offer);
                        return (
                          <div key={offer.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 py-4 px-4">
                            {/* Maker info */}
                            <div className="w-full md:col-span-1">
                              <div className="font-medium flex items-center">
                                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="truncate">
                                  {offer.walletAddress.substring(0, 4)}...{offer.walletAddress.substring(offer.walletAddress.length - 4)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                                {offer.makerDetails?.completionRate && (
                                  <span>{Math.round(offer.makerDetails.completionRate * 100)}% completion</span>
                                )}
                                {offer.makerDetails?.totalOrders && (
                                  <span>{offer.makerDetails.totalOrders}+ trades</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Price */}
                            <div className="w-full md:col-span-1">
                              <div className="text-xs text-muted-foreground">1 {offer.token} =</div>
                              <div className="font-medium">{parseFloat(offer.price).toLocaleString()} {offer.fiatCurrency}</div>
                            </div>
                            
                            {/* Available and Limits - both mobile and desktop */}
                            <div className="w-full md:w-auto md:col-span-1">
                              <div className="flex flex-col">
                                <div>
                                  <span className="font-medium whitespace-nowrap">{Math.floor(amounts.available).toLocaleString()} {offer.token}</span>
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap md:block gap-x-3 mt-1">
                                  {offer.restrictions?.minAmount && (
                                    <span className="whitespace-nowrap inline-block">Min: {parseFloat(offer.restrictions.minAmount).toLocaleString()} {offer.fiatCurrency}</span>
                                  )}
                                  {offer.restrictions?.minAmount && offer.restrictions?.maxAmount && (
                                    <span className="mx-1 hidden md:inline-block">•</span>
                                  )}
                                  {offer.restrictions?.maxAmount && (
                                    <span className="whitespace-nowrap inline-block">Max: {parseFloat(offer.restrictions.maxAmount).toLocaleString()} {offer.fiatCurrency}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Payment Methods */}
                            <div className="w-full md:col-span-2 mt-2 md:mt-0">
                              <div className="flex flex-wrap gap-1">
                                {offer.paymentMethods.map((method, index) => (
                                  <Badge key={index} variant="outline" className="px-2">
                                    {formatPaymentMethod(method)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            {/* Trade button */}
                            <div className="w-full md:col-span-2 flex md:justify-start items-center mt-2 md:mt-0">
                              <Button
                                className="w-full md:w-auto !bg-red-600 hover:!bg-red-700 text-white"
                                style={{ backgroundColor: '#dc2626' }}
                                disabled={!isReadyToTrade}
                                onClick={() => handleTradeClick(offer)}
                              >
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                Sell {offer.token}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Offers Found</h3>
                    <p className="text-muted-foreground mt-1 max-w-md">
                      There are no active buy offers matching your criteria. Try changing your filters or check back later.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </Card>
        
        {/* Bottom section with Create Offer promotion */}
        <div className="bg-primary/5 p-6 rounded-lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Create Your Own Offer</h3>
              <p className="text-muted-foreground">
                Don't see the price or payment method you want? Create your own offer and let others trade with you.
              </p>
            </div>
            <Button onClick={() => setLocation('/maker')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
          </div>
        </div>
      </div>
      
      {/* Wallet connection dialog */}
      <WalletDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
      
      {/* Payment method dialog */}
      <AccountConnectionDialog 
        open={paymentDialogOpen} 
        onOpenChange={setPaymentDialogOpen}
        onAccountConnect={handleAccountConnect}
      />
      
      {/* Trade dialog */}
      {selectedOffer && (
        <TradeDialog 
          open={tradeDialogOpen} 
          onOpenChange={setTradeDialogOpen}
          offer={selectedOffer}
        />
      )}
    </div>
  );
}
