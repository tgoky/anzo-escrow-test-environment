import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';
import {useSolanaWallets} from '@privy-io/react-auth/solana';
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, Settings, Copy, CheckCircle2, ArrowRight, Building2,
  ClipboardList, ChevronRight, ArrowUpRight, ArrowDownLeft, Clock,
  XCircle, ExternalLink, MessageSquare
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from 'wouter';
import { AccountConnectionDialog } from "@/components/ui/account-connection-dialog";
import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import type { FinancialAccount } from '@shared/types/financial-account';
import { useToast } from "@/hooks/use-toast";
import getWalletAssets from "@/lib/solana-fetch-assets";
import { connect } from "http2";

interface AccountPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisconnect: () => void;
  selectedAccountIndex?: number;
  onAccountSelect?: (index: number) => void;
  onAccountDisconnect?: (index: number) => void;
  setAccountPanelOpen: (open: boolean) => void;
  makerSettings?: MakerSettings;
  onMakerSettingsChange?: (settings: MakerSettings) => void;
}

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

interface MakerSettings {
  isMaker: boolean;
  pricing: {
    [key: string]: {
      markup: number;
      active: boolean;
    }
  };
  paymentInstructions: string;
}

export function AccountPanel({
  open,
  onOpenChange,
  onDisconnect,
  selectedAccountIndex = 0,
  onAccountSelect = () => {},
  onAccountDisconnect = () => {},
  setAccountPanelOpen,
  makerSettings = {
    isMaker: false,
    pricing: {
      USDC: { markup: 2, active: true }
    },
    paymentInstructions: ""
  },
  onMakerSettingsChange = () => {}
}: AccountPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("wallet");
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [location, setLocation] = useLocation();
  const [accountConnectionOpen, setAccountConnectionOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  const [walletDetails, setWalletDetails] = useState<{
    balance: number;
    balanceUSD: number;
    recentTransactions: any[];
  } | null>(null);

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  const {connectOrCreateWallet, connectWallet, login} = usePrivy();
  const {wallets} = useSolanaWallets();

  const {
    connectedAccounts,
    addAccount,
    removeAccount,
    setSelectedAccountIndex: setStoreSelectedIndex
  } = useFinancialAccountStore();

  const [connection, setConnection] = useState(new Connection("http://localhost:8899", {
    commitment: "confirmed",
    // confirmTransactionInitialTimeout: 60000,
  }));

  useEffect(() => {
    if (selectedAccountIndex !== undefined) {
      setStoreSelectedIndex(selectedAccountIndex);
    }
  }, [selectedAccountIndex]);

  // Query to fetch transactions
  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions', wallets[0]?.address],
    queryFn: async () => {
      if (!wallets[0]?.address) return [];
      try {
        console.log('🔍 Fetching transactions for wallet:', wallets[0]?.address);
        // Use wallet address exactly as provided - no normalization
        const response = await axios.get(`/api/transactions/${wallets[0]?.address}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.data) {
          console.warn('⚠️ No data received from transactions API');
          return [];
        }

        // Ensure we're getting the expected data structure
        if (!Array.isArray(response.data)) {
          console.error('❌ Invalid response format from transactions API');
          return [];
        }

        console.log('✅ Fetched transactions:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        if (axios.isAxiosError(error)) {
          console.error('Response:', error.response?.data);
        }
        throw new Error('Failed to fetch transactions');
      }
    },
    refetchInterval: 300000,
    retries: 3,
    placeholderData: []
  });
  
  // Query to fetch unread message counts
  const { data: unreadCounts } = useQuery({
    queryKey: ['/api/messages/unread-count', wallets[0]?.address],
    queryFn: async () => {
      if (!wallets[0]?.address) return { count: 0 };
      
      try {
        const response = await axios.get(`/api/messages/unread-count/${wallets[0]?.address}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching unread message count:', error);
        return { count: 0 };
      }
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

    // Query to fetch transactions
  const { data: tokensData, isLoading: isLoadingTokens } = useQuery({
    queryKey: ['tokens', wallets[0]?.address],
    queryFn: async () => {
      console.log("token tracker")
      if (!wallets[0]?.address) return [];
      return await getWalletAssets(wallets[0]?.address) ?? []
    },
    refetchInterval: 300000,
    retries: 3,
    placeholderData: []
  });

  const transactions = Array.isArray(transactionsData) ? transactionsData : [];

  // Filter transactions based on user selection
  const filteredTransactions = transactions.filter((tx: Transaction) => {
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const txDate = new Date(tx.createdAt);
    const matchesDateRange = (!dateRange.from || txDate >= dateRange.from) &&
                             (!dateRange.to || txDate <= dateRange.to);
    return matchesStatus && matchesType && matchesDateRange;
  });

  // Debug logging
  if (wallets[0]?.address) {
    console.log('🔍 Current wallet:', wallets[0]?.address);
    console.log('📊 Current transactions:', transactions);
    console.log('🔍 Filtered transactions:', filteredTransactions);
    console.log('📊 Tokens:', tokensData);
  }

  useEffect(() => {
    const loadWalletDetails = async () => {
      if (!wallets[0]?.address) return;

      try {
        setIsLoadingDetails(true);
        const publicKey = new PublicKey(wallets[0]?.address);
        const [balance/* , transactions */] = await Promise.all([
          connection.getBalance(publicKey),
          // connection.getConfirmedSignaturesForAddress2(publicKey, { limit: 5 })
        ]);

        // const solPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        //   .then(res => res.json())
        //   .then(data => data.solana.usd);

        const solBalance = balance / LAMPORTS_PER_SOL;
        // const solUsdValue = solBalance * solPrice;

        setWalletDetails(() => ({
          balance: solBalance,
          balanceUSD: 0,
          recentTransactions: transactions
        }));

      } catch (err) {
        console.error("Error loading wallet details:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    if (open && wallets[0]?.address) {
      loadWalletDetails();
    }
  }, [wallets]);
  
  const handlePrivyConnect = async () => {
    await connectOrCreateWallet()
  }

  const handleAddPaymentMethod = () => {
    if (!wallets[0]?.address) {
      console.error('Please connect your wallet first');
      return;
    }
    setAccountConnectionOpen(true);
  };

  const handleAccountConnect = (account: FinancialAccount) => {
    addAccount(account);
    setAccountConnectionOpen(false);
    const newIndex = connectedAccounts.length;
    setStoreSelectedIndex(newIndex);
    onAccountSelect(newIndex);
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

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
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'deleted':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'searching':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'matched':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'verification':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] p-0">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl">
                  {showSettings ? 'Settings' : 'Account'}
                </SheetTitle>
                {wallets[0]?.address && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {showSettings ? (
                <div className="mt-4 space-y-4">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium">Account Information</h3>
                        <p className="text-sm text-gray-500">Manage your wallet and financial accounts</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                wallets[0]?.address && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between bg-accent/20 p-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Connected with Phantom</div>
                          <div className="font-mono font-medium">
                            {wallets[0].address ? `${wallets[0].address.slice(0, 6)}...${wallets[0].address.slice(-4)}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => copyAddress(wallets[0].address)}
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button
                      onClick={onDisconnect}
                      variant="outline"
                      className="w-full"
                    >
                      Disconnect Wallet
                    </Button>
                  </div>
                )
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {!wallets[0]?.address ? (
                <div className="p-6">
                  <Button
                    onClick={handlePrivyConnect}
                    className="w-full"
                    size="lg"
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue="wallet" className="h-full" value={activeTab} onValueChange={setActiveTab}>
                  <div className="px-6 py-4 border-b">
                    <TabsList className="grid grid-cols-3 gap-4">
                      <TabsTrigger value="wallet">
                        <Wallet className="h-4 w-4 mr-2" />
                        Assets
                      </TabsTrigger>
                      <TabsTrigger value="banks">
                        <Building2 className="h-4 w-4 mr-2" />
                        Accounts
                      </TabsTrigger>
                      <TabsTrigger value="orders">
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Activity
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="wallet" className="p-6 mt-0">
                    <div className="space-y-6">
                        {isLoadingDetails ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-sm text-gray-500">Loading wallet details...</p>
                          </div>
                        ) : walletDetails ? (
                          <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-gray-50">
                              <div className="text-sm text-gray-500">Total Balance (USD)</div>
                              <div className="text-2xl font-semibold mt-1">
                                ${walletDetails.balanceUSD.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500 mt-2">
                                {walletDetails.balance.toFixed(4)} SOL
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h3 className="text-sm font-medium text-gray-900">Your Assets</h3>
                              <div className="space-y-2">
                                {tokensData?.map((token) => (
                                  <div key={token.mint} className="p-3 rounded-lg bg-white border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {token.logo ? (
                                        <img src={token.logo} alt={token.name} className="w-8 h-8 rounded-full" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                          <span className="text-xs font-medium">{token.symbol?.slice(0, 2)}</span>
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-medium">{token.name || token.symbol}</div>
                                        <div className="text-sm text-gray-500">
                                          {token.amount} {token.symbol}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">${token.usdValue.toFixed(2)}</div>
                                      <div className="text-sm text-gray-500">${token.price.toFixed(2)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h3 className="text-sm font-medium text-gray-900">Recent Transactions</h3>
                              <div className="space-y-2">
                                {walletDetails.recentTransactions.map((tx, index) => (
                                  <a
                                    key={tx.signature}
                                    href={`https://explorer.solana.com/tx/${tx.signature}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                        <ArrowRight className="h-4 w-4 text-green-600" />
                                      </div>
                                      <div>
                                        <div className="font-medium">Transaction {index + 1}</div>
                                        <div className="text-xs text-gray-500 font-mono">
                                          {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                                        </div>
                                      </div>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-gray-400" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No wallet details</h3>
                            <p className="text-gray-500">
                              Make sure your wallet is connected and has some SOL
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="banks" className="p-6 mt-0">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium text-gray-900">Connected Accounts</h3>
                          <Button
                            onClick={handleAddPaymentMethod}
                            size="sm"
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          >
                            Add Payment Method
                          </Button>
                        </div>

                        {connectedAccounts.length > 0 ? (
                          <div className="space-y-2">
                            {connectedAccounts.map((account, index) => (
                              <div
                                key={account.id}
                                className={`p-4 rounded-xl transition-colors cursor-pointer ${
                                  index === selectedAccountIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                                onClick={() => onAccountSelect(index)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                                      <Building2 className="h-5 w-5 text-accent-foreground" />
                                    </div>
                                    <div>
                                      <div className="font-medium">
                                        {account.account.institution.name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {account.account.accountType} ••••{account.account.mask}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {index === selectedAccountIndex && (
                                      <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-500 rounded-full">
                                        Selected
                                      </span>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeAccount(index);
                                        onAccountDisconnect(index);
                                      }}
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No accounts connected
                            </h3>
                            <p className="text-gray-500">
                              Connect a bank account to start trading
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="orders" className="p-6 mt-0">
                      <div className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border">
                          <h3 className="text-base font-medium mb-3">Transaction History</h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full text-sm h-9">
                                  <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Status</SelectItem>
                                  <SelectItem value="pending">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-yellow-500" />
                                      <span>Pending</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="completed">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                      <span>Completed</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="failed">
                                    <div className="flex items-center gap-1.5">
                                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                                      <span>Failed</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="searching">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Searching</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="matched">
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                      <span>Matched</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="verification">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-yellow-500" />
                                      <span>Verification</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="cancelled">
                                    <div className="flex items-center gap-1.5">
                                      <XCircle className="w-3.5 h-3.5 text-gray-500" />
                                      <span>Cancelled</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full text-sm h-9">
                                  <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Types</SelectItem>
                                  <SelectItem value="buy">
                                    <div className="flex items-center gap-1.5">
                                      <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />
                                      <span>Buy</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="sell">
                                    <div className="flex items-center gap-1.5">
                                      <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                                      <span>Sell</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal h-9",
                                      !dateRange.from && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange.from ? (
                                      dateRange.to ? (
                                        <>
                                          {format(dateRange.from, "MM/dd/yy")} -{" "}
                                          {format(dateRange.to, "MM/dd/yy")}
                                        </>
                                      ) : (
                                        format(dateRange.from, "MM/dd/yy")
                                      )
                                    ) : (
                                      "Filter by date"
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end" side="bottom">
                                  <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange.from}
                                    selected={{
                                      from: dateRange.from,
                                      to: dateRange.to,
                                    }}
                                    onSelect={(range) => {
                                      setDateRange({
                                        from: range?.from,
                                        to: range?.to
                                      });
                                    }}
                                    numberOfMonths={1}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>

                        {isLoadingTransactions ? (
                          <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm text-gray-500">Loading transactions...</p>
                          </div>
                        ) : filteredTransactions && filteredTransactions.length > 0 ? (
                          <div className="space-y-2 px-1">
                            {filteredTransactions.map((tx: Transaction) => {
                              return (
                                <div
                                  key={tx.id}
                                  className="p-4 mb-3 last:mb-0 rounded-lg bg-card border shadow-sm hover:shadow-md transition-all cursor-pointer"
                                  onClick={() => {
                                    // Close the panel and navigate to transaction details in activity tab
                                    onOpenChange(false);
                                    setAccountPanelOpen(false);
                                    
                                    // Store transaction ID and wallet address in localStorage for opening in ActivityTab
                                    localStorage.setItem('view_transaction_id', tx.id.toString());
                                    
                                    // Make sure to store the wallet address as well
                                    if (wallets[0]?.address) {
                                      localStorage.setItem('wallet_address', wallets[0].address);
                                      console.log('🔄 Stored wallet and transaction for navigation:', {
                                        wallet: wallets[0].address,
                                        transactionId: tx.id,
                                      });
                                    }
                                    
                                    // Use a toast to indicate navigation
                                    toast({
                                      title: "Opening transaction details",
                                      description: `Navigating to transaction ${tx.id.toString().substring(0, 8)}...`,
                                      variant: "default",
                                    });
                                    
                                    // Navigate to maker dashboard with activity tab active
                                    setTimeout(() => {
                                      setLocation('/maker?tab=activity');
                                    }, 100);
                                  }}
                                >
                                  {/* Transaction header with type and status */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1.5 rounded-full flex items-center justify-center ${tx.type === 'buy' ? 'bg-green-100/70' : 'bg-red-100/70'}`}>
                                        {tx.type === 'buy' ? (
                                          <ArrowDownLeft className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <ArrowUpRight className="w-4 h-4 text-red-600" />
                                        )}
                                      </div>
                                      <span className="font-medium">
                                        {tx.type === 'buy' ? 'Buy' : 'Sell'} {tx.token}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {getStatusIcon(tx.status)}
                                      <Badge variant={getStatusBadgeVariant(tx.status)}>
                                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Transaction amounts */}
                                  <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div className="bg-muted/40 p-2 rounded-md">
                                      <div className="text-xs text-muted-foreground mb-1">Fiat Amount</div>
                                      <div className="font-medium">
                                        {tx.currency || '$'}{tx.amount ? Number(tx.amount).toFixed(2) : '0.00'}
                                      </div>
                                    </div>
                                    <div className="bg-muted/40 p-2 rounded-md">
                                      <div className="text-xs text-muted-foreground mb-1">Token Amount</div>
                                      <div className="font-medium text-sm break-words">
                                        {tx.tokenAmount ? Number(tx.tokenAmount).toFixed(4) : Number(tx.amount).toFixed(4)} {tx.token}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Transaction date */}
                                  <div className="flex justify-between items-center pt-2 border-t border-border">
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                    <div className="text-xs">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 px-2 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation(); // Prevent parent onClick from triggering
                                          
                                          // Add debug logging
                                          console.log("🔍 AccountPanel opening transaction details:", tx);
                                          console.log("🔑 AccountPanel Transaction ID type:", typeof tx.id);
                                          console.log("🔑 AccountPanel Transaction ID (raw):", tx.id);
                                          console.log("🔑 AccountPanel Transaction ID (toString):", tx.id.toString());
                                          console.log("👛 AccountPanel Wallet address:", tx.walletAddress);
                                          
                                          // Close the panel
                                          onOpenChange(false);
                                          setAccountPanelOpen(false);
                                          
                                          // Store transaction ID in localStorage for opening in ActivityTab
                                          // Always convert to string to ensure consistent type across components
                                          const transactionIdString = typeof tx.id === 'number' || typeof tx.id === 'string' 
                                            ? tx.id.toString() 
                                            : String(tx.id);
                                          
                                          console.log("📝 Storing transaction ID in localStorage:", {
                                            originalId: tx.id,
                                            originalType: typeof tx.id,
                                            storedIdString: transactionIdString
                                          });
                                          
                                          localStorage.setItem('view_transaction_id', transactionIdString);
                                          
                                          // Store wallet address for consistent connection
                                          if (tx.walletAddress) {
                                            console.log("✅ Storing wallet address:", tx.walletAddress);
                                            localStorage.setItem('wallet_address', tx.walletAddress);
                                          }
                                          
                                          // Add toast notification for debugging
                                          toast({
                                            title: "Opening transaction details",
                                            description: `Transaction ID: ${tx.id}`,
                                            duration: 3000
                                          });
                                          
                                          // Navigate to maker dashboard with activity tab active
                                          console.log("🔄 Navigating to maker dashboard");
                                          setTimeout(() => {
                                            setLocation('/maker?tab=activity');
                                          }, 100);
                                        }}
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Details
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions</h3>
                            <p className="text-gray-500">
                              Once you start trading, your transactions will appear here
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AccountConnectionDialog
        open={accountConnectionOpen}
        onClose={() => setAccountConnectionOpen(false)}
        onOpenChange={setAccountConnectionOpen}
        onAccountConnect={handleAccountConnect}
        walletAddress={wallets[0]?.address || ''}
      />
    </>
  );
}