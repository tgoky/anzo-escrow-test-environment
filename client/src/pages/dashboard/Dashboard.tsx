import { useState, useEffect } from "react";
import { useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  PlusCircle, ArrowDownLeft, ArrowUpRight, Clock, 
  Wallet, CreditCard, Building, Ban, Plus, Loader2,
  ClipboardList, BarChart3, Circle, CheckCircle2, XCircle, WalletCards
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import { useWalletStore } from "@/lib/walletStore";
import { AccountConnectionDialog } from "@/components/ui/account-connection-dialog";
import { WalletDialog } from "@/components/exchange/WalletDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OffersList, { Offer } from './OffersList';
import { ActivityTab } from "@/components/maker/ActivityTab";
import { PaymentMethodsTab } from "@/components/financial/PaymentMethodsTab";
import type { FinancialAccount } from '@shared/types/financial-account';
import { countries } from "@/lib/countries";

// Direct method to fetch offers
const fetchOffers = async (walletAddress: string): Promise<Offer[]> => {
  console.log("🏁 fetchOffers called with wallet:", walletAddress);
  
  if (!walletAddress) {
    console.log("⚠️ No wallet address provided for offers fetch");
    return [];
  }
  
  try {
    console.log("🔍 Fetching offers for wallet:", walletAddress);
    const response = await axios.get(`/api/maker/offers/${walletAddress}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.data) {
      console.warn('⚠️ No offers data received');
      return [];
    }
    
    console.log("✅ Offers response:", response.data);

    // Ensure we're getting the expected data structure
    if (!Array.isArray(response.data)) {
      console.error('❌ Invalid offers response format');
      return [];
    }

    console.log('✅ Found offers:', response.data.length);
    return response.data as Offer[];
  } catch (error) {
    console.error('❌ Error fetching offers:', error);
    return [];
  }
};

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  status: 'pending' | 'completed' | 'failed' | 'deleted' | 'searching' | 'matched' | 'cancelled' | 'verification';
  amount: number;          // Decimal amount in fiat currency
  currency?: string;       // Currency code (USD, EUR, etc.)
  tokenAmount?: number;    // Amount in token
  token: string;           // Token symbol (SOL, BTC, etc.)
  walletAddress: string;   // User's wallet address
  counterpartyAddress?: string; // Other party's wallet address
  makerFinancialAccount?: any;  // Maker's financial account details
  takerFinancialAccount?: any;  // Taker's financial account details
  makerPaymentMethod?: string;  // Maker's payment method
  takerPaymentMethod?: string;  // Taker's payment method
  createdAt: string;       // Creation timestamp
  updatedAt?: string;      // Last update timestamp
  timeoutAt?: string;      // Transaction timeout
  failureReason?: string;  // Reason for failure if status is 'failed'
  usdAmount?: number;      // Amount in USD (for backward compatibility)
}

export default function Dashboard() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { connectedWallet, setConnectedWallet } = useWalletStore();
  const [activeTab, setActiveTab] = useState("offers");
  const [accountConnectionOpen, setAccountConnectionOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editOfferId, setEditOfferId] = useState<string | null>(null);
  const [offerType, setOfferType] = useState<'buy' | 'sell'>('buy');
  const [offerAsset, setOfferAsset] = useState('USDT');
  const [priceType, setPriceType] = useState<'fixed' | 'floating'>('fixed');
  const [offerPrice, setOfferPrice] = useState('1.00');
  const [offerAmount, setOfferAmount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('10.00');
  const [maxOrderAmount, setMaxOrderAmount] = useState('1000.00');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [selectedFinancialAccount, setSelectedFinancialAccount] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  // Extract wallet from URL or localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const walletParam = params.get('wallet');
    const tabParam = params.get('tab');
    
    // Check for stored transaction ID
    const storedTransactionId = localStorage.getItem('view_transaction_id');
    const storedWalletAddress = localStorage.getItem('wallet_address');
    
    console.log("🔍 Initial wallet check:", { 
      walletParam, 
      currentConnectedWallet: connectedWallet,
      storedWalletAddress,
      storedTransactionId,
      tabParam,
      isWalletStoreConnected: useWalletStore.getState().isConnected()
    });

    // Priority 1: Use URL param if available and no wallet connected
    if (walletParam && !connectedWallet) {
      console.log("🔑 Setting wallet from URL param:", walletParam);
      setConnectedWallet(walletParam);
      // Clean up the URL
      window.history.replaceState({}, '', '/maker');
    }
    // Priority 2: Use stored wallet address
    else if (storedWalletAddress && !connectedWallet) {
      console.log("🔑 Setting wallet from localStorage:", storedWalletAddress);
      setConnectedWallet(storedWalletAddress);
      
      // If we're navigating to transaction details, set tab
      if (storedTransactionId) {
        console.log("📋 Found stored transaction ID, setting activity tab");
        setActiveTab("activity");
        toast({
          title: "Loading transaction details",
          description: `Transaction ID: ${storedTransactionId}`,
          variant: "default",
        });
      }
    }
  }, [connectedWallet, setConnectedWallet, toast]);

  // Use the global financial account store
  const { addAccount } = useFinancialAccountStore();
  
  const handleAccountConnect = (account: FinancialAccount) => {
    addAccount(account);
    setAccountConnectionOpen(false);
  };

  // Direct state for offers
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  
  // Fetch offers on wallet connection
  useEffect(() => {
    const getOffers = async () => {
      if (connectedWallet) {
        setIsLoadingOffers(true);
        try {
          console.log("🔄 Fetching offers for wallet:", connectedWallet);
          const fetchedOffers = await fetchOffers(connectedWallet);
          console.log("📊 Fetched offers:", fetchedOffers);
          setOffers(fetchedOffers);
        } catch (error) {
          console.error("❌ Error fetching offers:", error);
          setOffers([]);
        } finally {
          setIsLoadingOffers(false);
        }
      } else {
        console.log("⚠️ No wallet connected for offers fetch");
        setOffers([]);
        setIsLoadingOffers(false);
      }
    };
    
    getOffers();
  }, [connectedWallet]);

  // Add transactions query
  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['maker-transactions', connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return [];
      try {
        console.log('🔍 Fetching transactions for maker:', connectedWallet);
        // Use the correct endpoint format with the wallet address in path
        const response = await axios.get(`/api/transactions/${connectedWallet}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.data) {
          console.warn('⚠️ No transactions data received');
          return [];
        }

        // Ensure we're getting the expected data structure
        if (!Array.isArray(response.data)) {
          console.error('❌ Invalid transactions response format');
          return [];
        }

        console.log('✅ Fetched maker transactions:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        if (axios.isAxiosError(error)) {
          console.error('Response:', error.response?.data);
        }
        throw new Error('Failed to fetch transactions');
      }
    },
    enabled: !!connectedWallet,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const transactions = transactionsData || [];

  // Handle URL parameters for tab selection and transaction viewing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') || params.get('activeTab');
    const transactionIdParam = params.get('transactionId');
    
    // Handle tab selection from URL parameters
    if (tabParam) {
      console.log('📋 Setting active tab from URL parameter:', tabParam);
      
      if (tabParam === 'activity' || tabParam === 'transactions') {
        setActiveTab('activity');
      } else if (tabParam === 'offers') {
        setActiveTab('offers');
      } else if (tabParam === 'payment-methods' || tabParam === 'accounts') {
        setActiveTab('payment-methods');
      }
    }
    
    // Handle transaction selection from URL parameters
    if (transactionIdParam) {
      console.log('📋 Found transaction ID in URL parameter:', transactionIdParam);
      localStorage.setItem('currentTransactionId', transactionIdParam);
      
      // Ensure we're on the activity tab when a transaction ID is provided
      if (activeTab !== 'activity') {
        setActiveTab('activity');
      }
      // Clean up URL after reading the parameter
      window.history.replaceState({}, '', '/maker');
    }
  }, [activeTab]);

  const getStatusBadgeVariant = (status: Transaction['status']): 'default' | 'outline' | 'destructive' | 'secondary' => {
    // Handle both "canceled" and "cancelled" spellings
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus === 'completed' || normalizedStatus === 'matched') {
      return 'default'; // Use default (success) for completed/matched
    } else if (normalizedStatus === 'pending' || normalizedStatus === 'searching' || normalizedStatus === 'verification') {
      return 'outline'; // Use outline for pending states
    } else if (normalizedStatus === 'failed') {
      return 'destructive'; // Use destructive for failed transactions
    } else if (normalizedStatus.includes('cancel') || normalizedStatus === 'deleted') {
      return 'secondary'; // Use secondary for canceled/deleted
    }
    
    return 'outline'; // Default fallback
  };
  
  const getStatusIcon = (status: Transaction['status']) => {
    // Handle both "canceled" and "cancelled" spellings
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    } else if (normalizedStatus === 'pending') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    } else if (normalizedStatus === 'failed') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else if (normalizedStatus === 'searching') {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    } else if (normalizedStatus === 'matched') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    } else if (normalizedStatus.includes('cancel')) {
      return <Ban className="w-4 h-4 text-gray-500" />;
    } else if (normalizedStatus === 'verification') {
      return <Clock className="w-4 h-4 text-blue-500" />;
    } else {
      return <Circle className="w-4 h-4" />;
    }
  };
  
  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'buy') {
      return <ArrowDownLeft className="w-4 h-4 mr-2 text-green-500" />;
    } else {
      return <ArrowUpRight className="w-4 h-4 mr-2 text-red-500" />;
    }
  };
  
  // Handle editing an offer
  const handleEditOffer = (offer: Offer) => {
    console.log('🔄 Editing offer:', offer);
    setEditOfferId(offer.id);
    
    // Set form values from offer data
    setOfferType(offer.type);
    setOfferAsset(offer.token);
    setOfferPrice(offer.price);
    setOfferAmount(typeof offer.amount === 'string' ? offer.amount : offer.amount.total);
    
    if (offer.restrictions) {
      if (offer.restrictions.minAmount) {
        setMinOrderAmount(String(offer.restrictions.minAmount));
      }
      if (offer.restrictions.maxAmount) {
        setMaxOrderAmount(String(offer.restrictions.maxAmount));
      }
    }
    
    if (offer.fiatCurrency) {
      setSelectedCurrency(offer.fiatCurrency);
    }
    
    if (offer.paymentMethods && offer.paymentMethods.length > 0) {
      setSelectedPaymentMethod(offer.paymentMethods[0]);
    }
    
    if (offer.financialAccountId) {
      setSelectedFinancialAccount(offer.financialAccountId);
    }
    
    // Open the dialog
    setOfferDialogOpen(true);
  };

  // Handle toggling an offer's status
  const handleToggleOfferStatus = async (offerId: string, newStatus: 'active' | 'paused') => {
    try {
      console.log('🔄 Toggling offer status:', offerId, 'to', newStatus);
      
      const response = await axios.patch(`/api/offers/${offerId}/status`, { status: newStatus });
      console.log('✅ Toggle status response:', response.data);
      
      // Update local state
      const updatedOffers = offers.map(o => 
        o.id === offerId ? { ...o, status: newStatus } : o
      );
      setOffers(updatedOffers);
      
      toast({
        title: `Offer ${newStatus}`,
        description: `Your offer has been ${newStatus === 'active' ? 'activated' : 'paused'}.`,
        variant: "default",
      });
    } catch (error) {
      console.error('❌ Error toggling offer status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update offer status. Please try again.',
        variant: "destructive",
      });
    }
  };

  // Handle deleting an offer
  const handleDeleteOffer = async (offerId: string) => {
    try {
      console.log('🗑️ Deleting offer with ID:', offerId);
      
      // Delete the offer
      const response = await axios.delete(`/api/offers/${offerId}`);
      console.log('🗑️ Delete offer response:', response.status);
      
      // Update local state
      console.log('🗑️ Current offers:', offers);
      console.log('🗑️ Offer ID to filter out:', offerId);
      const updatedOffers = offers.filter(offer => String(offer.id) !== String(offerId));
      console.log('🗑️ Updated offers after filter:', updatedOffers);
      
      // Refresh offers from API to ensure we have the latest data
      try {
        console.log('🔄 Refreshing offers after deletion...');
        const freshResponse = await axios.get(`/api/maker/offers/${connectedWallet}`);
        console.log('🔄 Fresh offers response:', freshResponse.data.length, 'offers');
        setOffers(freshResponse.data);
      } catch (refreshError) {
        console.error('Error refreshing offers:', refreshError);
        // Fall back to local state update if refresh fails
        setOffers(updatedOffers);
      }
      
      toast({
        title: 'Offer deleted',
        description: 'Your offer has been deleted successfully.',
        variant: "default",
      });
    } catch (error) {
      console.error('❌ Error deleting offer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete offer. Please try again.',
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-20">
      <div className="container mx-auto p-6 space-y-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <WalletCards className="h-8 w-8 text-primary" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              {connectedWallet ?
                `Connected: ${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}` :
                "Not connected"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {!connectedWallet && (
              <Button onClick={() => setWalletDialogOpen(true)}>
                Connect Wallet
              </Button>
            )}
            {connectedWallet && (
              <Button 
                variant="outline" 
                onClick={() => setOfferDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Create Offer
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Active Offers
              </CardTitle>
              <CardDescription>
                Your marketplace offers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {offers.filter(o => o.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {offers.length} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Transactions
              </CardTitle>
              <CardDescription>
                Last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transactions.filter(t => {
                  const date = new Date(t.createdAt);
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return date >= thirtyDaysAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {transactions.filter(t => t.status === 'completed').length} completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Payment Methods
              </CardTitle>
              <CardDescription>
                Connected accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{useFinancialAccountStore.getState().connectedAccounts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {useFinancialAccountStore.getState().connectedAccounts.filter(a => a.account.status === 'active').length} active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs 
          defaultValue="offers" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="offers" className="text-sm">
              <ClipboardList className="w-4 h-4 mr-2" />
              Offers
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="payment-methods" className="text-sm">
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Methods
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="offers">
            {connectedWallet ? (
              <OffersList
                offers={offers}
                isLoading={isLoadingOffers}
                onCreateOffer={() => setOfferDialogOpen(true)}
                onToggleStatus={handleToggleOfferStatus}
                onEditOffer={handleEditOffer}
                onDeleteOffer={handleDeleteOffer}
              />
            ) : (
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Wallet Connected</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    Connect your wallet to see your offers.
                  </p>
                  <Button onClick={() => setWalletDialogOpen(true)}>
                    Connect Wallet
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="activity">
            {connectedWallet ? (
              <ActivityTab 
                walletAddress={connectedWallet}
                transactions={transactions}
                isLoading={isLoadingTransactions}
                getStatusBadgeVariant={getStatusBadgeVariant}
                getStatusIcon={getStatusIcon}
                getTransactionIcon={getTransactionIcon}
              />
            ) : (
              <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No Wallet Connected</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    Connect your wallet to see your transaction history and activity.
                  </p>
                  <Button onClick={() => setWalletDialogOpen(true)}>
                    Connect Wallet
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="payment-methods">
            <PaymentMethodsTab />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialogs */}
      <AccountConnectionDialog
        open={accountConnectionOpen}
        onOpenChange={setAccountConnectionOpen}
        onSuccess={handleAccountConnect}
        walletAddress={connectedWallet}
      />
      
      <WalletDialog
        open={walletDialogOpen}
        onOpenChange={setWalletDialogOpen}
        onConnect={(address) => {
          setConnectedWallet(address);
          setWalletDialogOpen(false);
        }}
      />
      
      {/* Offer Creation/Editing Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">{editOfferId ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
            <DialogDescription className="text-sm">
              {editOfferId ? 'Update your existing offer details below.' : 'Set up a new offer to buy or sell crypto.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
          {/* Offer Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Offer Type</Label>
              <div className="flex rounded-md overflow-hidden">
                <Button
                  type="button"
                  variant={offerType === 'buy' ? 'default' : 'outline'} 
                  className={`w-full rounded-r-none ${offerType === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setOfferType('buy')}
                >
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={offerType === 'sell' ? 'default' : 'outline'}
                  className={`w-full rounded-l-none ${offerType === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => setOfferType('sell')}
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Sell
                </Button>
              </div>
            </div>
            
            {/* Crypto Asset */}
            <div className="space-y-1">
              <Label>Asset</Label>
              <Select
                value={offerAsset}
                onValueChange={setOfferAsset}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Currency */}
          <div className="space-y-1">
            <Label>Currency</Label>
            <Select
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.currency} value={country.currency}>
                    {country.currency} ({country.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Price Type */}
          <div className="space-y-1">
            <Label>Price Type</Label>
            <div className="flex rounded-md overflow-hidden">
              <Button
                type="button"
                variant={priceType === 'fixed' ? 'default' : 'outline'} 
                className="w-full rounded-r-none"
                onClick={() => setPriceType('fixed')}
              >
                Fixed Price
              </Button>
              <Button
                type="button"
                variant={priceType === 'floating' ? 'default' : 'outline'}
                className="w-full rounded-l-none"
                onClick={() => setPriceType('floating')}
              >
                Market Rate
              </Button>
            </div>
          </div>
          
          {/* Price and Amount in Two Columns */}
          <div className="grid grid-cols-2 gap-3">
            {/* Price */}
            <div className="space-y-1">
              <Label>Price per {offerAsset}</Label>
              <div className="flex items-center relative">
                <div className="absolute left-3 text-gray-500">
                  {countries.find(c => c.currency === selectedCurrency)?.symbol || '$'}
                </div>
                <Input
                  type="text"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="pl-8"
                  placeholder={`Price in ${selectedCurrency}`}
                />
              </div>
            </div>
            
            {/* Amount */}
            <div className="space-y-1">
              <Label>Total {offerAsset}</Label>
              <Input
                type="text"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder={`Amount of ${offerAsset}`}
              />
            </div>
          </div>
          
          {/* Min/Max Order Amount */}
          <div className="grid grid-cols-2 gap-3">
            {/* Min Order Amount */}
            <div className="space-y-1">
              <Label>Minimum Order</Label>
              <div className="flex items-center relative">
                <div className="absolute left-3 text-gray-500">
                  {countries.find(c => c.currency === selectedCurrency)?.symbol || '$'}
                </div>
                <Input
                  type="text"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="pl-8"
                  placeholder={`Min ${selectedCurrency}`}
                />
              </div>
            </div>
            
            {/* Max Order Amount */}
            <div className="space-y-1">
              <Label>Maximum Order</Label>
              <div className="flex items-center relative">
                <div className="absolute left-3 text-gray-500">
                  {countries.find(c => c.currency === selectedCurrency)?.symbol || '$'}
                </div>
                <Input
                  type="text"
                  value={maxOrderAmount}
                  onChange={(e) => setMaxOrderAmount(e.target.value)}
                  className="pl-8"
                  placeholder={`Max ${selectedCurrency}`}
                />
              </div>
            </div>
          </div>
          
          {/* Payment Methods */}
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select
              value={selectedPaymentMethod}
              onValueChange={setSelectedPaymentMethod}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer_USD">Bank Transfer</SelectItem>
                <SelectItem value="zelle_USD">Zelle</SelectItem>
                <SelectItem value="paypal_USD">PayPal</SelectItem>
                <SelectItem value="venmo_USD">Venmo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Financial Account */}
          <div className="space-y-1">
            <Label>Financial Account</Label>
            <Select
              value={selectedFinancialAccount}
              onValueChange={setSelectedFinancialAccount}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {useFinancialAccountStore.getState().connectedAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account.accountName} ({account.account.institution.name})
                  </SelectItem>
                ))}
                <SelectItem value="new">
                  + Connect New Account
                </SelectItem>
              </SelectContent>
            </Select>
            
            {selectedFinancialAccount === 'new' && (
              <Button 
                variant="outline" 
                className="mt-2 w-full"
                onClick={() => {
                  setOfferDialogOpen(false);
                  setAccountConnectionOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Account
              </Button>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setOfferDialogOpen(false);
            if (editOfferId) {
              setEditOfferId(null);
            }
          }}>
            Cancel
          </Button>
          <Button onClick={async () => {
            // Validate inputs
            if (!offerAmount || !offerPrice || !selectedPaymentMethod || !selectedFinancialAccount || selectedFinancialAccount === 'new') {
              toast({
                title: "Missing information",
                description: "Please fill in all required fields",
                variant: "destructive"
              });
              return;
            }
            
            // Prepare offer data
            const offerData = {
              type: offerType,
              token: offerAsset,
              price: offerPrice,
              amount: offerAmount,
              minOrderAmount: minOrderAmount,
              maxOrderAmount: maxOrderAmount,
              fiatCurrency: selectedCurrency,
              paymentMethods: [selectedPaymentMethod],
              financialAccountId: selectedFinancialAccount,
              priceType: priceType
            };
            
            if (editOfferId) {
              // Update existing offer
              try {
                const response = await axios.patch(`/api/offers/${editOfferId}`, offerData);
                console.log('✅ Updated offer:', response.data);
                
                // Update local state
                const updatedOffers = offers.map(o => o.id === editOfferId ? response.data : o);
                setOffers(updatedOffers);
                
                setEditOfferId(null);
                setOfferDialogOpen(false);
                
                toast({
                  title: "Offer updated",
                  description: "Your offer has been updated successfully",
                  variant: "default"
                });
              } catch (error) {
                console.error('❌ Error updating offer:', error);
                toast({
                  title: "Failed to update offer",
                  description: "There was an error updating your offer",
                  variant: "destructive"
                });
              }
            } else {
              // Create new offer
              try {
                const response = await axios.post(`/api/offers`, {
                  ...offerData,
                  walletAddress: connectedWallet
                });
                console.log('✅ Created offer:', response.data);
                
                // Refresh offers from API to ensure we have the latest data
                const freshResponse = await axios.get(`/api/maker/offers/${connectedWallet}`);
                setOffers(freshResponse.data);
                
                setOfferDialogOpen(false);
                
                toast({
                  title: "Offer created",
                  description: "Your offer has been created successfully",
                  variant: "default"
                });
              } catch (error) {
                console.error('❌ Error creating offer:', error);
                toast({
                  title: "Failed to create offer",
                  description: "There was an error creating your offer",
                  variant: "destructive"
                });
              }
            }
          }}>
            {editOfferId ? 'Update Offer' : 'Create Offer'}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}