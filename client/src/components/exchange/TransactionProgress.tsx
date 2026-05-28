import { useState, useEffect } from 'react';
import { 
  Loader2, 
  AlertTriangle, 
  Copy, 
  Clock,
  MessageCircle,
  Info,
  ArrowRight,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TransactionProgressProps {
  amount: string;
  currentTransactionId: number;
  onConfirmPayment: (txId: number) => void;
  onBack: () => void;
}

export function TransactionProgress({
  amount,
  currentTransactionId,
  onConfirmPayment,
  onBack
}: TransactionProgressProps) {
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Default payment details as fallback
  const [paymentDetails, setPaymentDetails] = useState({
    name: "Loading...",
    email: "Loading...",
    method: "Payment",
    paymentInstructions: "Please send payment using the details below."
  });
  
  // Fetch transaction details on component mount
  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        console.log('📊 Fetching transaction details for ID:', currentTransactionId);
        
        // Use the dedicated endpoint for fetching by ID
        const response = await axios.get(`/api/transactions/by-id/${currentTransactionId}`);
        console.log('📊 Transaction details received:', response.data);
        
        // Verify we have a transaction and it's matched state
        if (response.data?.status !== 'matched') {
          console.warn('⚠️ Transaction is not in matched state:', response.data?.status);
          // We'll still set the transaction and try to show whatever we can
        }
        
        setTransaction(response.data);
        
        // Extract payment details from transaction
        if (response.data) {
          let details = {
            name: "Crypto Seller",
            email: "No email provided",
            method: "Payment",
            paymentInstructions: "Please send payment using the details below."
          };
          
          // If makerFinancialAccount exists, try to parse it
          if (response.data.makerFinancialAccount) {
            try {
              let makerAccount;
              if (typeof response.data.makerFinancialAccount === 'string') {
                makerAccount = JSON.parse(response.data.makerFinancialAccount);
              } else {
                makerAccount = response.data.makerFinancialAccount;
              }
              
              // Check for Zelle details if that's the payment method
              if (response.data.makerPaymentMethod === 'zelle' && 
                  makerAccount.paymentCapabilities?.zelle?.enabled) {
                details = {
                  name: makerAccount.accountHolder?.individual?.name?.fullName || 
                        makerAccount.institution?.name || "Crypto Seller",
                  email: makerAccount.paymentCapabilities.zelle.email || "No email provided",
                  method: "Zelle",
                  paymentInstructions: response.data.paymentInstructions || "Please send payment using the details below."
                };
              } 
              // Check for bank transfer details (manual accounts)
              else if (['bank_transfer', 'wire'].includes(response.data.makerPaymentMethod)) {
                // Check if this is a manual account
                if (makerAccount.metadata?.manualPaymentMethods) {
                  const paymentMethod = makerAccount.metadata.manualPaymentMethods.find(
                    (pm: any) => pm.type === response.data.makerPaymentMethod
                  );
                  
                  if (paymentMethod) {
                    details = {
                      name: paymentMethod.details.accountHolder || makerAccount.institution?.name || "Crypto Seller",
                      email: paymentMethod.details.email || "No email provided",
                      method: response.data.makerPaymentMethod === 'wire' ? "Wire Transfer" : "Bank Transfer",
                      paymentInstructions: `Bank: ${paymentMethod.details.bankName || 'N/A'}, Account: ${paymentMethod.details.accountNumber || 'N/A'}`
                    };
                  }
                } 
                // Traditional bank account (non-manual)
                else if (makerAccount.regionalDetails) {
                  details = {
                    name: makerAccount.accountHolder?.individual?.name?.fullName || 
                          makerAccount.institution?.name || "Crypto Seller",
                    email: makerAccount.accountHolder?.individual?.emailAddress || "No email provided",
                    method: response.data.makerPaymentMethod === 'wire' ? "Wire Transfer" : "Bank Transfer",
                    paymentInstructions: `Account: ${makerAccount.regionalDetails.accountNumber || 'N/A'}, Routing: ${makerAccount.regionalDetails.routingNumber || 'N/A'}`
                  };
                }
              }
            } catch (e) {
              console.error('❌ Error parsing maker financial account:', e);
            }
          } else {
            // Handle case where transaction is marked as matched but has missing maker financial account
            console.warn('⚠️ Transaction is matched but missing maker financial account!');
            setError('Missing payment details. Please contact support.');
          }
          
          setPaymentDetails(details);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching transaction details:', err);
        setError('Failed to load transaction details. Please try again.');
        setLoading(false);
      }
    };
    
    fetchTransactionDetails();
  }, [currentTransactionId]);

  // Helper function to render payment details for a manual account
  const renderManualPaymentDetails = (paymentMethod: any) => {
    return (
      <div className="space-y-3">
        {/* Recipient details - always shown */}
        {paymentMethod.details.accountHolder && (
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Recipient Name</p>
              <p className="font-medium truncate">{paymentMethod.details.accountHolder}</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentMethod.details.accountHolder);
                      toast({
                        title: "Copied!",
                        description: "Recipient name copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy recipient name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Bank information */}
        {paymentMethod.details.bankName && (
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Bank Name</p>
              <p className="font-medium truncate">{paymentMethod.details.bankName}</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentMethod.details.bankName);
                      toast({
                        title: "Copied!",
                        description: "Bank name copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy bank name</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Account number */}
        {paymentMethod.details.accountNumber && (
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Account Number</p>
              <p className="font-medium font-mono truncate">{paymentMethod.details.accountNumber}</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentMethod.details.accountNumber);
                      toast({
                        title: "Copied!",
                        description: "Account number copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy account number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Email (for digital payments) */}
        {paymentMethod.details.email && (
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">{transaction.makerPaymentMethod === 'zelle' ? 'Zelle Email' : 'Email'}</p>
              <p className="font-medium truncate">{paymentMethod.details.email}</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentMethod.details.email);
                      toast({
                        title: "Copied!",
                        description: "Email address copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy email</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Phone (for mobile payments) */}
        {paymentMethod.details.phoneNumber && (
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">{transaction.makerPaymentMethod === 'zelle' ? 'Zelle Phone' : 'Phone Number'}</p>
              <p className="font-medium truncate">{paymentMethod.details.phoneNumber}</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentMethod.details.phoneNumber);
                      toast({
                        title: "Copied!",
                        description: "Phone number copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy phone number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <motion.div
        key="loading"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <Card className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </Card>
      </motion.div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <motion.div
        key="error"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <Card className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-4" />
          <p className="text-red-600 font-medium mb-2">Error</p>
          <p className="text-gray-600 text-center">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={onBack}
          >
            Go Back
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Main render - transaction details with new more compact layout
  return (
    <motion.div
      key="recipient"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="p-4 max-w-md mx-auto">
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">{paymentDetails.method.replace('_', ' ')}</h2>
            <p className="text-sm text-gray-500">
              Transaction #{currentTransactionId}
            </p>
          </div>
          {transaction?.counterpartyAddress && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 flex gap-1 items-center">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">Chat</span>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Chat with Seller</SheetTitle>
                  <SheetDescription>
                    Discuss any transaction details with the seller
                  </SheetDescription>
                </SheetHeader>
                <div className="h-[80vh] flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Chat feature will open in separate window</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <div className="space-y-3">
          {/* Payment amount summary card */}
          <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center border border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Amount to Send</p>
              <p className="font-medium text-lg text-primary">${amount}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Clock className="h-4 w-4" />
              <span>5 min</span>
            </div>
          </div>
          
          {/* Important notice */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-yellow-700">
                Send the <strong>exact amount</strong> and include transaction ID in payment details
              </p>
            </div>
          </div>
          
          {/* Tabbed interface for payment details */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Payment Details</TabsTrigger>
              <TabsTrigger value="info">Transaction Info</TabsTrigger>
            </TabsList>
            
            {/* PAYMENT DETAILS TAB */}
            <TabsContent value="details" className="space-y-3 mt-3">
              {transaction?.makerFinancialAccount && (() => {
                let makerAccount;
                try {
                  makerAccount = typeof transaction.makerFinancialAccount === 'string' 
                    ? JSON.parse(transaction.makerFinancialAccount) 
                    : transaction.makerFinancialAccount;
                    
                  // Manual payment methods
                  if (makerAccount.metadata?.manualPaymentMethods) {
                    const paymentMethod = makerAccount.metadata.manualPaymentMethods.find(
                      (pm: any) => pm.type === transaction.makerPaymentMethod
                    );
                    
                    if (paymentMethod) {
                      return renderManualPaymentDetails(paymentMethod);
                    }
                  }
                  
                  // Zelle-specific UI
                  if (transaction.makerPaymentMethod === 'zelle' && makerAccount.paymentCapabilities?.zelle?.enabled) {
                    return (
                      <div className="space-y-3">
                        {/* Zelle Email */}
                        {makerAccount.paymentCapabilities.zelle.email && (
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Zelle Email</p>
                              <p className="font-medium truncate">{makerAccount.paymentCapabilities.zelle.email}</p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      navigator.clipboard.writeText(makerAccount.paymentCapabilities.zelle.email);
                                      toast({
                                        title: "Copied!",
                                        description: "Zelle email copied to clipboard",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy email</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        
                        {/* Zelle Phone */}
                        {makerAccount.paymentCapabilities.zelle.phone && (
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Zelle Phone</p>
                              <p className="font-medium truncate">{makerAccount.paymentCapabilities.zelle.phone}</p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      navigator.clipboard.writeText(makerAccount.paymentCapabilities.zelle.phone);
                                      toast({
                                        title: "Copied!",
                                        description: "Zelle phone copied to clipboard",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy phone</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        
                        {/* Zelle account holder name */}
                        {makerAccount.accountHolder?.individual?.name?.fullName && (
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Recipient Name</p>
                              <p className="font-medium truncate">{makerAccount.accountHolder.individual.name.fullName}</p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      navigator.clipboard.writeText(makerAccount.accountHolder.individual.name.fullName);
                                      toast({
                                        title: "Copied!",
                                        description: "Recipient name copied to clipboard",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy name</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Bank account fallback
                  if (makerAccount.regionalDetails) {
                    return (
                      <div className="space-y-3">
                        {/* Account holder name */}
                        {makerAccount.accountHolder?.individual?.name?.fullName && (
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Account Holder</p>
                              <p className="font-medium truncate">{makerAccount.accountHolder.individual.name.fullName}</p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      navigator.clipboard.writeText(makerAccount.accountHolder.individual.name.fullName);
                                      toast({
                                        title: "Copied!",
                                        description: "Account holder copied to clipboard",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy name</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        
                        {/* Bank Name */}
                        {makerAccount.institution?.name && (
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Bank Name</p>
                              <p className="font-medium truncate">{makerAccount.institution.name}</p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      navigator.clipboard.writeText(makerAccount.institution.name);
                                      toast({
                                        title: "Copied!",
                                        description: "Bank name copied to clipboard",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy bank name</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        
                        {/* Account Number */}
                        {makerAccount.regionalDetails.accountNumber && (
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Account Number</p>
                              <p className="font-medium font-mono truncate">{makerAccount.regionalDetails.accountNumber}</p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      navigator.clipboard.writeText(makerAccount.regionalDetails.accountNumber);
                                      toast({
                                        title: "Copied!",
                                        description: "Account number copied to clipboard",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy account number</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        
                        {/* Routing Number */}
                        {makerAccount.regionalDetails.routingNumber && (
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-500">Routing Number</p>
                              <p className="font-medium font-mono truncate">{makerAccount.regionalDetails.routingNumber}</p>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => {
                                      navigator.clipboard.writeText(makerAccount.regionalDetails.routingNumber);
                                      toast({
                                        title: "Copied!",
                                        description: "Routing number copied to clipboard",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy routing number</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Fallback UI for unhandled account types
                  return (
                    <div className="p-4 bg-gray-100 rounded-md text-sm text-gray-600">
                      <p>Payment details are available for this transaction, but we don't have a specialized UI for this payment method yet.</p>
                      <p className="mt-2">Please contact the seller for detailed payment instructions.</p>
                    </div>
                  );
                } catch (e) {
                  console.error('Error parsing payment details:', e);
                  return (
                    <div className="p-4 bg-gray-100 rounded-md text-sm text-gray-600">
                      <p>There was an error parsing the payment details.</p>
                      <p className="mt-2">Please contact the seller for payment instructions.</p>
                    </div>
                  );
                }
              })()}
            </TabsContent>
            
            {/* TRANSACTION INFO TAB */}
            <TabsContent value="info" className="space-y-3 mt-3">
              <div className="space-y-4">
                {/* Amount Details */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="font-medium mb-2">Amount Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">You Send (Fiat):</span>
                      <span className="font-medium">${amount}</span>
                    </div>
                    {transaction?.tokenAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">You Receive (Crypto):</span>
                        <span className="font-medium">{transaction.tokenAmount} {transaction.token}</span>
                      </div>
                    )}
                    {transaction?.price && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price:</span>
                        <span className="font-medium">${transaction.price} per {transaction.token}</span>
                      </div>
                    )}
                    {transaction?.fee && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Network Fee:</span>
                        <span className="font-medium">{transaction.fee} {transaction.token}</span>
                      </div>
                    )}
                    <div className="flex items-center pt-2 border-t border-gray-100 mt-2">
                      <ArrowRight className="h-3 w-3 text-gray-400 mr-1" />
                      <span className="text-gray-600 text-xs">Transaction will complete after payment confirmation</span>
                    </div>
                  </div>
                </div>
                
                {/* Payment Instructions in Transaction Info Tab */}
                {transaction?.paymentInstructions && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="font-medium mb-2">Payment Instructions</h4>
                    <p className="text-sm">{transaction.paymentInstructions}</p>
                  </div>
                )}
                
                {/* Seller Wallet Address */}
                {transaction?.counterpartyAddress && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="font-medium mb-2">Seller Wallet Address</h4>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs truncate flex-1">{transaction.counterpartyAddress}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => {
                                navigator.clipboard.writeText(transaction.counterpartyAddress);
                                toast({
                                  title: "Copied!",
                                  description: "Wallet address copied to clipboard",
                                });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy wallet address</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Transaction</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogDescription>
                  Are you sure you want to cancel this transaction? This action cannot be undone.
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, continue</AlertDialogCancel>
                  <AlertDialogAction onClick={onBack}>Yes, cancel</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              className="flex-1"
              size="lg"
              onClick={() => onConfirmPayment(currentTransactionId)}
            >
              I Have Paid
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}