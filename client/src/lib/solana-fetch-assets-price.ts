import axios from 'axios';// Fetching Solana wallet assets using web3.js and the Token Extension

import { Connection, PublicKey } from '@solana/web3.js';
import { TokenListProvider } from '@solana/spl-token-registry';
import { TOKEN_PROGRAM_ID, getAccount, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

// Helper function to get token price from Jupiter API
async function getTokenPriceFromJupiter(mintAddress: string) {
  try {
    const response = await axios.get(`https://price.jup.ag/v4/price?ids=${mintAddress}`);
    if (response.data && response.data.data && response.data.data[mintAddress]) {
      return response.data.data[mintAddress].price;
    }
    return 0;
  } catch (error) {
    console.error(`Error fetching price from Jupiter for ${mintAddress}:`, error.message);
    return 0;
  }
}

export default async function getWalletAssets(walletAddress: string): Promise<Array<{
      mint: string;
      name?: string;
      symbol?: string;
      logo?: string;
      amount: number;
      price: number;
      usdValue: number;
    }>> {
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

    // Fetch price data from CoinGecko
    // First, we'll get SOL price in USD
    const priceResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'solana',
        vs_currencies: 'usd'
      }
    });
    const solPriceUsd = priceResponse.data.solana.usd;
    console.log(`Current SOL price: ${solPriceUsd}`);
    
    // Load token metadata
    const tokenListProvider = await new TokenListProvider().resolve();
    const tokenList = tokenListProvider.filterByClusterSlug('mainnet-beta').getList();
    
    // Prepare a list of token symbols to get prices for
    const tokenSymbols = tokenAccounts.value
      .map(account => {
        const mintAddress = account.account.data.parsed.info.mint;
        const tokenInfo = tokenList.find(token => token.address === mintAddress);
        return tokenInfo?.symbol?.toLowerCase();
      })
      .filter(Boolean);
    
    // Add SOL to the list
    tokenSymbols.push('sol');
    
    // Get prices for all tokens at once (if possible)
    const allPricesResponse = {};
    // await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    //   params: {
    //     ids: tokenSymbols.join(','),
    //     vs_currencies: 'usd'
    //   }
    // });
    
    // Process each token account to get balance and metadata
    const assets = await Promise.all(tokenAccounts.value.map(async tokenAccount => {
      const accountData = tokenAccount.account.data.parsed.info;
      const mintAddress = accountData.mint;
      const balance = accountData.tokenAmount.uiAmount;
      
      // Skip empty balances
      if (balance === 0) return null;
      
      // Find token metadata
      const tokenInfo = tokenList.find(token => token.address === mintAddress);
      const symbol = tokenInfo?.symbol || 'UNKNOWN';
      
      // Get token price from our fetched data or try specific lookups
      let priceUsd = 0;
      try {
        // Try CoinGecko first
        if (allPricesResponse.data[symbol.toLowerCase()]) {
          priceUsd = allPricesResponse.data[symbol.toLowerCase()].usd;
        } else if (tokenInfo?.extensions?.coingeckoId) {
          // Try to get price using CoinGecko ID if available
          // const specificPriceResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          //   params: {
          //     ids: tokenInfo.extensions.coingeckoId,
          //     vs_currencies: 'usd'
          //   }
          // });
          // priceUsd = specificPriceResponse.data[tokenInfo.extensions.coingeckoId].usd;
        }
        
        // If price is still 0, try Jupiter API as a fallback
        if (priceUsd === 0) {
          priceUsd = await getTokenPriceFromJupiter(mintAddress);
        }
      } catch (error) {
        console.log(`Could not get price for ${symbol} (${mintAddress}): ${error.message}`);
        // Final fallback - try Jupiter if we failed with CoinGecko
        try {
          priceUsd = await getTokenPriceFromJupiter(mintAddress);
        } catch (jupiterError) {
          console.log(`Jupiter price lookup also failed: ${jupiterError.message}`);
        }
      }
      
      // Calculate USD value
      const usdValue = balance * priceUsd;
      
      return {
        mint: mintAddress,
        name: tokenInfo?.name || 'Unknown Token',
        symbol,
        logo: tokenInfo?.logoURI || null,
        amount: balance,
        price: priceUsd,
        usdValue,
        decimals: accountData.tokenAmount.decimals,
      };
    }));
    
    // Filter out null entries (zero balances)
    const filteredAssets = assets.filter(Boolean);
    
    // Fetch SOL balance separately
    const solBalance = await connection.getBalance(publicKey);
    const solBalanceInSol = solBalance / 1000000000; // Convert lamports to SOL
    const solAsset = {
      mint: 'SOL',
      name: 'Solana',
      symbol: 'SOL',
      logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      amount: solBalanceInSol,
      price: solPriceUsd,
      usdValue: solBalanceInSol * solPriceUsd,
      decimals: 9,
    };
    
    // Combine SOL and other token assets
    return [solAsset, ...filteredAssets];
  } catch (error) {
    console.error('Error fetching wallet assets:', error);
    throw error;
  }
}