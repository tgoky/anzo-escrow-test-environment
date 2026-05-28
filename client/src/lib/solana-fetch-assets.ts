import axios from 'axios';// Fetching Solana wallet assets using web3.js and the Token Extension

import { Connection, PublicKey } from '@solana/web3.js';
import { TokenListProvider } from '@solana/spl-token-registry';
import { TOKEN_PROGRAM_ID, getAccount, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';


export default async function getWalletAssets(walletAddress) {
  try {
    // Connect to Solana network (mainnet-beta)
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=b3b33fa1-75f7-47e3-aa4e-901232057dd2', 'confirmed');
    
    // Parse the wallet address to a PublicKey
    const publicKey = new PublicKey(walletAddress);
    
    // Fetch all token accounts owned by the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    console.log(`Found ${tokenAccounts.value.length} token accounts for wallet ${walletAddress}`);
    
    // Load token metadata
    const tokenListProvider = await new TokenListProvider().resolve();
    const tokenList = tokenListProvider.filterByClusterSlug('mainnet-beta').getList();
    
    // Process each token account to get balance and metadata
    const assets = tokenAccounts.value.map(tokenAccount => {
      const accountData = tokenAccount.account.data.parsed.info;
      const mintAddress = accountData.mint;
      const balance = accountData.tokenAmount.uiAmount;
      
      // Skip empty balances
      if (balance === 0) return null;
      
      // Find token metadata
      const tokenInfo = tokenList.find(token => token.address === mintAddress);
      
      return {
        mint: mintAddress,
        amount: balance,
        name: tokenInfo?.name || 'Unknown Token',
        symbol: tokenInfo?.symbol || 'UNKNOWN',
        decimals: accountData.tokenAmount.decimals,
        logo: tokenInfo?.logoURI || null,
        price: 0,
        usdValue: 0
      };
    }).filter(Boolean); // Remove null entries (zero balances)
    
    // Fetch SOL balance separately
    const solBalance = await connection.getBalance(publicKey);
    const solAsset = {
      mint: 'SOL',
      amount: solBalance / 1000000000, // Convert lamports to SOL
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      price: 0,
      usdValue: 0
    };
    
    // Combine SOL and other token assets
    return [solAsset, ...assets];
  } catch (error) {
    console.error('Error fetching wallet assets:', error);
    return []
  }
}