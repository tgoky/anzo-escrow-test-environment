import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Wallet, ExternalLink, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (publicKey: string) => void;
  onDisconnect?: () => void;
  showDetails?: boolean;
}

export function WalletDialog({ open, onOpenChange, onConnect, onDisconnect, showDetails = false }: WalletDialogProps) {
  const [wallet] = useState(() => new PhantomWalletAdapter());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletDetails, setWalletDetails] = useState<{ balance: number; recentTransactions: any[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=b3b33fa1-75f7-47e3-aa4e-901232057dd2", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  });

  const handleConnect = useCallback(async () => {
    if (connecting) return;

    try {
      setConnecting(true);
      setError(null);

      const provider = (window as any).phantom?.solana;

      if (!provider?.isPhantom) {
        if (isMobile) {
          // Generate a unique session ID for this connection attempt
          const sessionId = Math.random().toString(36).substring(2, 15);

          // Store the session ID in localStorage to verify when we return
          localStorage.setItem('phantom_connect_session', sessionId);

          // Construct the deep link with all necessary parameters
          const dappUrl = window.location.origin;
          const redirectUrl = `${dappUrl}/phantom-return?session=${sessionId}`;
          const phantomUrl = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(dappUrl)}&redirect_url=${encodeURIComponent(redirectUrl)}&app_cluster=localnet&cluster=http%3A%2F%2Flocalhost%3A8899`;

          // Redirect to Phantom
          window.location.href = phantomUrl;
          return;
        } else {
          // On desktop, direct to download page
          window.open('https://phantom.app/download', '_blank');
          return;
        }
      }

      // For desktop or if Phantom is already injected
      await wallet.connect();

      if (wallet.publicKey) {
        const publicKey = wallet.publicKey.toString();
        localStorage.setItem('walletPublicKey', publicKey);
        onConnect(publicKey);

        if (showDetails) {
          setIsLoadingDetails(true);
          try {
            // Get balance first, which should always work
            const balance = await connection.getBalance(wallet.publicKey);
            let transactions: Array<{signature: string, slot: number}> = [];
            
            try {
              // Try to get transactions, but handle the case where the method is not available
              transactions = await connection.getConfirmedSignaturesForAddress2(wallet.publicKey, { limit: 5 });
            } catch (txError) {
              console.warn("Could not fetch transaction history:", txError);
              // Continue with empty transactions array if this fails
            }

            setWalletDetails({
              balance: balance / LAMPORTS_PER_SOL,
              recentTransactions: transactions
            });
          } catch (err) {
            console.error("Error loading wallet details:", err);
          } finally {
            setIsLoadingDetails(false);
          }
        }
      }
    } catch (err: any) {
      console.error("Wallet connection error:", err);
      setError('Failed to connect wallet. Please try again.');
      localStorage.removeItem('walletPublicKey');
    } finally {
      setConnecting(false);
    }
  }, [connecting, wallet, connection, onConnect, showDetails, isMobile]);

  // Handle return from Phantom mobile app
  useEffect(() => {
    const handlePhantomReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const session = urlParams.get('session');
      const storedSession = localStorage.getItem('phantom_connect_session');

      if (session && session === storedSession) {
        localStorage.removeItem('phantom_connect_session');
        // Try to connect now that we're back from Phantom
        await handleConnect();
      }
    };

    if (window.location.pathname === '/phantom-return') {
      handlePhantomReturn();
    }
  }, [handleConnect]);

  const handleDisconnect = async () => {
    try {
      await wallet.disconnect();
      setWalletDetails(null);
      localStorage.removeItem('walletPublicKey');
      localStorage.removeItem('phantom_connect_session');
      if (onDisconnect) onDisconnect();
      onOpenChange(false);
    } catch (err) {
      console.error("Disconnect error:", err);
    }
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

  const formatUSD = (solBalance: number) => {
    const usdBalance = solBalance * 100; // Placeholder -  replace with actual USD conversion logic if needed.
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(usdBalance);
  };

  useEffect(() => {
    if (!open) return;

    const storedKey = localStorage.getItem('walletPublicKey');
    console.log("🔍 Wallet dialog opened, checking stored key:", { storedKey, isConnected: wallet.connected });
    
    if (storedKey) {
      // If we have a stored key but the wallet is not connected
      if (!wallet.connected) {
        console.log("🔄 Auto-connecting to wallet with stored key");
        handleConnect();
      } else {
        // If we have a stored key and the wallet is already connected, just make sure onConnect is called
        console.log("✅ Wallet already connected, ensuring key is registered");
        onConnect(storedKey);
      }
    }

    // Don't automatically disconnect when dialog closes, let the user explicitly disconnect
    return () => {};
  }, [open, wallet, handleConnect, onConnect]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {wallet.connected && showDetails ? "Wallet Details" : "Connect Wallet"}
          </DialogTitle>
          {!wallet.connected && (
            <DialogDescription>
              Connect your Solana wallet to start trading
            </DialogDescription>
          )}
        </DialogHeader>

        {!wallet.connected ? (
          <Command className="rounded-lg overflow-hidden">
            <CommandGroup>
              <CommandItem
                onSelect={handleConnect}
                className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-100"
                disabled={connecting}
              >
                <Wallet className="h-8 w-8 text-purple-600" />
                <div className="flex flex-col">
                  <span className="font-medium">Phantom</span>
                  <span className="text-sm text-gray-500">
                    {connecting ? "Connecting..." : "Connect to Phantom Wallet"}
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50">
                {error}
              </div>
            )}
          </Command>
        ) : (
          <div className="space-y-4 flex flex-col">
            {wallet.publicKey && (
              <>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Wallet Address</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 py-2 text-xs bg-gray-100 rounded font-mono">
                      {wallet.publicKey.toString()}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyAddress(wallet.publicKey!.toString())}
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => window.open(`https://explorer.solana.com/address/${wallet.publicKey}?cluster=devnet`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {showDetails && walletDetails && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Balance</div>
                    <div className="text-2xl font-semibold">
                      {walletDetails.balance.toFixed(4)} SOL
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatUSD(walletDetails.balance)}
                    </div>
                  </div>
                )}
                {showDetails && walletDetails && walletDetails.recentTransactions && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Recent Transactions</div>
                    <div className="space-y-2">
                      {walletDetails.recentTransactions.length > 0 ? (
                        walletDetails.recentTransactions.map((tx, index) => (
                          <a
                            key={tx.signature}
                            href={`https://explorer.solana.com/tx/${tx.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div className="text-sm font-medium">
                                Transaction {index + 1}
                              </div>
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {tx.signature}
                            </div>
                          </a>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-2">
                          No recent transactions
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="w-max"
                  disabled={connecting}
                >
                  Disconnect Wallet
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}