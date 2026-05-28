import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SiCoinbase } from "react-icons/si";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Globe,
  Info,
  Landmark,
  Link,
  Link as LinkIcon,
  Lock as LockIcon,
  Mail,
  Pencil,
  RotateCcw,
  Settings,
  Shield,
  Wallet,
  Tag,
  XCircle,
  CircleDollarSign,
  ListFilter
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/hooks/use-toast";

interface BankInfo {
  institution: {
    name: string;
    institution_id: string;
  };
  account: {
    name: string;
    type: string;
    subtype: string;
    mask: string;
    balances: {
      available: number | null;
      current: number | null;
      limit?: number | null;
      iso_currency_code: string;
    };
    id: string;
    routing_number?: string;
    account_holder?: {
      name: string;
      phone?: string;
      email?: string;
      address?: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
      };
    };
  };
  supported_payment_methods: {
    zelle?: {
      enabled: boolean;
      email?: string;
      phone?: string;
    };
    wire?: {
      enabled: boolean;
      swift_code?: string;
      routing_number?: string;
    };
    ach?: {
      enabled: boolean;
    };
  };
  supported_currencies: string[];
}

interface Transaction {
  id: number;
  offerId: number;
  makerWalletAddress: string;
  takerWalletAddress: string;
  type: 'buy' | 'sell';
  status: 'pending' | 'searching' | 'matched' | 'verification' | 'completed' | 'failed' | 'cancelled' | 'dispute';
  token: string;
  amount: number;
  fiatCurrency: string;
  paymentMethod: string;
  makerApproval?: boolean;
  takerApproval?: boolean;
  platformApproval?: boolean;
  paymentConfirmedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  paymentEvidence?: any[];
  disputeEvidence?: any[];
  disputeReason?: string;
  disputeRaisedAt?: string;
  failureReason?: string;
}

interface OfferDetails {
  id: string;
  type: 'buy' | 'sell';
  token: string;
  fiatCurrency: string;
  amount: string | {
    total: string;
    pending: string;
    available: string;
  };
  lockedAmount?: string; // Amount locked in pending transactions
  price: string;
  priceType: 'fixed' | 'floating';
  priceMargin?: string; // For floating price offers
  totalValue: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  minOrderAmount?: string;
  maxOrderAmount?: string;
  paymentTimeLimit?: number;
  remarks?: string; // Payment instructions
  autoReply?: string; // Auto-reply message
  visibility?: 'public' | 'private';
  makerFinancialAccountDetails?: {
    id: string;
    accountName?: string;
    accountType?: string;
    mask?: string;
    institution?: {
      name: string;
      id?: string;
    };
    paymentCapabilities?: Record<string, any>;
    regionalDetails?: Record<string, any>;
  };
  paymentMethods: (string | {
    type: string;
    details: Record<string, any>;
  } | {
    method: {
      type: string;
      email?: string;
    };
    source: {
      type: string;
      bankInfo: BankInfo;
    };
  })[];
  restrictions?: {
    minAmount?: number;
    maxAmount?: number;
    allowedCountries?: string[];
  };
  maker?: {
    id: string;
    walletAddress: string;
    reputation?: number;
    completedTrades?: number;
  };
}

export default function OfferDetails() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("details");
  
  // Extract offerId from the URL path directly
  const id = location.split('/').pop();
  const offerId = id;
  
  // Query for offer details
  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', offerId],
    queryFn: async () => {
      const response = await axios.get(`/api/offers/${offerId}`);
      return response.data as OfferDetails;
    },
    enabled: !!offerId
  });
  
  // Query for transactions associated with this offer
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions', 'offer', offerId],
    queryFn: async () => {
      // Use the offers/:id/transactions endpoint
      const response = await axios.get(`/api/offers/${offerId}/transactions`);
      return response.data as Transaction[];
    },
    enabled: !!offerId && activeTab === "transactions"
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  // Helper function to get amount details
  const getAmountDetails = (amount: string | { total: string; pending: string; available: string }) => {
    if (typeof amount === 'string') {
      // If it's using legacy string amount format, also check for lockedAmount field
      const lockedAmount = offer?.lockedAmount || '0';
      return {
        total: amount,
        pending: lockedAmount,
        available: lockedAmount && parseFloat(lockedAmount) > 0 ? 
          (parseFloat(amount) - parseFloat(lockedAmount)).toString() : 
          amount
      };
    }
    // Return the structured amount object
    return amount;
  };

  const handleCopyPaymentLink = () => {
    const link = `${window.location.origin}/pay/${offerId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Payment link copied",
      description: "The payment link has been copied to your clipboard."
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/maker')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-8 w-48 bg-muted animate-pulse rounded-md"></div>
          </div>
          <Card className="p-6">
            <div className="space-y-6">
              <div className="h-24 bg-muted animate-pulse rounded-md"></div>
              <div className="h-48 bg-muted animate-pulse rounded-md"></div>
              <div className="h-32 bg-muted animate-pulse rounded-md"></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/maker')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Offer Not Found</h1>
          </div>
          <Card className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-4">This offer could not be found or has been removed.</p>
            <Button onClick={() => setLocation('/maker')}>
              Return to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const amounts = getAmountDetails(offer.amount);

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/maker')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Offer Details</h1>
              <p className="text-sm text-muted-foreground">Offer ID: #{offerId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleCopyPaymentLink}
              className="flex items-center gap-2"
            >
              <Link className="h-4 w-4" />
              <span>Copy Payment Link</span>
            </Button>
            <Switch
              checked={offer.status === 'active'}
              // Add your onCheckedChange handler here
            />
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Main Offer Information */}
          <Card className="p-6">
            <div className="space-y-6">
              {/* Header with logo and status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#0052FF]/10 rounded-full">
                    <SiCoinbase className="w-8 h-8 text-[#0052FF]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {offer.type === 'buy' ? 'Buy' : 'Sell'} {offer.token}
                    </h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Created {new Date(offer.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Trading {offer.token}/{offer.fiatCurrency || 'USD'}</span>
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(offer.status)}>
                  {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                </Badge>
              </div>
              
              {/* Divider between sections */}
              <Separator />
              
              {/* Basic Information Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Offer Type</p>
                  <p className={`text-lg font-semibold ${offer.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    {offer.type === 'buy' ? 'Buy' : 'Sell'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Asset</p>
                  <p className="text-lg font-semibold">{offer.token}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="text-lg font-semibold">{offer.fiatCurrency || 'USD'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price Type</p>
                  <p className="text-lg font-semibold">
                    {offer.priceType === 'fixed' ? 'Fixed' : 'Floating'}
                  </p>
                </div>
              </div>
              
              {/* Divider before amount details */}
              <Separator />
              
              {/* Amount Details Section */}
              <div>
                <h3 className="text-md font-medium mb-4">Amount Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-accent/5 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Total Amount</p>
                    </div>
                    <p className="text-2xl font-bold">
                      {parseFloat(amounts.total).toLocaleString()} {offer.token}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {offer.priceType === 'fixed' 
                        ? `$${(parseFloat(amounts.total) * parseFloat(offer.price)).toLocaleString()}` 
                        : `Market price ${parseFloat(offer.price) > 0 ? '+' : ''}${offer.price}%`}
                    </p>
                  </div>

                  <div className="bg-green-500/5 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      <p className="text-sm font-medium">Available</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {parseFloat(amounts.available).toLocaleString()} {offer.token}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {offer.priceType === 'fixed' 
                        ? `$${(parseFloat(amounts.available) * parseFloat(offer.price)).toLocaleString()}` 
                        : `Market price ${parseFloat(offer.price) > 0 ? '+' : ''}${offer.price}%`}
                    </p>
                  </div>

                  <div className="bg-yellow-500/5 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <LockIcon className="h-4 w-4 mr-2 text-yellow-500" />
                      <p className="text-sm font-medium">Pending (Locked)</p>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {parseFloat(amounts.pending).toLocaleString()} {offer.token}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {offer.priceType === 'fixed' 
                        ? `$${(parseFloat(amounts.pending) * parseFloat(offer.price)).toLocaleString()}` 
                        : `Market price ${parseFloat(offer.price) > 0 ? '+' : ''}${offer.price}%`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs Section */}
          <Card className="p-6">
            <Tabs
              defaultValue="details"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <span>Offer Details</span>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4" />
                  <span>Transactions</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4" />
                  <span>Stats & Analytics</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Payment Methods</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Payment methods that can be used with this offer</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-6">
                    {offer.paymentMethods.map((payment, index) => (
                      <div
                        key={index}
                        className="space-y-4 border border-border rounded-lg overflow-hidden"
                      >
                        {/* Payment Method Section */}
                        <div className="flex items-center justify-between p-4 bg-card">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                              {typeof payment !== 'string' && 'method' in payment ? (
                                payment.method.type.toLowerCase() === 'zelle' ? (
                                  <CreditCard className="h-5 w-5 text-primary" />
                                ) : (
                                  <Wallet className="h-5 w-5 text-primary" />
                                )
                              ) : (
                                typeof payment !== 'string' && 'type' in payment ? (
                                  payment.type === 'bank' ? (
                                    <DollarSign className="h-5 w-5 text-primary" />
                                  ) : (
                                    <CreditCard className="h-5 w-5 text-primary" />
                                  )
                                ) : (
                                  <CreditCard className="h-5 w-5 text-primary" />
                                )
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {typeof payment !== 'string' ? (
                                  'method' in payment ? 
                                    payment.method.type.toUpperCase() : 
                                    'type' in payment ? 
                                      payment.type.toUpperCase() : 
                                      'PAYMENT METHOD'
                                ) : (
                                  payment.toUpperCase()
                                )}
                              </p>
                              {typeof payment !== 'string' && 'method' in payment && payment.method.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="h-4 w-4" />
                                  <span>{payment.method.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge className="bg-primary/20 text-primary border-primary/20">
                            Payment Method
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="transactions">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Transactions</h3>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">All transactions associated with this offer</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {isLoadingTransactions ? (
                  <div className="space-y-4">
                    <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-card">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${
                              transaction.status === 'completed' ? 'bg-green-500/10' : 
                              transaction.status === 'verification' ? 'bg-yellow-500/10' : 
                              transaction.status === 'matched' ? 'bg-blue-500/10' : 
                              transaction.status === 'failed' || transaction.status === 'cancelled' ? 'bg-red-500/10' : 
                              'bg-gray-500/10'
                            }`}>
                              {transaction.status === 'completed' ? (
                                <CheckCircle2 className={`h-5 w-5 ${
                                  transaction.status === 'completed' ? 'text-green-500' : 
                                  transaction.status === 'verification' ? 'text-yellow-500' : 
                                  transaction.status === 'matched' ? 'text-blue-500' : 
                                  transaction.status === 'failed' || transaction.status === 'cancelled' ? 'text-red-500' : 
                                  'text-gray-500'
                                }`} />
                              ) : transaction.status === 'verification' ? (
                                <Shield className="h-5 w-5 text-yellow-500" />
                              ) : transaction.status === 'matched' ? (
                                <ArrowUpRight className="h-5 w-5 text-blue-500" />
                              ) : transaction.status === 'failed' || transaction.status === 'cancelled' ? (
                                <XCircle className="h-5 w-5 text-red-500" />
                              ) : (
                                <Clock className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">Transaction #{transaction.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(transaction.createdAt).toLocaleDateString()} · {transaction.paymentMethod}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <p className="font-semibold text-right">
                              {transaction.amount.toLocaleString()} {transaction.fiatCurrency}
                            </p>
                            <Badge className={`mt-1 ${
                              transaction.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                              transaction.status === 'verification' ? 'bg-yellow-500/10 text-yellow-500' : 
                              transaction.status === 'matched' ? 'bg-blue-500/10 text-blue-500' : 
                              transaction.status === 'failed' || transaction.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 
                              'bg-gray-500/10 text-gray-500'
                            }`}>
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4 bg-accent/5 flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Taker</p>
                            <p className="font-mono text-sm">
                              {transaction.takerWalletAddress.slice(0, 6)}...{transaction.takerWalletAddress.slice(-4)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="text-xs">View Details</Button>
                            {transaction.status === 'matched' && (
                              <Button variant="default" size="sm" className="text-xs">Verify Payment</Button>
                            )}
                            {transaction.status === 'verification' && !transaction.makerApproval && (
                              <Button variant="default" size="sm" className="text-xs">Confirm Receipt</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CircleDollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg mb-2">No transactions yet</p>
                    <p className="text-muted-foreground mb-4">This offer hasn't been used in any transactions yet.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="stats">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Stats & Analytics</h3>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <p className="text-sm font-medium">Completed Transactions</p>
                    </div>
                    <p className="text-2xl font-bold">
                      {transactions?.filter(t => t.status === 'completed').length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total volume: {transactions?.filter(t => t.status === 'completed')
                        .reduce((sum, t) => sum + t.amount, 0).toLocaleString() || 0} {offer.fiatCurrency}
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-yellow-500" />
                      <p className="text-sm font-medium">Pending Verification</p>
                    </div>
                    <p className="text-2xl font-bold">
                      {transactions?.filter(t => t.status === 'verification').length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Value: {transactions?.filter(t => t.status === 'verification')
                        .reduce((sum, t) => sum + t.amount, 0).toLocaleString() || 0} {offer.fiatCurrency}
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <p className="text-sm font-medium">Failed/Cancelled</p>
                    </div>
                    <p className="text-2xl font-bold">
                      {transactions?.filter(t => t.status === 'failed' || t.status === 'cancelled').length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Value: {transactions?.filter(t => t.status === 'failed' || t.status === 'cancelled')
                        .reduce((sum, t) => sum + t.amount, 0).toLocaleString() || 0} {offer.fiatCurrency}
                    </p>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-md font-medium mb-4">Transaction Timeline</h4>
                  <div className="h-64 w-full bg-accent/5 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Transaction history graph coming soon</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Restrictions and Requirements */}
          {offer.restrictions && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Trade Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Minimum Amount</p>
                  <p className="font-medium">
                    ${offer.restrictions.minAmount?.toLocaleString() ?? 'No minimum'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Maximum Amount</p>
                  <p className="font-medium">
                    ${offer.restrictions.maxAmount?.toLocaleString() ?? 'No maximum'}
                  </p>
                </div>
                {offer.restrictions.allowedCountries && (
                  <div className="col-span-2 space-y-2">
                    <p className="text-sm text-muted-foreground">Allowed Countries</p>
                    <div className="flex flex-wrap gap-2">
                      {offer.restrictions.allowedCountries.map((country) => (
                        <Badge key={country} variant="secondary">
                          {country}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Maker Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Maker Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {offer.maker?.walletAddress && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Wallet Address</p>
                  <p className="font-mono text-sm">
                    {offer.maker?.walletAddress?.slice(0, 6)}...{offer.maker?.walletAddress?.slice(-4)}
                  </p>
                </div>
              )}
              {offer.maker?.reputation !== undefined && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Reputation Score</p>
                  <p className="font-medium">{offer.maker?.reputation?.toFixed(1)}/5.0</p>
                </div>
              )}
              {offer.maker?.completedTrades !== undefined && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Completed Trades</p>
                  <p className="font-medium">{offer.maker?.completedTrades}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}