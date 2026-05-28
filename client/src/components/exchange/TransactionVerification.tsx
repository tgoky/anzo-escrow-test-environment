import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { useWalletStore } from '@/lib/walletStore';

interface TransactionVerificationProps {
  amount: number;
  recipientWallet: string;
  tokenSymbol?: string;
  transactionId?: number;
  onComplete: () => void;
  onBack: () => void;
}

export function TransactionVerification({ 
  amount, 
  recipientWallet,
  tokenSymbol = 'USDT',
  transactionId,
  onComplete,
  onBack 
}: TransactionVerificationProps) {
  const [step, setStep] = useState<'sender' | 'recipient' | 'waiting_for_seller' | 'success'>('sender');
  const [senderVerified, setSenderVerified] = useState(false);
  const [recipientVerified, setRecipientVerified] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { connectedWallet } = useWalletStore();

  // Poll for transaction status updates
  const pollTransactionStatus = useCallback(async () => {
    if (!transactionId) return;
    
    try {
      const response = await axios.get(`/api/transactions/by-id/${transactionId}`);
      const transaction = response.data;
      
      if (transaction?.makerApproval && transaction?.takerApproval) {
        // Both parties have approved
        setRecipientVerified(true);
        setSenderVerified(true);
        setStep('success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else if (transaction?.takerApproval) {
        // Buyer has confirmed payment but still waiting for seller
        setSenderVerified(true);
        setStep('waiting_for_seller');
      }
    } catch (error) {
      console.error('Error polling transaction status:', error);
    }
  }, [transactionId]);

  // Set up polling interval
  useEffect(() => {
    // Initial check
    pollTransactionStatus();
    
    // Set up polling interval (every 5 seconds)
    const interval = setInterval(pollTransactionStatus, 5000);
    
    return () => clearInterval(interval);
  }, [pollTransactionStatus]);

  // First step - show that sender has sent payment
  useEffect(() => {
    if (step === 'sender' && !senderVerified) {
      const timer = setTimeout(() => {
        setSenderVerified(true);
        toast({
          title: "Payment sent",
          description: "You've confirmed sending payment to the seller"
        });
        setStep('waiting_for_seller');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, senderVerified, toast]);

  // Complete transaction and show success screen
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  // Handle manual approval for testing/demo
  const handleManualApproval = async () => {
    if (!transactionId) return;
    
    try {
      setIsUpdating(true);
      
      // Simulate the seller approving the transaction using the correct endpoint
      const approvalUrl = `/api/transactions/${transactionId}/approval`;
      console.log('🔍 Submitting seller approval to URL:', approvalUrl);
      
      await axios.patch(approvalUrl, {
        approvalType: 'maker',
        approved: true,
        reason: 'Payment confirmed by seller'
      });
      
      toast({
        title: "Seller approved",
        description: "The seller has confirmed receipt of payment"
      });
      
      setRecipientVerified(true);
      setStep('success');
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error('Error approving transaction:', error);
      console.error('Error details:', (error as any).response?.data || (error as any).message);
      
      toast({
        title: "Error",
        description: "Failed to complete transaction verification",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step !== 'success' ? (
        <motion.div
          key="verification"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Verifying Transaction</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${senderVerified ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {senderVerified ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <Loader2 className="h-6 w-6 text-gray-600 animate-spin" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Sender Verification</p>
                  <p className="text-sm text-gray-500">
                    {senderVerified ? 'Verified' : 'Confirming you\'ve sent payment...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${recipientVerified ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {step === 'waiting_for_seller' ? (
                    recipientVerified ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Loader2 className="h-6 w-6 text-gray-600 animate-spin" />
                    )
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-300" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Recipient Verification</p>
                  <p className="text-sm text-gray-500">
                    {step === 'waiting_for_seller' 
                      ? (recipientVerified 
                          ? 'Seller has confirmed payment receipt' 
                          : 'Waiting for seller to confirm payment receipt...')
                      : 'Waiting for sender verification...'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={onBack}
                disabled={isUpdating}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              
              {/* Simulation button removed as requested */}
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="text-center space-y-4"
        >
          <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold">Transaction Complete!</h2>
          <p className="text-gray-600">
            Successfully purchased {amount} {tokenSymbol} from wallet {recipientWallet.slice(0, 4)}...{recipientWallet.slice(-4)}
          </p>
          <Button 
            className="mt-6"
            onClick={onComplete}
          >
            View Transaction Details
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
