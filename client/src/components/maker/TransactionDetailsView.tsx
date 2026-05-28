import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ShieldCheck,
  Copy, 
  Search,
  PaperclipIcon,
  Info as InfoIcon,
  Check,
  Loader2,
  Ban
} from "lucide-react";
import axios from "axios";

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  status: string; // More flexible to handle any status
  amount: number;
  currency?: string;
  tokenAmount?: number;
  token: string;
  walletAddress: string;      // Legacy field (typically the taker)
  counterpartyAddress?: string; // Legacy field - use specific role addresses instead
  makerWalletAddress?: string;  // Maker wallet (offer creator)
  takerWalletAddress?: string;  // Taker wallet (transaction initiator)
  makerFinancialAccount?: any;
  takerFinancialAccount?: any;
  makerPaymentMethod?: string;
  takerPaymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  timeoutAt?: string;
  failureReason?: string;
  usdAmount?: number;
  paymentEvidence?: any[];
  makerApproval?: boolean;
  takerApproval?: boolean;
  platformApproval?: boolean;
  offerId?: number;
  orderNumber?: string;
  // Adding these fields to match database schema
  paymentConfirmedAt?: string | null;
  receivedConfirmedAt?: string | null;
  disputeRaisedAt?: string | null;
  disputeResolvedAt?: string | null;
}

interface Message {
  id: number;
  transactionId: number;
  senderAddress: string;
  receiverAddress: string;
  content: string;
  status: string;
  read: boolean;
  systemMessage: boolean;
  attachmentUrl?: string;
  attachmentType?: string;
  createdAt: string;
  updatedAt: string;
}

export function TransactionDetailsView({ 
  transaction: initialTransaction, 
  onBack,
  walletAddress
}: { 
  transaction: Transaction;
  onBack: () => void;
  walletAddress: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messageInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Add a query to fetch the latest transaction data
  const { data: liveTransaction, isLoading: isTransactionLoading } = useQuery({
    queryKey: ['/api/transactions', initialTransaction.id],
    queryFn: async () => {
      try {
        console.log(`🔄 Fetching latest transaction data for ID: ${initialTransaction.id}`);
        
        // Always use the dedicated endpoint for fetching by transaction ID
        if (!isNaN(Number(initialTransaction.id))) {
          try {
            console.log(`🔄 Using dedicated transaction ID endpoint for ID: ${initialTransaction.id}`);
            const response = await axios.get(`/api/transactions/by-id/${initialTransaction.id}`);
            console.log('📊 Got updated transaction data from ID endpoint:', response.data);
            return response.data;
          } catch (idError) {
            console.error('❌ Error fetching transaction from dedicated endpoint:', idError);
            // No fallback - throw the error to be caught by the main catch block
            throw idError;
          }
        } else {
          // If we somehow have a non-numeric ID (which shouldn't happen), log warning
          console.warn('⚠️ Transaction ID is not numeric:', initialTransaction.id);
          return initialTransaction;
        }
      } catch (error) {
        console.error('❌ Error fetching transaction:', error);
        return initialTransaction; // Return initial data if fetch fails
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds for live updates
    enabled: !!initialTransaction.id,
  });
  
  // Use the live transaction data if available, otherwise use the initial transaction
  const transaction = liveTransaction || initialTransaction;
  
  // Debug log for transaction data
  useEffect(() => {
    console.log("📋 TransactionDetailsView using transaction:", {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      walletAddress: transaction.makerWalletAddress,
      counterpartyAddress: transaction.counterpartyAddress
    });
  }, [transaction]);

  // Function to get the correct transaction type text from the user's perspective
  // This ensures that Buy/Sell is displayed correctly for both maker and taker
  const getTransactionTypeFromUserPerspective = () => {
    // In P2P transactions:
    // - A maker is always the one who created the offer (they can be buying or selling)
    // - A taker is always the one who accepts the offer (they take the opposite side)
    // - transaction.type represents the action from the taker's perspective
    
    // CRITICAL: Identifying if current user is maker or taker is essential
    // - If user's wallet matches the maker wallet address, they are the maker
    // - Otherwise, they are the taker
    const isUserMaker = transaction.makerWalletAddress === walletAddress;
    const isUserTaker = !isUserMaker;
    
    if (isUserTaker) {
      // If user is taker, the transaction type directly represents their action
      return transaction.type === 'buy' ? 'Buy' : 'Sell';
    } else if (isUserMaker) {
      // If user is maker, they're doing the opposite of the taker
      // The taker's buy is maker's sell, and taker's sell is maker's buy
      return transaction.type === 'buy' ? 'Sell' : 'Buy';
    } else {
      console.warn('Unable to determine user role in transaction', {
        wallet: walletAddress,
        makerWallet: transaction.makerWalletAddress,
        counterparty: transaction.counterpartyAddress
      });
      return transaction.type === 'buy' ? 'Buy' : 'Sell'; // Fallback
    }
  };
  
  // Query to fetch messages for this transaction
  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['/api/messages', transaction.id],
    queryFn: async () => {
      try {
        console.log(`🔍 Fetching messages for transaction ID: ${transaction.id}`);
        
        // We already confirmed this endpoint works in our logs
        const response = await axios.get(`/api/transactions/${transaction.id}/messages`);
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`📨 Received ${response.data.length} messages for transaction`);
          
          // Sort messages by creation date
          const sortedMessages = [...response.data].sort((a, b) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
          
          return sortedMessages;
        } else {
          console.warn(`⚠️ Unexpected message data format:`, response.data);
          return [];
        }
      } catch (error) {
        console.error('❌ Error fetching messages:', error);
        return []; // Return empty array instead of throwing to prevent UI errors
      }
    },
    enabled: !!transaction.id,
    refetchInterval: 15000 // Refetch every 15 seconds to see new messages
  });

  // Mutation to send a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachment }: { content: string, attachment?: File }) => {
      // If there's an attachment, upload it first
      let attachmentUrl = "";
      let attachmentType = "";
      
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        formData.append('transactionId', String(transaction.id));
        
        // Upload the attachment
        const uploadResponse = await axios.post('/api/transaction-files', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        attachmentUrl = uploadResponse.data.url;
        attachmentType = attachment.type.startsWith('image/') ? 'image' : 'document';
      }
      
      // Send the message
      const response = await axios.post(`/api/transactions/${transaction.id}/messages`, {
        senderAddress: walletAddress,
        // If current user is maker, send to taker; if user is taker, send to maker
        receiverAddress: transaction.makerWalletAddress === walletAddress
          ? (transaction.takerWalletAddress || transaction.counterpartyAddress) // Prefer taker address but fall back to counterparty
          : transaction.makerWalletAddress, // If user is taker, always send to maker
        content,
        systemMessage: false,
        attachmentUrl,
        attachmentType
      });
      
      return response.data;
    },
    onSuccess: () => {
      // Clear input and attachment
      setMessageText("");
      setAttachment(null);
      
      // Refetch messages
      queryClient.invalidateQueries({ queryKey: ['/api/messages', transaction.id] });
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast({
        title: "Error sending message",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation to mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      console.log(`📖 Marking messages as read for transaction ${transaction.id}`);
      const response = await axios.post(`/api/transactions/${transaction.id}/read-messages`, {
        receiverAddress: walletAddress
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate unread message count - use the correct endpoint path that matches the server
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/transaction-counts', walletAddress] });
    }
  });
  
  // Mutation to mark payment as made (I Have Paid)
  const markPaymentMadeMutation = useMutation({
    mutationFn: async () => {
      const isCurrentUserMaker = transaction.makerWalletAddress === walletAddress;
      // The buyer always sends the payment
      // If user is maker and buying crypto OR user is taker and buying crypto
      // We need to determine which payment method to use
      const paymentMethod = isCurrentUserMaker ? transaction.makerPaymentMethod : transaction.takerPaymentMethod;
      
      console.log("📱 Marking payment as made, payment method:", paymentMethod);
      
      // Use the correct endpoint that matches server route registration
      console.log(`📤 Sending payment evidence to correct endpoint: /api/transactions/${transaction.id}/evidence`);
      const response = await axios.post(`/api/transactions/${transaction.id}/evidence`, {
        // Evidence is now optional on the server, but we'll still provide basic info
        evidence: {
          type: "payment_made",
          timestamp: new Date().toISOString(),
          walletAddress: walletAddress,
          details: {
            status: "completed",
            method: paymentMethod
          }
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("✅ Payment evidence recorded successfully:", data);
      toast({
        title: "Payment Sent",
        description: "Your payment has been recorded. Waiting for confirmation from the recipient.",
      });
      
      // Invalidate transaction details using both dedicated and wallet endpoints
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', transaction.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/by-id', transaction.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', walletAddress] });
      
      // Send system message about payment being made
      const isTaker = transaction.makerWalletAddress !== walletAddress;
      sendSystemMessage(`${isTaker ? 'Taker' : 'Maker'} has marked payment as sent`);
    },
    onError: (error) => {
      console.error('Error marking payment as made:', error);
      toast({
        title: "Error Recording Payment",
        description: "There was an error recording your payment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation to release crypto (approve transaction)
  const releaseCryptoMutation = useMutation({
    mutationFn: async () => {
      console.log(`📤 Sending approval to correct endpoint: /api/transactions/${transaction.id}/approval`);
      const response = await axios.patch(`/api/transactions/${transaction.id}/approval`, {
        approvalType: transaction.makerWalletAddress === walletAddress ? 'maker' : 'taker',
        approved: true
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Payment Confirmed",
        description: "You have confirmed receipt of payment. Crypto will be released when threshold is met.",
      });
      
      // Invalidate transaction details using both dedicated and wallet endpoints
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', transaction.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/by-id', transaction.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', walletAddress] });
      
      // Send system message about payment confirmation
      const isTaker = transaction.makerWalletAddress !== walletAddress;
      sendSystemMessage(`${isTaker ? 'Taker' : 'Maker'} has confirmed payment receipt`);
    },
    onError: (error) => {
      console.error('Error confirming payment receipt:', error);
      toast({
        title: "Error Confirming Payment",
        description: "There was an error confirming the payment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Function to send a system message
  const sendSystemMessage = async (content: string) => {
    try {
      console.log(`🔔 Sending system message for transaction ${transaction.id}:`, content);
      
      // Updated endpoint path to match server routes
      await axios.post(`/api/transactions/${transaction.id}/system-messages`, {
        transactionId: transaction.id,
        content,
        // Determine the correct receiver address based on current user's role
        receiverAddress: transaction.makerWalletAddress === walletAddress
          ? (transaction.takerWalletAddress || transaction.counterpartyAddress) // Prefer taker address but fall back to counterparty
          : transaction.makerWalletAddress, // If user is taker, always send to maker
      });
      
      console.log(`✅ System message sent successfully`);
      
      // Refetch messages
      queryClient.invalidateQueries({ queryKey: ['/api/messages', transaction.id] });
    } catch (error) {
      console.error('❌ Error sending system message:', error);
    }
  };

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when the component mounts
  useEffect(() => {
    if (transaction.id) {
      markAsReadMutation.mutate();
    }
  }, [transaction.id]);

  // Handle sending a message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() && !attachment) return;
    
    sendMessageMutation.mutate({ 
      content: messageText.trim(), 
      attachment: attachment || undefined 
    });
  };

  // Handle file selection for attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachment(e.target.files[0]);
    }
  };

  // Format timestamps
  const formatTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      console.error('Error formatting date:', error, dateStr);
      return 'Invalid date';
    }
  };

  // Determine if current user is maker or taker based on the makerWalletAddress field
  // The maker is the creator of the offer, identified by makerWalletAddress
  const isMaker = transaction.makerWalletAddress === walletAddress;
  
  // Get message display name
  const getMessageDisplayName = (address: string, isSystem: boolean) => {
    if (isSystem) return "System";
    if (address === walletAddress) return "You";
    
    // Determine if the message is from maker or taker
    const isFromMaker = address === transaction.makerWalletAddress;
    
    // Determine the descriptive role based on transaction type
    const isSenderBuyer = isFromMaker ? 
      transaction.type === 'sell' : // If maker is sender and transaction type is sell, maker is buyer
      transaction.type === 'buy';   // If taker is sender and transaction type is buy, taker is buyer
      
    // Return short address with role
    return `${isSenderBuyer ? 'Buyer' : 'Seller'} (${address.substring(0, 6)}...)`;
  };
  
  // Determine if the current user should show the "I have paid" button
  const shouldShowIHavePaidButton = () => {
    // The person who is buying crypto always sends fiat first
    // regardless of whether they're a maker or taker
    
    console.log("💰 Checking if should show 'I Have Paid' button:");
    console.log("Transaction status:", transaction.status);
    console.log("Payment evidence:", transaction.paymentEvidence);
    console.log("User is buying:", getTransactionTypeFromUserPerspective() === 'Buy');
    
    // Get whether the current user is buying crypto
    const userIsBuying = getTransactionTypeFromUserPerspective() === 'Buy';
    
    // If transaction is not in 'matched' status, don't show the button
    if (transaction.status !== 'matched') {
      console.log("❌ Not showing button: Transaction not in 'matched' status");
      return false;
    }
    
    // If the user is not buying crypto, they don't need to pay
    if (!userIsBuying) {
      console.log("❌ Not showing button: User is not buying crypto");
      return false;
    }
    
    // If payment evidence already exists, don't show the button
    if (transaction.paymentEvidence && 
        (Array.isArray(transaction.paymentEvidence) && transaction.paymentEvidence.length > 0)) {
      console.log("❌ Not showing button: Payment evidence already exists");
      return false;
    }
    
    console.log("✅ Showing 'I Have Paid' button");
    return true; // User is buying crypto, transaction is matched, and no payment evidence yet
  };
  
  // Determine if the current user should show the "I have received" button
  const shouldShowIHaveReceivedButton = () => {
    // The person who is selling crypto always receives fiat and confirms receipt
    // regardless of whether they're a maker or taker
    
    console.log("💰 Checking if should show 'I Have Received' button:");
    console.log("Transaction status:", transaction.status);
    console.log("Payment evidence:", transaction.paymentEvidence);
    console.log("User is selling:", getTransactionTypeFromUserPerspective() === 'Sell');
    
    // Never show the button if the transaction is completed
    if (transaction.status === 'completed') {
      console.log("❌ Not showing button: Transaction is completed");
      return false;
    }
    
    // Get whether the current user is selling crypto
    const userIsSelling = getTransactionTypeFromUserPerspective() === 'Sell';
    
    // If the user is not selling crypto, they don't need to confirm receipt
    if (!userIsSelling) {
      console.log("❌ Not showing button: User is not selling crypto");
      return false;
    }
    
    // If payment evidence doesn't exist, don't show the button
    if (!transaction.paymentEvidence || 
        (Array.isArray(transaction.paymentEvidence) && transaction.paymentEvidence.length === 0)) {
      console.log("❌ Not showing button: No payment evidence exists");
      return false;
    }
    
    // Only show the button when in verification status
    if (transaction.status !== 'verification') {
      console.log(`❌ Not showing button: Transaction not in 'verification' status, current status: ${transaction.status}`);
      return false;
    }
    
    // If the current user has already approved the transaction, don't show the button
    const isUserMaker = transaction.makerWalletAddress === walletAddress;
    if ((isUserMaker && transaction.makerApproval) || 
        (!isUserMaker && transaction.takerApproval)) {
      console.log("❌ Not showing button: User has already approved");
      return false;
    }
    
    // Additional check for 2/3 threshold being met (auto-release)
    const approvalCount = [
      !!transaction.makerApproval, 
      !!transaction.takerApproval, 
      !!transaction.platformApproval
    ].filter(Boolean).length;
    
    if (approvalCount >= 2) {
      console.log("❌ Not showing button: Approval threshold already met (2/3)");
      return false;
    }
    
    console.log("✅ Showing 'I Have Received' button");
    return true; // User is selling crypto, payment is marked as sent, and user hasn't approved yet
  };
  
  // Determine if the cancel button should be shown
  const shouldShowCancelButton = () => {
    console.log("🔍 Checking if should show cancel button:");
    console.log("Transaction status:", transaction.status);
    console.log("Payment evidence:", transaction.paymentEvidence);
    
    // Only show cancel button for matched transactions
    if (transaction.status !== 'matched') {
      console.log("❌ Not showing cancel button: Transaction not in 'matched' status");
      return false;
    }
    
    // If payment evidence exists, the buyer has already paid, so don't allow cancellation
    if (transaction.paymentEvidence && 
        (Array.isArray(transaction.paymentEvidence) && transaction.paymentEvidence.length > 0)) {
      console.log("❌ Not showing cancel button: Payment evidence already exists");
      return false;
    }
    
    console.log("✅ Showing cancel button");
    return true;
  };
  
  // Handle opening the cancel dialog
  const openCancelDialog = () => {
    setCancelDialogOpen(true);
  };
  
  // Mutation to cancel the transaction
  const cancelTransactionMutation = useMutation({
    mutationFn: async () => {
      console.log(`🔄 Cancelling transaction ${transaction.id}`);
      const response = await axios.delete(`/api/transactions/${transaction.id}`);
      return response.data;
    },
    onSuccess: () => {
      setIsCancelling(false);
      toast({
        title: "Transaction Cancelled",
        description: "The transaction has been successfully cancelled.",
      });
      
      // Invalidate transaction details to reflect the updated status
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', transaction.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/by-id', transaction.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', walletAddress] });
      
      // Send system message about cancellation
      const isTaker = transaction.makerWalletAddress !== walletAddress;
      sendSystemMessage(`Transaction cancelled by ${isTaker ? 'Taker' : 'Maker'}`);
      
      // Return to the transaction list
      onBack();
    },
    onError: (error: any) => {
      setIsCancelling(false);
      console.error('Error cancelling transaction:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to cancel transaction. Please try again.';
      
      toast({
        title: "Error Cancelling Transaction",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  
  // Handle transaction cancellation
  const handleCancelTransaction = () => {
    setIsCancelling(true);
    setCancelDialogOpen(false);
    cancelTransactionMutation.mutate();
  };

  // Get transaction status stages
  const getTransactionStages = () => {
    // Determine if the user is buying or selling
    const userIsBuying = getTransactionTypeFromUserPerspective() === 'Buy';
    
    // Define the stages based on the transaction type and status
    const stages = [
      { id: 'pending', label: userIsBuying ? 'Your Payment Pending' : 'Waiting for Buyer Payment', completed: false },
      { id: 'release', label: 'Coin Release in Progress', completed: false },
      { id: 'completed', label: 'Transaction Completed', completed: false }
    ];
    
    // Update stages based on status
    if (transaction.status === "completed") {
      stages[0].completed = true;
      stages[1].completed = true;
      stages[2].completed = true;
    } else if (transaction.status === "verification" || transaction.paymentEvidence) {
      stages[0].completed = true;
      
      // Calculate how many approvals we have for the escrow release
      const approvalCount = [
        transaction.makerApproval, 
        transaction.takerApproval, 
        transaction.platformApproval
      ].filter(Boolean).length;
      
      // If at least 2 of 3 approvals, mark release as completed
      if (approvalCount >= 2) {
        stages[1].completed = true;
      } else {
        stages[1].completed = false;
      }
    } else if (transaction.status === "matched") {
      // In matched status, only show the first stage as completed
      // But we still want to show escrow status to properly inform users
      stages[0].completed = false; // Waiting for payment
    }
    
    return stages;
  };
  
  // Calculate the escrow release approvals status
  const getEscrowReleaseStatus = () => {
    // If the transaction is already completed, skip checks
    if (transaction.status === "completed") {
      return { 
        approvalCount: 3, 
        totalNeeded: 2, // Only 2/3 needed for threshold
        progressPercent: 100,
        isReleased: true,
        isMakerApproved: true,
        isTakerApproved: true,
        isPlatformApproved: true,
        // Add buyer/seller approval status
        isBuyerApproved: true,
        isSellerApproved: true,
        buyerRole: "maker", // Placeholder, not used in completed state
        sellerRole: "taker" // Placeholder, not used in completed state
      };
    }
    
    const isMakerApproved = !!transaction.makerApproval;
    const isTakerApproved = !!transaction.takerApproval;
    const isPlatformApproved = !!transaction.platformApproval;
    
    // Determine buyer/seller roles based on transaction type and offer relationship
    // In a P2P transaction, "buy" type means the taker is buying from the maker
    // And "sell" type means the taker is selling to the maker
    const isTakerBuyer = transaction.type === 'buy'; 
    const isMakerBuyer = transaction.type === 'sell';
    
    const buyerRole = isMakerBuyer ? "maker" : "taker";
    const sellerRole = isMakerBuyer ? "taker" : "maker";
    
    // Map maker/taker approvals to buyer/seller approvals
    let isBuyerApproved = buyerRole === "maker" ? isMakerApproved : isTakerApproved;
    let isSellerApproved = sellerRole === "maker" ? isMakerApproved : isTakerApproved;
    
    // ALSO consider payment evidence - if payment evidence exists and includes the buyer's wallet,
    // consider the buyer as having approved even if the DB field hasn't been updated yet
    if (!isBuyerApproved && transaction.paymentEvidence && Array.isArray(transaction.paymentEvidence) && transaction.paymentEvidence.length > 0) {
      // Check if any payment evidence matches the buyer's wallet address
      const buyerAddress = buyerRole === "maker" ? transaction.makerWalletAddress : transaction.takerWalletAddress || transaction.counterpartyAddress;
      for (const evidence of transaction.paymentEvidence) {
        if (evidence.walletAddress === buyerAddress) {
          console.log("📝 Found payment evidence from buyer, considering as approved");
          isBuyerApproved = true;
          break;
        }
      }
    }
    
    const approvalCount = [isMakerApproved, isTakerApproved, isPlatformApproved].filter(Boolean).length;
    const isReleased = approvalCount >= 2; // 2/3 approval requirement
    
    // For the progress bar, we show progress toward 2 approvals (required threshold)
    // so 1 approval is 50%, 2+ approvals is 100%
    const progressPercent = Math.min(Math.floor((approvalCount / 2) * 100), 100);
    
    return {
      approvalCount,
      totalNeeded: 2, // Changed from 3 to 2 for clearer UI
      progressPercent,
      isReleased,
      isMakerApproved,
      isTakerApproved, 
      isPlatformApproved,
      // Add buyer/seller specific properties
      isBuyerApproved,
      isSellerApproved,
      buyerRole,
      sellerRole
    };
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with back button and transaction info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold capitalize">
              {getTransactionTypeFromUserPerspective()} {transaction.token}
            </h2>
            <span className="text-sm text-muted-foreground">
              {formatTime(transaction.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">Order #{transaction.id}</span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(String(transaction.id) || '');
                toast({
                  title: "Copied to clipboard",
                  description: `Order number ${transaction.id} has been copied`,
                });
              }}
              className="h-8 w-8"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: Transaction info */}
          <div className="md:col-span-1 space-y-6">
            <div className="rounded-lg border p-4 space-y-6">
              {/* Transaction status */}
              <div className="rounded-md bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">Transaction {transaction.status}</h3>
                  {transaction.status === "completed" ? (
                    <CheckCircle2 className="text-green-500 h-5 w-5" />
                  ) : transaction.status === "failed" || transaction.status === "cancelled" ? (
                    <XCircle className="text-red-500 h-5 w-5" />
                  ) : (
                    <Clock className="text-yellow-500 h-5 w-5" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {transaction.status === "completed" 
                    ? "This order has concluded, and the assets are no longer locked." 
                    : getTransactionTypeFromUserPerspective() === 'Buy'
                      ? (transaction.paymentEvidence 
                        ? "Payment has been sent. Waiting for seller to confirm receipt." 
                        : "Please complete the payment to receive your assets.")
                      : (transaction.paymentEvidence 
                        ? "Payment has been received. Please confirm when you've verified the funds." 
                        : "Waiting for buyer to complete payment.")
                  }
                </p>
                <p className="text-sm font-medium mt-2">
                  {/* Use our helper function for consistent transaction type display */}
                  {getTransactionTypeFromUserPerspective() === 'Buy'
                    ? `Bought ${transaction.tokenAmount} ${transaction.token}`
                    : `Sold ${transaction.tokenAmount} ${transaction.token}`
                  }
                </p>
                
                {/* Action buttons */}
                {transaction.status !== "completed" && transaction.status !== "failed" && transaction.status !== "cancelled" && (
                  <div className="mt-4">
                    {/* "I have paid" button for the party sending fiat */}
                    {shouldShowIHavePaidButton() && (
                      <Button 
                        className="w-full" 
                        onClick={() => markPaymentMadeMutation.mutate()}
                        disabled={markPaymentMadeMutation.isPending}
                      >
                        {markPaymentMadeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'I Have Paid'
                        )}
                      </Button>
                    )}
                    
                    {/* "I have received" button for the party receiving fiat */}
                    {shouldShowIHaveReceivedButton() && (
                      <Button 
                        className="w-full" 
                        onClick={() => releaseCryptoMutation.mutate()}
                        disabled={releaseCryptoMutation.isPending}
                      >
                        {releaseCryptoMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          'Confirm Payment Received'
                        )}
                      </Button>
                    )}
                    
                    {/* Cancel button for transactions before payment */}
                    {shouldShowCancelButton() && (
                      <Button 
                        className="w-full mt-2" 
                        variant="destructive"
                        onClick={openCancelDialog}
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <Ban className="mr-2 h-4 w-4" />
                            Cancel Transaction
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Already approved message for buyer */}
                    {((getEscrowReleaseStatus().buyerRole === "maker" && transaction.makerWalletAddress === walletAddress && getEscrowReleaseStatus().isMakerApproved) || 
                      (getEscrowReleaseStatus().buyerRole === "taker" && transaction.makerWalletAddress !== walletAddress && getEscrowReleaseStatus().isTakerApproved)) && 
                      !getEscrowReleaseStatus().isReleased && (
                      <div className="bg-green-100 text-green-800 p-2 rounded-md text-sm text-center">
                        <CheckCircle2 className="h-4 w-4 inline-block mr-1" />
                        Payment confirmed. Waiting for seller to confirm receipt.
                      </div>
                    )}
                    
                    {/* Already approved message for seller */}
                    {((getEscrowReleaseStatus().sellerRole === "maker" && transaction.makerWalletAddress === walletAddress && getEscrowReleaseStatus().isMakerApproved) || 
                      (getEscrowReleaseStatus().sellerRole === "taker" && transaction.makerWalletAddress !== walletAddress && getEscrowReleaseStatus().isTakerApproved)) && 
                      !getEscrowReleaseStatus().isReleased && (
                      <div className="bg-green-100 text-green-800 p-2 rounded-md text-sm text-center">
                        <CheckCircle2 className="h-4 w-4 inline-block mr-1" />
                        Receipt confirmed. Waiting for buyer to confirm payment.
                      </div>
                    )}
                    
                    {/* When approval threshold is met but transaction not yet completed */}
                    {getEscrowReleaseStatus().isReleased && transaction.status !== "completed" && (
                      <div className="bg-green-100 text-green-800 p-2 rounded-md text-sm text-center">
                        <CheckCircle2 className="h-4 w-4 inline-block mr-1" />
                        Both buyer and seller have confirmed. Transaction will complete automatically.
                      </div>
                    )}
                    
                    {/* Dispute button always shown unless in dispute status */}
                    {transaction.status !== "dispute" && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => {
                          // Open dispute form
                          toast({
                            title: "Dispute function",
                            description: "Dispute functionality will be implemented in the next phase",
                          });
                        }}
                      >
                        Raise Dispute
                      </Button>
                    )}
                </div>
              )}
            </div>
            
            {/* Transaction progress indicators */}
            <div className="space-y-4">
              <h3 className="font-medium">Order Progress</h3>
              <div className="space-y-2">
                {getTransactionStages().map((stage, index) => (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary ${stage.completed ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                      {stage.completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="text-sm">{stage.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2/3 Transaction Approval Status */}
            {transaction.status !== "completed" && (transaction.status === "matched" || transaction.status === "verification" || transaction.paymentEvidence) && (
              <div className="space-y-3">
                <h3 className="font-medium">Transaction Approval Status <span className="text-xs text-muted-foreground">(2 of 3 required)</span></h3>
                
                {/* Release progress */}
                <div className="space-y-2">
                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        getEscrowReleaseStatus().isReleased 
                          ? "bg-green-500" 
                          : getEscrowReleaseStatus().approvalCount > 0 
                            ? "bg-primary" 
                            : "bg-gray-300"
                      }`}
                      style={{ width: `${getEscrowReleaseStatus().progressPercent}%` }}
                    ></div>
                  </div>
                  
                  {/* Approval count */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <div className="font-medium">
                      {getEscrowReleaseStatus().approvalCount}/{getEscrowReleaseStatus().totalNeeded} Approvals
                    </div>
                    <div className={getEscrowReleaseStatus().isReleased ? "text-green-600 font-medium" : ""}>
                      {getEscrowReleaseStatus().isReleased 
                        ? "Transaction will complete soon ✓" 
                        : "Need buyer and seller approval..."}
                    </div>
                  </div>
                </div>
                
                {/* Approval statuses */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {/* Buyer approval status */}
                  <div className={`text-center p-3 text-xs rounded-lg border ${
                    getEscrowReleaseStatus().isBuyerApproved
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : (getEscrowReleaseStatus().buyerRole === "maker" && transaction.makerWalletAddress === walletAddress) ||
                        (getEscrowReleaseStatus().buyerRole === "taker" && transaction.makerWalletAddress !== walletAddress)
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <div className="font-medium mb-1">Buyer</div>
                    <div className="mt-1">
                      {getEscrowReleaseStatus().isBuyerApproved ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                          <span className="text-green-700">Payment Confirmed</span>
                        </div>
                      ) : (getEscrowReleaseStatus().buyerRole === "maker" && transaction.makerWalletAddress === walletAddress) ||
                           (getEscrowReleaseStatus().buyerRole === "taker" && transaction.makerWalletAddress !== walletAddress) ? (
                        <div className="flex flex-col items-center">
                          <AlertCircle className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                          <span className="text-yellow-700">Send Payment</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Clock className="h-5 w-5 mx-auto text-gray-500 mb-1" />
                          <span>Awaiting Payment</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Seller approval status */}
                  <div className={`text-center p-3 text-xs rounded-lg border ${
                    getEscrowReleaseStatus().isSellerApproved
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : (getEscrowReleaseStatus().sellerRole === "maker" && transaction.makerWalletAddress === walletAddress) ||
                        (getEscrowReleaseStatus().sellerRole === "taker" && transaction.makerWalletAddress !== walletAddress)
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <div className="font-medium mb-1">Seller</div>
                    <div className="mt-1">
                      {getEscrowReleaseStatus().isSellerApproved ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                          <span className="text-green-700">Receipt Confirmed</span>
                        </div>
                      ) : (getEscrowReleaseStatus().sellerRole === "maker" && transaction.makerWalletAddress === walletAddress) ||
                           (getEscrowReleaseStatus().sellerRole === "taker" && transaction.makerWalletAddress !== walletAddress) ? (
                        <div className="flex flex-col items-center">
                          <AlertCircle className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                          <span className="text-yellow-700">Confirm Receipt</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Clock className="h-5 w-5 mx-auto text-gray-500 mb-1" />
                          <span>Awaiting Confirmation</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Platform approval status */}
                  <div className={`text-center p-3 text-xs rounded-lg border ${
                    getEscrowReleaseStatus().isPlatformApproved
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-blue-50 border-blue-200 text-blue-600'
                  }`}>
                    <div className="font-medium mb-1">Platform</div>
                    <div className="mt-1">
                      {getEscrowReleaseStatus().isPlatformApproved ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                          <span className="text-green-700">Verified</span>
                        </div>
                      ) : getEscrowReleaseStatus().isReleased ? (
                        <div className="flex flex-col items-center">
                          <ShieldCheck className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                          <span className="text-blue-700">Not Required</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <ShieldCheck className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                          <span className="text-blue-700">Review Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order info section */}
            <div>
              <h3 className="font-medium mb-3">Order Info</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-muted-foreground">Receive</div>
                <div className="font-medium">{transaction.amount} {transaction.currency}</div>
                
                <div className="text-muted-foreground">Price</div>
                <div className="font-medium">{Number(transaction.amount / (transaction.tokenAmount || 1)).toFixed(2)} {transaction.currency}</div>
                
                <div className="text-muted-foreground">Total Quantity</div>
                <div className="font-medium">{transaction.tokenAmount} {transaction.token}</div>
                
                {/* Clearer trading partner information with specific role */}
                <div className="text-muted-foreground">
                  Trading Partner ({getTransactionTypeFromUserPerspective() === 'Buy' ? "Seller" : "Buyer"})
                </div>
                <div className="font-medium">
                  {/* Show the trading partner's address with appropriate tech role label */}
                  {transaction.makerWalletAddress === walletAddress ? 
                    (transaction.takerWalletAddress || transaction.counterpartyAddress ?
                      <span className="font-mono text-xs">
                        {(transaction.takerWalletAddress || transaction.counterpartyAddress).substring(0, 8)}...
                        {(transaction.takerWalletAddress || transaction.counterpartyAddress).substring((transaction.takerWalletAddress || transaction.counterpartyAddress).length - 8)}
                      </span> : 
                      <span className="text-muted-foreground italic">Waiting for trading partner...</span>
                    ) 
                    : 
                    (transaction.makerWalletAddress ? 
                      <span className="font-mono text-xs">{transaction.makerWalletAddress.substring(0, 8)}...{transaction.makerWalletAddress.substring(transaction.makerWalletAddress.length - 8)}</span> :
                      <span className="text-muted-foreground italic">Unknown address</span>
                    )
                  }
                </div>
                
                {/* Clearer role information showing both technical and functional roles */}
                <div className="text-muted-foreground">Your Role</div>
                <div className="font-medium">
                  <span className="capitalize">{getTransactionTypeFromUserPerspective() === 'Buy' ? 'Buyer' : 'Seller'}</span>
                  <span className="text-xs text-muted-foreground ml-2">({transaction.makerWalletAddress === walletAddress ? "Maker" : "Taker"})</span>
                </div>
              </div>
            </div>

            {/* Payment method info */}
            <div>
              <h3 className="font-medium mb-3">Payment Method</h3>
              <div className="bg-muted/20 p-3 rounded-md">
                {transaction.makerPaymentMethod ? (
                  <div>
                    <div className="font-medium mb-3 flex items-center">
                      <span className="capitalize">{transaction.makerPaymentMethod.replace('_', ' ')}</span>
                      {/* Show Payment Required badge only for buyer */}
                      {transaction.status === "matched" && getTransactionTypeFromUserPerspective() === 'Buy' && (
                        <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-300">
                          Payment Required
                        </Badge>
                      )}
                    </div>
                    
                    {transaction.makerFinancialAccount && (
                      <div className="space-y-3 text-sm">
                        {/* Institution / Bank details */}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Provider</span>
                          <span className="font-medium">{
                            transaction.makerFinancialAccount.institution?.name || 
                            transaction.makerFinancialAccount.institution?.id || 
                            "Unknown"
                          }</span>
                        </div>
                        
                        {/* Manual payment method details (from metadata) */}
                        {transaction.makerFinancialAccount.metadata?.manualPaymentMethods && (
                          <>
                            {(() => {
                              // Find the relevant payment method
                              const paymentMethod = transaction.makerFinancialAccount.metadata.manualPaymentMethods.find(
                                (pm: any) => pm.type === transaction.makerPaymentMethod
                              );
                              
                              if (paymentMethod) {
                                return (
                                  <>
                                    {/* Account Holder */}
                                    {paymentMethod.details.accountHolder && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Account Holder</span>
                                        <span className="font-medium">{paymentMethod.details.accountHolder}</span>
                                      </div>
                                    )}
                                    
                                    {/* Bank Name */}
                                    {paymentMethod.details.bankName && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Bank Name</span>
                                        <span className="font-medium">{paymentMethod.details.bankName}</span>
                                      </div>
                                    )}
                                    
                                    {/* Account Number */}
                                    {paymentMethod.details.accountNumber && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Account Number</span>
                                        <span className="font-medium">{paymentMethod.details.accountNumber}</span>
                                      </div>
                                    )}
                                    
                                    {/* Email (for Zelle, PayPal, etc.) */}
                                    {paymentMethod.details.email && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Email</span>
                                        <span className="font-medium">{paymentMethod.details.email}</span>
                                      </div>
                                    )}
                                    
                                    {/* Phone Number (for Zelle, mobile money, etc.) */}
                                    {paymentMethod.details.phoneNumber && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Phone Number</span>
                                        <span className="font-medium">{paymentMethod.details.phoneNumber}</span>
                                      </div>
                                    )}
                                    
                                    {/* Username (for Venmo, CashApp, etc.) */}
                                    {paymentMethod.details.username && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Username</span>
                                        <span className="font-medium">{paymentMethod.details.username}</span>
                                      </div>
                                    )}
                                    
                                    {/* Special instructions */}
                                    {paymentMethod.instructions && (
                                      <div className="mt-3 pt-3 border-t border-border">
                                        <span className="text-muted-foreground block mb-1">Payment Instructions</span>
                                        <span className="text-sm">{paymentMethod.instructions}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </>
                        )}
                        
                        {/* Traditional account details (from regionalDetails) */}
                        {transaction.makerFinancialAccount.regionalDetails && (
                          <>
                            {transaction.makerFinancialAccount.regionalDetails.accountNumber && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Account Number</span>
                                <span className="font-medium">
                                  {transaction.makerFinancialAccount.regionalDetails.accountNumber}
                                </span>
                              </div>
                            )}
                            {transaction.makerFinancialAccount.regionalDetails.routingNumber && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Routing Number</span>
                                <span className="font-medium">
                                  {transaction.makerFinancialAccount.regionalDetails.routingNumber}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Zelle details from paymentCapabilities */}
                        {transaction.makerFinancialAccount.paymentCapabilities?.zelle?.enabled && (
                          <>
                            {transaction.makerFinancialAccount.paymentCapabilities.zelle.email && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Zelle Email</span>
                                <span className="font-medium">
                                  {transaction.makerFinancialAccount.paymentCapabilities.zelle.email}
                                </span>
                              </div>
                            )}
                            {transaction.makerFinancialAccount.paymentCapabilities.zelle.phone && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Zelle Phone</span>
                                <span className="font-medium">
                                  {transaction.makerFinancialAccount.paymentCapabilities.zelle.phone}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Note: The payment button has been moved to the main action buttons section 
                        to prevent duplicate "I Have Paid" buttons appearing */}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No payment method provided</div>
                )}
              </div>
            </div>

            {/* Payment evidence section (if any) */}
            {transaction.paymentEvidence && Array.isArray(transaction.paymentEvidence) && 
                transaction.paymentEvidence.length > 0 && (
              <div className="mt-5">
                <h3 className="font-medium mb-3">Payment Evidence</h3>
                {transaction.paymentEvidence.map((evidence: any, index: number) => (
                  <div key={index} className="bg-green-50 border border-green-200 p-4 rounded-md mb-3">
                    <div className="flex items-center">
                      <CheckCircle2 className="text-green-600 mr-2 h-6 w-6 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-green-800">
                          Payment marked as {evidence.details?.status || 'sent'}
                        </span>
                        <p className="text-sm text-green-700 mt-0.5">
                          The {getTransactionTypeFromUserPerspective() === 'Buy' ? 'seller' : 'buyer'} has been notified.
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-green-700 font-medium">Method</span>
                        <p className="mt-1 capitalize text-green-900">
                          {evidence.details?.method?.replace(/_/g, ' ') || 'Not specified'}
                        </p>
                      </div>
                      
                      {evidence.timestamp && (
                        <div>
                          <span className="text-green-700 font-medium">Time</span>
                          <p className="mt-1 text-green-900">{formatTime(evidence.timestamp)}</p>
                        </div>
                      )}
                      
                      {evidence.walletAddress && (
                        <div className="col-span-2 mt-1">
                          <span className="text-green-700 font-medium">Confirmed by</span>
                          <p className="mt-1 text-green-900 flex items-center">
                            {evidence.walletAddress === walletAddress 
                              ? 'You' 
                              : evidence.walletAddress
                                ? `${evidence.walletAddress.substring(0, 8)}...${evidence.walletAddress.substring(evidence.walletAddress.length - 6)}`
                                : 'Unknown'
                            }
                            
                            {evidence.walletAddress === walletAddress ? (
                              <div className="flex gap-1 ml-2">
                                <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                  {transaction.makerWalletAddress === walletAddress ? 'Maker' : 'Taker'}
                                </Badge>
                                <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                  {getTransactionTypeFromUserPerspective() === 'Buy' ? 'Buyer' : 'Seller'}
                                </Badge>
                              </div>
                            ) : (
                              <div className="flex gap-1 ml-2">
                                <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                  {transaction.makerWalletAddress !== walletAddress ? 'Maker' : 'Taker'}
                                </Badge>
                                <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                  {getTransactionTypeFromUserPerspective() === 'Buy' ? 'Seller' : 'Buyer'}
                                </Badge>
                              </div>
                            )}
                          </p>
                        </div>
                      )}
                      
                      {/* Action message based on transaction state */}
                      <div className="col-span-2 mt-2 pt-2 border-t border-green-200">
                        {getTransactionTypeFromUserPerspective() === 'Sell' ? (
                          <div className="text-green-800 flex items-center">
                            <InfoIcon className="w-4 h-4 mr-1.5 text-green-700" />
                            {transaction.status === 'verification' ? (
                              <span>Please confirm when you've received this payment in your account.</span>
                            ) : (
                              <span>Wait for buyer to complete payment, then confirm when received.</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-green-800 flex items-center">
                            <InfoIcon className="w-4 h-4 mr-1.5 text-green-700" />
                            <span>Wait for seller to confirm receipt of payment to release the escrow.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons for completed transactions */}
            {transaction.status === "completed" && (
              <div>
                <Button variant="outline" className="w-full">View My Assets</Button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Chat interface */}
        <div className="md:col-span-2">
          <div className="rounded-lg border flex flex-col" style={{ maxHeight: "650px" }}>
            {/* Chat header */}
            <div className="border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-medium">
                  Chat with {getTransactionTypeFromUserPerspective() === 'Buy' ? 'Seller' : 'Buyer'}
                </h3>
              </div>
              <div>
                {transaction.makerWalletAddress === walletAddress ? 
                  ((transaction.takerWalletAddress || transaction.counterpartyAddress) ? (
                    <Badge variant="outline">
                      {(transaction.takerWalletAddress || transaction.counterpartyAddress).substring(0, 8)}...
                      {(transaction.takerWalletAddress || transaction.counterpartyAddress).substring((transaction.takerWalletAddress || transaction.counterpartyAddress).length - 4)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Waiting for taker</Badge>
                  ))
                : 
                  (transaction.makerWalletAddress ? (
                    <Badge variant="outline">
                      {transaction.makerWalletAddress.substring(0, 8)}...{transaction.makerWalletAddress.substring(transaction.makerWalletAddress.length - 4)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Unknown maker</Badge>
                  ))
                }
              </div>
            </div>

            {/* Chat messages container */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ height: "400px" }}
            >
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center text-muted-foreground p-4">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages?.map((message: Message) => {
                  const isSender = message.senderAddress === walletAddress;
                  const isSystemMessage = message.systemMessage;
                  
                  if (isSystemMessage) {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="bg-muted/30 rounded-md py-1 px-3 text-sm text-center max-w-[80%]">
                          <span className="text-muted-foreground">{message.content}</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTime(message.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`${
                          isSender 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        } rounded-lg py-2 px-3 max-w-[80%]`}
                      >
                        {!isSender && (
                          <div className="font-semibold text-xs mb-1">
                            {getMessageDisplayName(message.senderAddress, isSystemMessage)}
                          </div>
                        )}
                        
                        <div>{message.content}</div>
                        
                        {message.attachmentUrl && message.attachmentType === "image" && (
                          <img 
                            src={message.attachmentUrl} 
                            alt="Attachment" 
                            className="mt-2 max-w-full h-auto rounded"
                            style={{ maxHeight: "200px" }} 
                          />
                        )}
                        
                        {message.attachmentUrl && message.attachmentType !== "image" && (
                          <div className="mt-2 p-2 bg-background rounded flex items-center gap-2">
                            <PaperclipIcon className="h-4 w-4" />
                            <a 
                              href={message.attachmentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline"
                            >
                              View attachment
                            </a>
                          </div>
                        )}
                        
                        <div className="text-xs mt-1 opacity-70 flex justify-end items-center gap-1">
                          {formatTime(message.createdAt)}
                          {isSender && (
                            message.status === "READ" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message input area */}
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="pr-10"
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full"
                    onClick={() => {
                      document.getElementById('file-upload')?.click();
                    }}
                  >
                    <PaperclipIcon className="h-4 w-4" />
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={(!messageText.trim() && !attachment) || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              
              {/* Display selected attachment */}
              {attachment && (
                <div className="mt-2 p-2 bg-muted/30 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <PaperclipIcon className="h-4 w-4" />
                    <span>{attachment.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setAttachment(null)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Chat footer with info */}
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                <InfoIcon className="h-3 w-3" />
                <span>If issues arise, communicate with the {getTransactionTypeFromUserPerspective() === 'Buy' ? 'seller' : 'buyer'} or raise a dispute.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      
      {/* Cancel transaction confirmation dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              {getTransactionTypeFromUserPerspective() === 'Buy' ? 
                "Are you sure you want to cancel this purchase? This action cannot be undone, and you'll need to create a new transaction if you change your mind." :
                "Are you sure you want to cancel this sale? This action cannot be undone, and the buyer will need to create a new transaction if they still want to proceed."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelTransaction}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Transaction'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}