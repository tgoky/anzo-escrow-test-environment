import { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { MessageList } from '@/components/messaging/MessageList';
import { MessageComposer } from '@/components/messaging/MessageComposer';
import { 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Check, 
  CheckCircle, 
  Clock, 
  CreditCard, 
  DollarSign, 
  FileCheck, 
  Info, 
  Loader2, 
  MessageSquare,
  RotateCcw,
  Shield, 
  Timer, 
  X, 
  XCircle 
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

// Format payment method string (e.g., "zelle_USD" to "Zelle")
function formatPaymentMethod(method: string): string {
  if (!method) return 'Not specified';
  
  const parts = method.split('_');
  const type = parts[0];
  
  // Convert snake_case to Title Case and remove currency suffix
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface TransactionFlowProps {
  transaction: any;
  walletAddress: string;
  onStatusUpdate: () => void;
}

export function TransactionFlow({ transaction, walletAddress, onStatusUpdate }: TransactionFlowProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [transactionReceived, setTransactionReceived] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [paymentEvidence, setPaymentEvidence] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isMaker = transaction.walletAddress === walletAddress;
  const isTaker = transaction.counterpartyAddress === walletAddress;
  const counterpartyAddress = isMaker ? transaction.counterpartyAddress : transaction.walletAddress;
  const counterpartyName = counterpartyAddress 
    ? `${counterpartyAddress.substring(0, 6)}...${counterpartyAddress.substring(counterpartyAddress.length - 4)}` 
    : 'Unknown';

  const isBuy = transaction.type === 'buy';
  const isSell = transaction.type === 'sell';
  
  // Determine if user is the seller or buyer based on transaction type and role
  const isUserSeller = (isBuy && isMaker) || (isSell && isTaker);
  const isUserBuyer = (isBuy && isTaker) || (isSell && isMaker);

  // Load messages when transaction ID changes
  useEffect(() => {
    if (transaction.id) {
      loadMessages();
    }
  }, [transaction.id]);

  // Mark messages as read when tab is switched to messages
  useEffect(() => {
    if (activeTab === 'messages' && unreadCount > 0) {
      markMessagesAsRead();
    }
  }, [activeTab]);

  // Load messages for the transaction
  const loadMessages = async () => {
    try {
      setIsLoadingMessages(true);
      const response = await axios.get(`/api/transactions/${transaction.id}/messages`);
      if (response.data && Array.isArray(response.data)) {
        setMessages(response.data);
        
        // Count unread messages
        const unread = response.data.filter(
          (msg: any) => !msg.read && msg.receiver === walletAddress
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await axios.post(`/api/transactions/${transaction.id}/read-messages`, {
        receiverAddress: walletAddress
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Send a new message
  const handleSendMessage = async (content: string) => {
    try {
      const response = await axios.post(`/api/transactions/${transaction.id}/messages`, {
        sender: walletAddress,
        receiver: counterpartyAddress,
        content,
        isSystem: false
      });
      
      if (response.data) {
        setMessages([...messages, response.data]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle approve transaction (confirm payment received for seller)
  const handleApproveTransaction = async () => {
    try {
      setIsUpdating(true);
      
      const approvalType = isUserSeller ? 'maker' : 'taker';
      
      const response = await axios.post(`/api/transactions/${transaction.id}/approve`, {
        approvalType,
        approved: true,
        walletAddress
      });
      
      if (response.data) {
        toast({
          title: 'Success',
          description: 'Transaction has been approved.',
        });
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Transaction approval error:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve transaction. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle reject transaction (e.g., payment not received)
  const handleRejectTransaction = async (reason: string) => {
    try {
      setIsUpdating(true);
      
      const approvalType = isUserSeller ? 'maker' : 'taker';
      
      const response = await axios.post(`/api/transactions/${transaction.id}/approve`, {
        approvalType,
        approved: false,
        reason,
        walletAddress
      });
      
      if (response.data) {
        toast({
          title: 'Transaction Rejected',
          description: 'The transaction has been rejected.',
        });
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Transaction rejection error:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject transaction. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle confirming payment sent (for buyer)
  const handleConfirmPayment = async () => {
    try {
      setIsUpdating(true);
      
      // Add payment evidence if provided
      if (paymentEvidence) {
        await axios.post(`/api/transactions/${transaction.id}/payment-evidence`, {
          evidence: { details: paymentEvidence },
          walletAddress
        });
      }
      
      const response = await axios.patch(`/api/transactions/${transaction.id}`, {
        status: 'verification',
        walletAddress
      });
      
      if (response.data) {
        toast({
          title: 'Payment Confirmed',
          description: 'You have confirmed the payment. Waiting for seller to verify.',
        });
        setPaymentConfirmed(true);
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle raising a dispute
  const handleRaiseDispute = async () => {
    if (!disputeReason) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for the dispute.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsUpdating(true);
      
      const response = await axios.post(`/api/transactions/${transaction.id}/dispute`, {
        reason: disputeReason,
        evidence: { details: paymentEvidence },
        walletAddress
      });
      
      if (response.data) {
        toast({
          title: 'Dispute Raised',
          description: 'Your dispute has been submitted and will be reviewed.',
        });
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Dispute submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit dispute. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
      setIsDisputing(false);
    }
  };
  
  // Handle opening the cancel dialog
  const openCancelDialog = () => {
    setCancelDialogOpen(true);
  };
  
  // Handle transaction cancellation
  const handleCancelTransaction = async () => {
    try {
      setIsCancelling(true);
      setCancelDialogOpen(false);
      
      const response = await axios.delete(`/api/transactions/${transaction.id}`);
      
      if (response.data) {
        toast({
          title: 'Transaction Cancelled',
          description: 'The transaction has been successfully cancelled.',
        });
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Transaction cancellation error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to cancel transaction. Please try again.';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Get transaction status badge
  const getStatusBadge = () => {
    switch (transaction.status) {
      case 'searching':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Searching</Badge>;
      case 'matched':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Matched</Badge>;
      case 'verification':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Verification</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'disputed':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Disputed</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100">Unknown</Badge>;
    }
  };

  // Get progress percentage based on transaction status
  const getProgressPercentage = () => {
    switch (transaction.status) {
      case 'searching': return 20;
      case 'matched': return 40;
      case 'verification': return 70;
      case 'completed': return 100;
      case 'cancelled': return 100;
      case 'disputed': return 85;
      default: return 0;
    }
  };

  // Get action buttons based on transaction status and user role
  const getActionButtons = () => {
    if (transaction.status === 'matched') {
      if (isUserBuyer) {
        return (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
              <p className="text-sm text-amber-800 mb-2 font-medium">Payment Instructions</p>
              <p className="text-sm text-amber-700">
                Please send {transaction.amount} {transaction.currency} to the seller's {formatPaymentMethod(transaction.makerPaymentMethod)} account.
                After sending payment, click "I've Sent Payment" below.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment-evidence">Payment Evidence (optional)</Label>
              <textarea
                id="payment-evidence"
                className="w-full p-2 border rounded-md"
                placeholder="Include transaction ID, confirmation number, or screenshot link"
                value={paymentEvidence}
                onChange={(e) => setPaymentEvidence(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="default"
                onClick={handleConfirmPayment}
                disabled={isUpdating || isCancelling}
                className="w-full"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    I've Sent Payment
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setActiveTab('messages')}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Seller
              </Button>
            </div>
            
            <Button 
              variant="outline" 
              onClick={openCancelDialog}
              disabled={isCancelling || isUpdating}
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Cancel Transaction
                </>
              )}
            </Button>
          </div>
        );
      } else if (isUserSeller) {
        return (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
              <p className="text-sm text-blue-800 mb-2 font-medium">Waiting for Payment</p>
              <p className="text-sm text-blue-700">
                The buyer will send {transaction.amount} {transaction.currency} to your {formatPaymentMethod(transaction.makerPaymentMethod)} account.
                You'll be notified when they confirm payment.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline"
                onClick={() => setActiveTab('messages')}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Buyer
              </Button>
              
              <Button 
                variant="outline" 
                onClick={openCancelDialog}
                disabled={isCancelling || isUpdating}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Cancel Transaction
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      }
    } else if (transaction.status === 'verification') {
      if (isUserSeller) {
        return (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
              <p className="text-sm text-blue-800 mb-2 font-medium">Verify Payment</p>
              <p className="text-sm text-blue-700">
                The buyer has confirmed sending {transaction.amount} {transaction.currency} to your {formatPaymentMethod(transaction.makerPaymentMethod)} account.
                Please check your account and confirm receipt of funds.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="default"
                onClick={handleApproveTransaction}
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm Payment Received
                  </>
                )}
              </Button>
              
              <Button 
                variant="destructive"
                onClick={() => handleRejectTransaction('Payment not received')}
                disabled={isUpdating}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Payment Not Received
              </Button>
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setActiveTab('messages')}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Buyer
            </Button>
          </div>
        );
      } else if (isUserBuyer) {
        return (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
              <p className="text-sm text-blue-800 mb-2 font-medium">Payment Sent</p>
              <p className="text-sm text-blue-700">
                You've confirmed sending {transaction.amount} {transaction.currency}. 
                Waiting for the seller to confirm receipt of your payment.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline"
                onClick={() => setActiveTab('messages')}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Seller
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setIsDisputing(true)}
                className="w-full text-amber-600 border-amber-600 hover:bg-amber-50"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Open Dispute
              </Button>
            </div>
          </div>
        );
      }
    } else if (transaction.status === 'completed') {
      return (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 p-3 rounded-md flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-800 font-medium">Transaction Complete</p>
              <p className="text-sm text-green-700">
                This transaction has been successfully completed.
                {isUserBuyer && ` You've received ${transaction.tokenAmount} ${transaction.token}.`}
                {isUserSeller && ` You've received ${transaction.amount} ${transaction.currency}.`}
              </p>
            </div>
          </div>
        </div>
      );
    } else if (transaction.status === 'cancelled') {
      return (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 p-3 rounded-md flex items-start">
            <XCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">Transaction Cancelled</p>
              <p className="text-sm text-red-700">
                This transaction has been cancelled.
                {transaction.failureReason && ` Reason: ${transaction.failureReason}`}
              </p>
            </div>
          </div>
        </div>
      );
    } else if (transaction.status === 'disputed') {
      return (
        <div className="space-y-3">
          <div className="bg-orange-50 border border-orange-200 p-3 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-orange-800 font-medium">Transaction Disputed</p>
              <p className="text-sm text-orange-700">
                This transaction is currently under dispute.
                Our support team will review the case and contact both parties.
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => setActiveTab('messages')}
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Check Messages
          </Button>
        </div>
      );
    }
    
    // Default for other statuses
    return (
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
          <p className="text-sm text-blue-800">
            Transaction is in {transaction.status} status. Please wait for the next step.
          </p>
        </div>
      </div>
    );
  };

  // Render dispute form
  const renderDisputeForm = () => {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
          <p className="text-sm text-amber-800 font-medium">Raise a Dispute</p>
          <p className="text-sm text-amber-700">
            If you're having issues with this transaction, please provide details below.
            Our support team will review the case.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dispute-reason">Reason for Dispute <span className="text-red-500">*</span></Label>
          <textarea
            id="dispute-reason"
            className="w-full p-2 border rounded-md"
            placeholder="Explain the issue in detail"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            rows={3}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dispute-evidence">Evidence (optional)</Label>
          <textarea
            id="dispute-evidence"
            className="w-full p-2 border rounded-md"
            placeholder="Provide links to screenshots or transaction evidence"
            value={paymentEvidence}
            onChange={(e) => setPaymentEvidence(e.target.value)}
            rows={2}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="default"
            onClick={handleRaiseDispute}
            disabled={isUpdating || !disputeReason}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Submit Dispute
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setIsDisputing(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  // If in dispute mode, show the dispute form
  if (isDisputing) {
    return (
      <Card className="p-5">
        {renderDisputeForm()}
      </Card>
    );
  }

  // Render the main component with the cancellation dialog
  return (
    <>
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this transaction? This action cannot be undone.
              {transaction.status === 'matched' && (
                <p className="mt-2 text-amber-600">
                  {isUserBuyer 
                    ? "The seller will be notified and the transaction will be cancelled."
                    : "The buyer will be notified and the transaction will be cancelled."}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Transaction</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelTransaction}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Transaction"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              Messages
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        <TabsContent value="details" className="space-y-4 mt-4">
          {/* Transaction header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isBuy ? (
                <ArrowDownLeft className="h-5 w-5 text-green-500" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-blue-500" />
              )}
              <h3 className="text-lg font-medium">
                {isBuy ? 'Buy' : 'Sell'} {transaction.token}
              </h3>
              {getStatusBadge()}
            </div>
            
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {transaction.createdAt && (
                <>Created {formatDistanceToNow(parseISO(transaction.createdAt))} ago</>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={getProgressPercentage()} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Initiated</span>
              <span>Matched</span>
              <span>Payment</span>
              <span>Completed</span>
            </div>
          </div>
          
          {/* Transaction details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Trade Details</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <div className="font-medium">
                    {transaction.tokenAmount} {transaction.token}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <div className="font-medium">
                    {transaction.amount} {transaction.currency}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <div className="font-medium">
                    {isBuy ? 'Buy' : 'Sell'} {transaction.token}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="font-medium">
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <h4 className="text-sm font-medium">Payment Information</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {isUserBuyer ? 'You Send' : 'Buyer Sends'}
                  </Label>
                  <div className="font-medium">
                    {transaction.amount} {transaction.currency}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {isUserSeller ? 'You Send' : 'Seller Sends'}
                  </Label>
                  <div className="font-medium">
                    {transaction.tokenAmount} {transaction.token}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Counterparty</Label>
                  <div className="font-medium">
                    {counterpartyName}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Payment Method</Label>
                  <div className="font-medium">
                    {formatPaymentMethod(transaction.makerPaymentMethod || 'Not specified')}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Actions</h4>
              
              {getActionButtons()}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="messages" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Messages with {counterpartyName}</h4>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadMessages}
                disabled={isLoadingMessages}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
          
          <div className="border rounded-md h-[300px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-3">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                  <p>No messages yet</p>
                  <p className="text-xs">Start the conversation below</p>
                </div>
              ) : (
                <MessageList messages={messages} currentUserAddress={walletAddress} />
              )}
            </div>
            
            <Separator />
            
            <div className="p-3">
              <MessageComposer 
                onSend={handleSendMessage} 
                placeholder="Type your message..." 
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
    </>
  );
}