import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  XCircle,
  AlertCircle,
  Copy,
  Search
} from "lucide-react";
import { TransactionDetailsView } from "@/components/maker/TransactionDetailsView";
import axios from "axios";

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  status: string;
  amount: number;
  currency?: string;
  tokenAmount?: number;
  token: string;
  walletAddress: string;
  counterpartyAddress?: string; // Legacy field - prefer takerWalletAddress
  takerWalletAddress?: string;  // New preferred field
  makerWalletAddress?: string;  // Address of the maker who created the offer
  makerFinancialAccount?: any;
  takerFinancialAccount?: any;
  makerPaymentMethod?: string;
  takerPaymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  timeoutAt?: string;
  failureReason?: string;
  usdAmount?: number;
  offerId?: number;
  orderNumber?: string; // Added for display purposes
}

// Type for the message count query response
interface UnreadCountResponse {
  count: number;
}

export function ActivityTab({ walletAddress }: { walletAddress: string }) {
  const { toast } = useToast();
  const [coinFilter, setCoinFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{start?: Date; end?: Date}>({});
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [viewingDetails, setViewingDetails] = useState(false);
  
  // Query to fetch transactions
  const { data: transactions, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/transactions', walletAddress],
    queryFn: async () => {
      try {
        // Use wallet address endpoint for fetching transactions associated with this wallet
        console.log('🔍 Fetching transactions for wallet:', walletAddress);
        const response = await axios.get(`/api/transactions/${walletAddress}`);
        
        console.log('📊 Raw transaction data:', response.data);
        
        if (!response.data || !Array.isArray(response.data)) {
          console.error('❌ Invalid transaction data format:', response.data);
          return [];
        }
        
        // Format order numbers using transaction ID for consistency
        const formattedData = response.data.map((tx: Transaction) => ({
          ...tx,
          // Generate a consistent order number format using transaction ID
          orderNumber: tx.orderNumber || `TX-${tx.id.toString().padStart(8, '0')}`,
          // Ensure consistent types
          id: tx.id.toString(),
          amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount,
          tokenAmount: tx.tokenAmount ? 
            (typeof tx.tokenAmount === 'string' ? parseFloat(tx.tokenAmount) : tx.tokenAmount) 
            : 0
        }));
        
        console.log('✅ Formatted transactions:', formattedData.length);
        return formattedData;
      } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        throw error;
      }
    },
    enabled: !!walletAddress
  });
  
  // Check if there's a stored transaction ID to view
  useEffect(() => {
    // Check for transaction IDs in both storage locations
    // The TradeDialog uses 'currentTransactionId', while AccountPanel uses 'view_transaction_id'
    const storedTransactionId = localStorage.getItem('currentTransactionId') || localStorage.getItem('view_transaction_id');
    const storedWalletAddress = localStorage.getItem('wallet_address');
    
    console.log("🔍 Checking for stored transaction:", {
      id: storedTransactionId,
      idType: typeof storedTransactionId,
      isNumeric: storedTransactionId !== null && !isNaN(Number(storedTransactionId)),
      numericValue: storedTransactionId !== null ? Number(storedTransactionId) : null,
      wallet: storedWalletAddress,
      currentWallet: walletAddress,
      hasTransactions: transactions !== undefined && transactions.length > 0,
      transactionCount: transactions?.length || 0
    });
    
    // If wallet address doesn't match current wallet, don't attempt to load transaction
    if (storedWalletAddress && storedWalletAddress !== walletAddress) {
      console.log("⚠️ Stored wallet address doesn't match current wallet address");
      localStorage.removeItem('view_transaction_id');
      localStorage.removeItem('wallet_address');
      return;
    }
    
    if (storedTransactionId && transactions) {
      // Log each transaction ID for debugging
      transactions.forEach((tx: Transaction) => {
        console.log("🔍 ActivityTab examining transaction:", {
          id: tx.id,
          idType: typeof tx.id,
          idToString: tx.id.toString(),
          storedId: storedTransactionId,
          storedIdType: typeof storedTransactionId,
          matches: tx.id.toString() === storedTransactionId
        });
      });
      
      // Find the transaction by ID and view its details
      // Try multiple comparison techniques to handle both string and numeric IDs
      const foundTransaction = transactions.find((tx: Transaction) => {
        // First try direct comparison (for cases where both are the same type)
        if (tx.id === storedTransactionId) return true;
        
        // Then try string comparison (most reliable)
        if (tx.id.toString() === storedTransactionId) return true;
        
        // Try numeric comparison if the stored ID can be converted to a number
        if (!isNaN(Number(storedTransactionId)) && Number(tx.id) === Number(storedTransactionId)) return true;
        
        return false;
      });
      
      if (foundTransaction) {
        console.log("📋 Found transaction to view:", foundTransaction);
        setSelectedTransaction(foundTransaction);
        setViewingDetails(true);
        
        // Show success toast
        toast({
          title: "Transaction details loaded",
          description: `Viewing transaction ${foundTransaction.orderNumber || foundTransaction.id}`,
          variant: "default"
        });
        
        // Refresh transaction data after navigation in case there are updates
        refetch();
      } else {
        console.log("❌ Transaction not found in loaded transactions");
        // Try to refetch transactions in case the one we're looking for isn't loaded yet
        console.log("🔄 Refetching transactions to find ID:", storedTransactionId);
        refetch().then((result) => {
          // Use the new data from the refetch result, not the stale transactions in the closure
          const freshTransactions = result.data || [];
          console.log("🔄 Refetch complete, fresh transactions:", freshTransactions.length);
          
          // After refetching, try to find the transaction again using multiple comparison methods on fresh data
          const newFoundTransaction = freshTransactions.find((tx: Transaction) => {
            // Try all comparison methods again
            if (tx.id === storedTransactionId) return true;
            if (tx.id.toString() === storedTransactionId) return true;
            if (!isNaN(Number(storedTransactionId)) && Number(tx.id) === Number(storedTransactionId)) return true;
            return false;
          });
          
          if (newFoundTransaction) {
            setSelectedTransaction(newFoundTransaction);
            setViewingDetails(true);
            
            // Show success toast
            toast({
              title: "Transaction details loaded",
              description: `Viewing transaction ${newFoundTransaction.orderNumber || newFoundTransaction.id}`,
              variant: "default"
            });
          } else {
            toast({
              title: "Transaction not found",
              description: "The transaction you're looking for couldn't be found",
              variant: "destructive"
            });
          }
        });
      }
      
      // Remove from localStorage either way
      localStorage.removeItem('view_transaction_id');
      localStorage.removeItem('currentTransactionId');
      localStorage.removeItem('wallet_address');
    } else if (storedTransactionId) {
      console.log("ℹ️ Waiting for transactions to load to find stored transaction ID");
      // If we have a transaction ID but no transactions, trigger a fetch
      refetch();
    } else {
      console.log("ℹ️ No stored transaction ID found in localStorage");
    }
  }, [transactions, toast, refetch, walletAddress]);
  
  // Query to fetch unread message counts (globally)
  const { data: globalUnreadCounts } = useQuery({
    queryKey: ['/api/messages/unread', walletAddress],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching unread message counts for wallet:', walletAddress);
        // Use the correct endpoint path that matches server routes
        const response = await axios.get<UnreadCountResponse>(`/api/messages/unread/${walletAddress}`);
        console.log('📨 Unread message counts:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Error fetching unread message counts:', error);
        return { count: 0 };
      }
    },
    enabled: !!walletAddress,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
  
  // Query to fetch per-transaction unread message counts
  const { data: transactionMessageCounts, isLoading: isLoadingMessageCounts } = useQuery({
    queryKey: ['/api/messages/transaction-counts', walletAddress],
    queryFn: async () => {
      try {
        if (!transactions || transactions.length === 0) return {};
        
        // Get IDs of all transactions to query unread message counts
        const transactionIds = transactions.map((tx: Transaction) => Number(tx.id));
        
        console.log('🔍 Fetching transaction message counts for transactions:', transactionIds);
        
        // Make API call to get unread message counts for all transactions - using correct endpoint path
        const response = await axios.post(`/api/messages/transaction-counts/${walletAddress}`, {
          transactionIds: transactionIds
        });
        
        console.log("📨 Received transaction message counts:", response.data);
        return response.data;
      } catch (error) {
        console.error("❌ Error fetching transaction message counts:", error);
        return {};
      }
    },
    enabled: !!walletAddress && transactions !== undefined && transactions.length > 0,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Filter transactions based on selected filters
  const filteredTransactions = transactions?.filter((tx: Transaction) => {
    // Apply coin filter
    if (coinFilter !== "all" && tx.token !== coinFilter) return false;
    
    // Apply type filter
    if (typeFilter !== "all" && tx.type !== typeFilter.toLowerCase()) return false;
    
    // Apply status filter - use normalized status for comparison
    if (statusFilter !== "all" && normalizeStatus(tx.status) !== statusFilter.toLowerCase()) return false;
    
    // Apply date range filter
    if (dateRange.start && new Date(tx.createdAt) < dateRange.start) return false;
    if (dateRange.end && new Date(tx.createdAt) > dateRange.end) return false;
    
    return true;
  });

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setViewingDetails(true);
  };

  const handleBackToList = () => {
    setViewingDetails(false);
    setSelectedTransaction(null);
    // Clean up any stored transaction IDs
    localStorage.removeItem('view_transaction_id');
    localStorage.removeItem('currentTransactionId');
    localStorage.removeItem('wallet_address');
    refetch(); // Refresh the transaction list when returning
  };

  const copyOrderNumber = (orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber);
    toast({
      title: "Copied to clipboard",
      description: `Order number ${orderNumber} has been copied`,
    });
  };
  
  // Helper function to get the transaction type from the user's perspective
  const getTransactionTypeFromUserPerspective = (tx: Transaction) => {
    // If it's the maker's wallet, display the type from the maker's perspective
    if (tx.walletAddress === walletAddress) {
      return tx.type; // If you made the offer, the type is accurate from your perspective
    } else {
      // For counterparty/taker, flip the transaction type
      return tx.type === 'buy' ? 'sell' : 'buy';
    }
  };

  // Normalize transaction status - handle different spellings and capitalizations
  const normalizeStatus = (status: string): string => {
    status = status.toLowerCase();
    
    // Handle different spellings of cancelled/canceled
    if (status.includes('cancel')) {
      return 'cancelled';
    }
    
    // Handle verification status
    if (status.includes('verif')) {
      return 'verification';
    }
    
    // For other statuses, just use the lowercase version
    return status;
  };
  
  // Status badge colors and icons
  const getStatusBadge = (status: string) => {
    // Normalize the status first
    const normalizedStatus = normalizeStatus(status);
    
    const statusConfig = {
      completed: { variant: "default", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: XCircle },
      pending: { variant: "outline", icon: Clock },
      searching: { variant: "outline", icon: Search },
      matched: { variant: "outline", icon: CheckCircle2 },
      cancelled: { variant: "destructive", icon: XCircle },
      verification: { variant: "secondary", icon: AlertCircle },
      dispute: { variant: "destructive", icon: AlertCircle },
    } as Record<string, { variant: "default" | "destructive" | "outline" | "secondary"; icon: any }>;

    const config = statusConfig[normalizedStatus] || { variant: "outline", icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        <span className="capitalize">{normalizedStatus}</span>
      </Badge>
    );
  };

  if (viewingDetails && selectedTransaction) {
    return (
      <TransactionDetailsView 
        transaction={selectedTransaction} 
        onBack={handleBackToList} 
        walletAddress={walletAddress}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium">Coin</label>
          <Select value={coinFilter} onValueChange={setCoinFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="SOL">SOL</SelectItem>
              <SelectItem value="USDT">USDT</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="BTC">BTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Buy / Sell" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Buy / Sell</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="verification">Verification</SelectItem>
              <SelectItem value="dispute">Dispute</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Date</label>
          <div className="flex space-x-2">
            <Input
              type="date"
              placeholder="Start date"
              onChange={(e) => setDateRange(prev => ({ 
                ...prev, 
                start: e.target.value ? new Date(e.target.value) : undefined 
              }))}
              className="w-full"
            />
            <Input
              type="date"
              placeholder="End date"
              onChange={(e) => setDateRange(prev => ({ 
                ...prev, 
                end: e.target.value ? new Date(e.target.value) : undefined 
              }))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-6 bg-muted/50 p-3 text-sm font-medium">
          <div>Type/Date</div>
          <div>Order No.</div>
          <div>Price</div>
          <div>Fiat/Crypto Amount</div>
          <div>Trading Partner</div>
          <div>Status</div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Loading transactions...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8 text-destructive">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>Error loading transactions</span>
          </div>
        ) : filteredTransactions?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
            <p>No transactions found</p>
            <p className="text-sm">Adjust your filters or create a new offer to start trading</p>
          </div>
        ) : (
          filteredTransactions?.map((tx: Transaction) => (
            <div 
              key={tx.id} 
              className="grid grid-cols-6 p-3 border-b last:border-b-0 hover:bg-muted/20 cursor-pointer"
              onClick={() => handleViewTransaction(tx)}
            >
              <div>
                <div className="font-medium capitalize text-primary">
                  {getTransactionTypeFromUserPerspective(tx)} {tx.token}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-mono mr-1">{tx.orderNumber}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    copyOrderNumber(tx.orderNumber || '');
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="font-medium">
                {Number(tx.amount / (tx.tokenAmount || 1)).toFixed(2)} {tx.currency}
              </div>
              <div>
                <div>
                  {Number(tx.amount).toFixed(2)} {tx.currency}
                </div>
                <div className="text-sm text-muted-foreground">
                  {Number(tx.tokenAmount || 0).toFixed(4)} {tx.token}
                </div>
              </div>
              <div className="flex items-center">
                {/* Determine the correct counterparty address based on maker/taker relationship */}
                {tx.makerWalletAddress === walletAddress ? (
                  /* If current user is maker, then counterparty is taker */
                  (tx.takerWalletAddress && tx.takerWalletAddress !== walletAddress) ? (
                    <span className="text-sm font-mono truncate" title={tx.takerWalletAddress}>
                      {tx.takerWalletAddress.substring(0, 8)}...
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not assigned yet</span>
                  )
                ) : (
                  /* If current user is taker, then counterparty is maker */
                  (tx.makerWalletAddress && tx.makerWalletAddress !== walletAddress) ? (
                    <span className="text-sm font-mono truncate" title={tx.makerWalletAddress}>
                      {tx.makerWalletAddress.substring(0, 8)}...
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown maker</span>
                  )
                )}
                {/* Add badge with unread count if applicable */}
                {transactionMessageCounts && 
                 transactionMessageCounts[tx.id] && 
                 transactionMessageCounts[tx.id] > 0 && (
                  <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{transactionMessageCounts[tx.id]}</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                {getStatusBadge(tx.status)}
                {tx.status === 'completed' && (
                  <Button variant="ghost" size="sm" className="text-xs">Receipt</Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}