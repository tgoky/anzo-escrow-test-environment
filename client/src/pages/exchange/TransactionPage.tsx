import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import axios from 'axios';
import { useWalletStore } from '@/lib/stores/walletStore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { TransactionFlow } from '@/components/marketplace/TransactionFlow';

export default function TransactionPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { connectedWallet } = useWalletStore();
  const [transaction, setTransaction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!id) {
      setError('No transaction ID provided');
      setIsLoading(false);
      return;
    }

    if (!connectedWallet) {
      setError('Please connect your wallet to view transaction details');
      setIsLoading(false);
      return;
    }

    fetchTransaction();
  }, [id, connectedWallet, refreshTrigger]);

  const fetchTransaction = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get(`/api/transactions/by-id/${id}`);
      if (response.data) {
        setTransaction(response.data);
      } else {
        setError('Transaction not found');
      }
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      setError(error.response?.data?.message || 'Failed to load transaction data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleStatusUpdate = () => {
    handleRefresh();
  };

  const handleBackToExchange = () => {
    setLocation('/exchange');
  };

  // Handle wallet not connected
  if (!connectedWallet) {
    return (
      <div className="container max-w-6xl py-8">
        <Card className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              Please connect your wallet to view transaction details.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => setLocation('/')}>Go to Home</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToExchange}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Transaction Details</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : transaction ? (
        <div className="space-y-6">
          <TransactionFlow
            transaction={transaction}
            walletAddress={connectedWallet}
            onStatusUpdate={handleStatusUpdate}
          />
          
          <Separator />
          
          {/* Additional transaction information like transaction history can be added here */}
        </div>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Transaction Not Found</AlertTitle>
          <AlertDescription>
            The requested transaction could not be found. Please check the transaction ID and try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}