import { useState, useEffect } from "react";
import { useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { PublicKey, Connection, SystemProgram, Keypair, Transaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import * as EscrowClient from "@/lib/contracts/escrow";
import { AnzoEscrow } from "@/types/escrow";
import { useSolanaWallets } from '@privy-io/react-auth/solana';

// Direct method to fetch offers
const fetchOffers = async (walletAddress: string): Promise<Offer[]> => {
  if (!walletAddress) return [];
  try {
    const response = await axios.get(`/api/maker/offers/${walletAddress}`, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching offers:', error);
    return [];
  }
};

interface TransactionData {
  id: string;
  type: 'buy' | 'sell';
  status: 'pending' | 'completed' | 'failed' | 'deleted' | 'searching' | 'matched' | 'cancelled' | 'verification';
  amount: number;
  currency?: string;
  tokenAmount?: number;
  token: string;
  walletAddress: string;
  counterpartyAddress?: string;
  makerFinancialAccount?: any;
  takerFinancialAccount?: any;
  makerPaymentMethod?: string;
  takerPaymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  timeoutAt?: string;
  failureReason?: string;
  usdAmount?: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { connectedWallet, setConnectedWallet } = useWalletStore();
  const { wallets } = useSolanaWallets();
  const connection = new Connection("http://localhost:8899", { commitment: "confirmed" });
  const authoritySecretKey = new Uint8Array([143,202,87,145,230,184,50,192,85,179,141,210,151,160,252,11,237,181,189,163,67,115,41,21,224,85,93,106,17,202,174,170,174,37,43,103,182,224,17,111,76,230,188,73,83,203,210,158,59,145,61,211,22,214,54,96,45,126,9,94,184,27,120,55]);
  const authorityKeypair = Keypair.fromSecretKey(authoritySecretKey);

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
  const [program, setProgram] = useState<Program<AnzoEscrow> | null>(null);
  const [controllerInitialized, setControllerInitialized] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(false); // New state for loading

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const walletParam = params.get('wallet');
    const storedWalletAddress = localStorage.getItem('wallet_address');
    if (walletParam && !connectedWallet) {
      setConnectedWallet(walletParam);
      window.history.replaceState({}, '', '/maker');
    } else if (storedWalletAddress && !connectedWallet) {
      setConnectedWallet(storedWalletAddress);
    }
  }, [connectedWallet, setConnectedWallet]);

  const { addAccount } = useFinancialAccountStore();

  const handleAccountConnect = (account: FinancialAccount) => {
    addAccount(account);
    setAccountConnectionOpen(false);
  };

  const initializeProgram = () => {
    if (!wallets[0]) {
      console.error('No wallet connected');
      return null;
    }
    try {
      const newProgram = EscrowClient.initializeConnection(connection, wallets[0]);
      setProgram(newProgram);
      return newProgram;
    } catch (error) {
      console.error("Error initializing program:", error);
      return null;
    }
  };

  const checkControllerExists = async () => {
    if (!program) return false;
    const [controllerPda] = PublicKey.findProgramAddressSync([Buffer.from("CONTROLLER")], program.programId);
    const controllerAccount = await connection.getAccountInfo(controllerPda);
    const exists = !!controllerAccount;
    setControllerInitialized(exists);
    return exists;
  };

  const initializeControllerIfNeeded = async () => {
    const programInstance = program || initializeProgram();
    if (!programInstance) throw new Error('Failed to initialize program');
    if (await checkControllerExists()) return;
    try {
      const instruction = await EscrowClient.initializeController(programInstance, authorityKeypair.publicKey, authorityKeypair.publicKey);
      const tx = new Transaction().add(instruction);
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = authorityKeypair.publicKey;
      tx.sign(authorityKeypair);
      const signature = await connection.sendTransaction(tx, [authorityKeypair]);
      await connection.confirmTransaction(signature, 'confirmed');
      console.log("Controller initialized:", signature);
      setControllerInitialized(true);
    } catch (error: any) {
      console.error("Error initializing controller:", error);
      throw error;
    }
  };

  const initializeMakerIfNeeded = async (walletAddress: string) => {
    const programInstance = program || initializeProgram();
    if (!programInstance) throw new Error('Failed to initialize program');
    if (!controllerInitialized) await initializeControllerIfNeeded();
    try {
      const walletPubKey = new PublicKey(walletAddress);
      const [makerPda] = PublicKey.findProgramAddressSync([Buffer.from("MAKER"), walletPubKey.toBuffer()], programInstance.programId);
      const makerAccount = await connection.getAccountInfo(makerPda);
      if (makerAccount) {
        console.log('Maker account already exists:', makerPda.toString());
        return;
      }
      const paddedData = new Uint8Array(256);
      paddedData.set(new TextEncoder().encode('Default Maker').slice(0, 256));
      const tx = await programInstance.methods
        .initializeMaker(Array.from(paddedData))
        .accounts({
          authority: authorityKeypair.publicKey,
          payer: walletPubKey,
          controller: PublicKey.findProgramAddressSync([Buffer.from("CONTROLLER")], programInstance.programId)[0],
          makerAuthority: walletPubKey,
          maker: makerPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = walletPubKey;
      tx.partialSign(authorityKeypair);
      const signature = await wallets[0].sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      console.log("Maker initialized:", signature);
      toast({ title: "Maker Initialized", description: `Maker account created: ${makerPda.toString()}` });
    } catch (error: any) {
      console.error("Error initializing maker:", error);
      toast({ title: "Maker Initialization Failed", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const handleCreateOfferClick = async () => {
    if (!connectedWallet) {
      toast({ title: "Wallet Not Connected", description: "Please connect a wallet first.", variant: "destructive" });
      setWalletDialogOpen(true);
      return;
    }

    setIsInitializing(true);
    try {
      await initializeMakerIfNeeded(connectedWallet);
      setOfferDialogOpen(true); // Open modal only after initialization succeeds or is skipped
    } catch (error) {
      // Error already handled in initializeMakerIfNeeded with toast
    } finally {
      setIsInitializing(false);
    }
  };

  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  useEffect(() => {
    const getOffers = async () => {
      if (connectedWallet) {
        setIsLoadingOffers(true);
        try {
          const fetchedOffers = await fetchOffers(connectedWallet);
          setOffers(fetchedOffers);
        } catch (error) {
          setOffers([]);
        } finally {
          setIsLoadingOffers(false);
        }
      } else {
        setOffers([]);
        setIsLoadingOffers(false);
      }
    };
    getOffers();
  }, [connectedWallet]);

  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['maker-transactions', connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return [];
      try {
        const response = await axios.get(`/api/transactions/${connectedWallet}`);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Error fetching transactions:', error);
        throw new Error('Failed to fetch transactions');
      }
    },
    enabled: !!connectedWallet,
    refetchInterval: 5000,
  });

  const transactions = transactionsData || [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') || params.get('activeTab');
    const transactionIdParam = params.get('transactionId');
    if (tabParam) {
      setActiveTab(tabParam === 'activity' || tabParam === 'transactions' ? 'activity' : tabParam === 'offers' ? 'offers' : 'payment-methods');
    }
    if (transactionIdParam) {
      localStorage.setItem('currentTransactionId', transactionIdParam);
      setActiveTab('activity');
      window.history.replaceState({}, '', '/maker');
    }
  }, [activeTab]);

  const getStatusBadgeVariant = (status: TransactionData['status']): 'default' | 'outline' | 'destructive' | 'secondary' => {
    const normalizedStatus = status.toLowerCase();
    return normalizedStatus === 'completed' || normalizedStatus === 'matched' ? 'default' :
           normalizedStatus === 'pending' || normalizedStatus === 'searching' || normalizedStatus === 'verification' ? 'outline' :
           normalizedStatus === 'failed' ? 'destructive' :
           normalizedStatus.includes('cancel') || normalizedStatus === 'deleted' ? 'secondary' : 'outline';
  };

  const getStatusIcon = (status: TransactionData['status']) => {
    const normalizedStatus = status.toLowerCase();
    return normalizedStatus === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
           normalizedStatus === 'pending' ? <Clock className="w-4 h-4 text-yellow-500" /> :
           normalizedStatus === 'failed' ? <XCircle className="w-4 h-4 text-red-500" /> :
           normalizedStatus === 'searching' ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> :
           normalizedStatus === 'matched' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
           normalizedStatus.includes('cancel') ? <Ban className="w-4 h-4 text-gray-500" /> :
           normalizedStatus === 'verification' ? <Clock className="w-4 h-4 text-blue-500" /> :
           <Circle className="w-4 h-4" />;
  };

  const getTransactionIcon = (transaction: TransactionData) => {
    return transaction.type === 'buy' ? <ArrowDownLeft className="w-4 h-4 mr-2 text-green-500" /> :
           <ArrowUpRight className="w-4 h-4 mr-2 text-red-500" />;
  };

  const handleEditOffer = (offer: Offer) => {
    setEditOfferId(offer.id);
    setOfferType(offer.type);
    setOfferAsset(offer.token);
    setOfferPrice(offer.price);
    setOfferAmount(typeof offer.amount === 'string' ? offer.amount : offer.amount.total);
    if (offer.restrictions) {
      offer.restrictions.minAmount && setMinOrderAmount(String(offer.restrictions.minAmount));
      offer.restrictions.maxAmount && setMaxOrderAmount(String(offer.restrictions.maxAmount));
    }
    offer.fiatCurrency && setSelectedCurrency(offer.fiatCurrency);
    offer.paymentMethods?.[0] && setSelectedPaymentMethod(offer.paymentMethods[0]);
    offer.financialAccountId && setSelectedFinancialAccount(offer.financialAccountId);
    setOfferDialogOpen(true);
  };

  const handleToggleOfferStatus = async (offerId: string, newStatus: 'active' | 'paused') => {
    try {
      await axios.patch(`/api/offers/${offerId}/status`, { status: newStatus });
      setOffers(offers.map(o => o.id === offerId ? { ...o, status: newStatus } : o));
      toast({ title: `Offer ${newStatus}`, description: `Your offer has been ${newStatus === 'active' ? 'activated' : 'paused'}.` });
    } catch (error) {
      console.error('Error toggling offer status:', error);
      toast({ title: 'Error', description: 'Failed to update offer status.', variant: "destructive" });
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      await axios.delete(`/api/offers/${offerId}`);
      const updatedOffers = offers.filter(offer => String(offer.id) !== String(offerId));
      const freshResponse = await axios.get(`/api/maker/offers/${connectedWallet}`);
      setOffers(freshResponse.data);
      toast({ title: 'Offer deleted', description: 'Your offer has been deleted successfully.' });
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({ title: 'Error', description: 'Failed to delete offer.', variant: "destructive" });
    }
  };

  const handleCreateOrUpdateOffer = async () => {
    if (!offerAmount || !offerPrice || !selectedPaymentMethod || !selectedFinancialAccount || selectedFinancialAccount === 'new') {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const offerData = {
      type: offerType,
      token: offerAsset,
      price: offerPrice,
      amount: offerAmount,
      minOrderAmount,
      maxOrderAmount,
      fiatCurrency: selectedCurrency,
      paymentMethods: [selectedPaymentMethod],
      financialAccountId: selectedFinancialAccount,
      priceType
    };

    try {
      if (editOfferId) {
        const response = await axios.patch(`/api/offers/${editOfferId}`, offerData);
        setOffers(offers.map(o => o.id === editOfferId ? response.data : o));
        setEditOfferId(null);
        toast({ title: "Offer Updated", description: "Your offer has been updated successfully." });
      } else {
        const response = await axios.post(`/api/offers`, { ...offerData, walletAddress: connectedWallet });
        const freshResponse = await axios.get(`/api/maker/offers/${connectedWallet}`);
        setOffers(freshResponse.data);
        toast({ title: "Offer Created", description: "Your offer has been created successfully." });
      }
      setOfferDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating/updating offer:', error);
      toast({ title: "Failed to Create/Update Offer", description: error.message || "An error occurred.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-20">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <WalletCards className="h-8 w-8 text-primary" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              {connectedWallet ? `Connected: ${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}` : "Not connected"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {!connectedWallet && <Button onClick={() => setWalletDialogOpen(true)}>Connect Wallet</Button>}
            {connectedWallet && (
              <Button 
                variant="outline" 
                onClick={handleCreateOfferClick} 
                className="flex items-center gap-2"
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Create Offer
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
              <CardDescription>Your marketplace offers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offers.filter(o => o.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground mt-1">{offers.length} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transactions.filter(t => new Date(t.createdAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{transactions.filter(t => t.status === 'completed').length} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
              <CardDescription>Connected accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{useFinancialAccountStore.getState().connectedAccounts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {useFinancialAccountStore.getState().connectedAccounts.filter(a => a.account.status === 'active').length} active
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="offers" value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-xl shadow-sm p-6">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="offers" className="text-sm"><ClipboardList className="w-4 h-4 mr-2" />Offers</TabsTrigger>
            <TabsTrigger value="activity" className="text-sm"><BarChart3 className="w-4 h-4 mr-2" />Activity</TabsTrigger>
            <TabsTrigger value="payment-methods" className="text-sm"><CreditCard className="w-4 h-4 mr-2" />Payment Methods</TabsTrigger>
          </TabsList>
          
          <TabsContent value="offers">
            {connectedWallet ? (
              <OffersList
                offers={offers}
                isLoading={isLoadingOffers}
                onCreateOffer={handleCreateOfferClick}
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
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">Connect your wallet to see your offers.</p>
                  <Button onClick={() => setWalletDialogOpen(true)}>Connect Wallet</Button>
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
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">Connect your wallet to see your transaction history.</p>
                  <Button onClick={() => setWalletDialogOpen(true)}>Connect Wallet</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="payment-methods"><PaymentMethodsTab /></TabsContent>
        </Tabs>
      </div>

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
      
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[80vh] overflow-y-auto p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">{editOfferId ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
            <DialogDescription className="text-sm">{editOfferId ? 'Update your existing offer details.' : 'Set up a new offer to buy or sell crypto.'}</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Offer Type</Label>
                <div className="flex rounded-md overflow-hidden">
                  <Button type="button" variant={offerType === 'buy' ? 'default' : 'outline'} className={`w-full rounded-r-none ${offerType === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}`} onClick={() => setOfferType('buy')}>
                    <ArrowDownLeft className="mr-2 h-4 w-4" />Buy
                  </Button>
                  <Button type="button" variant={offerType === 'sell' ? 'default' : 'outline'} className={`w-full rounded-l-none ${offerType === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}`} onClick={() => setOfferType('sell')}>
                    <ArrowUpRight className="mr-2 h-4 w-4" />Sell
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Asset</Label>
                <Select value={offerAsset} onValueChange={setOfferAsset}>
                  <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
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
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.currency} value={country.currency}>{country.currency} ({country.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Price Type</Label>
              <div className="flex rounded-md overflow-hidden">
                <Button type="button" variant={priceType === 'fixed' ? 'default' : 'outline'} className="w-full rounded-r-none" onClick={() => setPriceType('fixed')}>Fixed Price</Button>
                <Button type="button" variant={priceType === 'floating' ? 'default' : 'outline'} className="w-full rounded-l-none" onClick={() => setPriceType('floating')}>Market Rate</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Price per {offerAsset}</Label>
                <div className="flex items-center relative">
                  <div className="absolute left-3 text-gray-500">{countries.find(c => c.currency === selectedCurrency)?.symbol || '$'}</div>
                  <Input type="text" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} className="pl-8" placeholder={`Price in ${selectedCurrency}`} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Total {offerAsset}</Label>
                <Input type="text" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder={`Amount of ${offerAsset}`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Minimum Order</Label>
                <div className="flex items-center relative">
                  <div className="absolute left-3 text-gray-500">{countries.find(c => c.currency === selectedCurrency)?.symbol || '$'}</div>
                  <Input type="text" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} className="pl-8" placeholder={`Min ${selectedCurrency}`} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Maximum Order</Label>
                <div className="flex items-center relative">
                  <div className="absolute left-3 text-gray-500">{countries.find(c => c.currency === selectedCurrency)?.symbol || '$'}</div>
                  <Input type="text" value={maxOrderAmount} onChange={(e) => setMaxOrderAmount(e.target.value)} className="pl-8" placeholder={`Max ${selectedCurrency}`} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer_USD">Bank Transfer</SelectItem>
                  <SelectItem value="zelle_USD">Zelle</SelectItem>
                  <SelectItem value="paypal_USD">PayPal</SelectItem>
                  <SelectItem value="venmo_USD">Venmo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Financial Account</Label>
              <Select value={selectedFinancialAccount} onValueChange={setSelectedFinancialAccount}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {useFinancialAccountStore.getState().connectedAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.account.accountName} ({account.account.institution.name})</SelectItem>
                  ))}
                  <SelectItem value="new">+ Connect New Account</SelectItem>
                </SelectContent>
              </Select>
              {selectedFinancialAccount === 'new' && (
                <Button variant="outline" className="mt-2 w-full" onClick={() => { setOfferDialogOpen(false); setAccountConnectionOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />Connect Account
                </Button>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOfferDialogOpen(false); if (editOfferId) setEditOfferId(null); }}>Cancel</Button>
            <Button onClick={handleCreateOrUpdateOffer}>{editOfferId ? 'Update Offer' : 'Create Offer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}