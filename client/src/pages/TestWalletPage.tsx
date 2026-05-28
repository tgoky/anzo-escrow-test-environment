import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/lib/walletStore";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "wouter";

export default function TestWalletPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { connectedWallet, setConnectedWallet, isConnected } = useWalletStore();
  
  // Test wallet address (same as in the utility script)
  const testWalletAddress = '6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ';
  
  const connectTestWallet = () => {
    setLoading(true);
    
    setTimeout(() => {
      localStorage.setItem('walletPublicKey', testWalletAddress);
      setConnectedWallet(testWalletAddress);
      
      // Invalidate any queries that depend on the wallet
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['maker-transactions'] });
      
      setLoading(false);
      
      toast({
        title: 'Test Wallet Connected',
        description: 'Successfully connected the test wallet address',
        duration: 3000,
      });
    }, 500); // Simulate a slight delay
  };
  
  const disconnectWallet = () => {
    setLoading(true);
    
    setTimeout(() => {
      localStorage.removeItem('walletPublicKey');
      setConnectedWallet(null);
      
      // Clear relevant queries
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['maker-transactions'] });
      
      setLoading(false);
      
      toast({
        title: 'Wallet Disconnected',
        description: 'Successfully disconnected the wallet',
        duration: 3000,
      });
    }, 500); // Simulate a slight delay
  };
  
  // Query to check if the connected wallet has any offers
  const { data: offers = [], isLoading: isLoadingOffers } = useQuery({
    queryKey: ['test-offers', connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return [];
      
      try {
        const response = await axios.get(`/api/maker/offers/${connectedWallet}`);
        return response.data || [];
      } catch (error) {
        console.error('Error fetching offers:', error);
        return [];
      }
    },
    enabled: !!connectedWallet,
  });
  
  // Query to check if the connected wallet has any transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['test-transactions', connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return [];
      
      try {
        const response = await axios.get(`/api/transactions/${connectedWallet}`);
        return response.data || [];
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
    enabled: !!connectedWallet,
  });
  
  // Copy wallet address to clipboard
  const copyToClipboard = () => {
    if (connectedWallet) {
      navigator.clipboard.writeText(connectedWallet);
      toast({
        title: 'Copied to Clipboard',
        description: 'Wallet address copied to clipboard',
        duration: 2000,
      });
    }
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Wallet Connection Test</h1>
          <p className="text-muted-foreground">
            This page helps you test the wallet connection and verify data fetching
          </p>
        </div>
        
        {/* Wallet Status */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Status</CardTitle>
            <CardDescription>
              Current connection status of your wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isConnected() ? (
              <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">Wallet Connected</AlertTitle>
                <AlertDescription className="flex items-center gap-2 mt-2">
                  <code className="px-2 py-1 bg-green-100 rounded font-mono text-sm">
                    {connectedWallet?.slice(0, 6)}...
                    {connectedWallet?.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Wallet Connected</AlertTitle>
                <AlertDescription>
                  Connect a test wallet to continue testing the application
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {isConnected() ? (
              <Button 
                variant="destructive" 
                onClick={disconnectWallet}
                disabled={loading}
              >
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Disconnect Wallet
              </Button>
            ) : (
              <Button 
                onClick={connectTestWallet}
                disabled={loading}
              >
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Connect Test Wallet
              </Button>
            )}
            
            {isConnected() && (
              <Button asChild variant="outline">
                <Link to="/maker">
                  Go to Maker Dashboard <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Data Verification */}
        {isConnected() && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Offers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Offers
                  <Badge variant={offers.length > 0 ? "default" : "outline"}>
                    {offers.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Offers associated with this wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOffers ? (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : offers.length > 0 ? (
                  <div className="space-y-3">
                    {offers.slice(0, 3).map((offer: any) => (
                      <div key={offer.id} className="p-3 border rounded-md">
                        <div className="flex justify-between">
                          <div className="font-medium">
                            {offer.type === 'buy' ? 'Buy' : 'Sell'} {offer.token}
                          </div>
                          <Badge variant={offer.status === 'active' ? 'default' : 'secondary'}>
                            {offer.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Price: {offer.price} {offer.fiatCurrency}
                        </div>
                      </div>
                    ))}
                    {offers.length > 3 && (
                      <div className="text-center text-sm text-muted-foreground pt-2">
                        + {offers.length - 3} more offers
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No offers found for this wallet
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Transactions
                  <Badge variant={transactions.length > 0 ? "default" : "outline"}>
                    {transactions.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Transactions associated with this wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.slice(0, 3).map((tx: any) => (
                      <div key={tx.id} className="p-3 border rounded-md">
                        <div className="flex justify-between">
                          <div className="font-medium">
                            {tx.type === 'buy' ? 'Buy' : 'Sell'} {tx.token}
                          </div>
                          <Badge variant={
                            tx.status === 'completed' ? 'default' :
                            tx.status === 'pending' ? 'secondary' :
                            'outline'
                          }>
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Amount: {tx.amount} {tx.currency}
                        </div>
                      </div>
                    ))}
                    {transactions.length > 3 && (
                      <div className="text-center text-sm text-muted-foreground pt-2">
                        + {transactions.length - 3} more transactions
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No transactions found for this wallet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}