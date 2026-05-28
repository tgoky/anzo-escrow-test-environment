import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PublicKey, Keypair, Connection, Transaction, sendAndConfirmTransaction, SystemProgram } from '@solana/web3.js';
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import * as EscrowClient from '@/lib/contracts/escrow';
import { AnzoEscrow } from '@/types/escrow';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { off } from 'process';

// Define types based on the test file
type Maker = {
  bump: number;
  owner: PublicKey;
  totalOffers: BN;
  data: number[];
};

type Taker = {
  bump: number;
  owner: PublicKey;
  data: number[];
};

type SellOffer = {
  bump: number;
  id: BN;
  maker: PublicKey;
  mint: PublicKey;
  rate: BN;
  vault: PublicKey;
  totalIntents: BN;
  data: number[];
};

type OfferIntent = {
  bump: number;
  id: BN;
  offer: PublicKey;
  taker: PublicKey;
  escrow: PublicKey;
  amount: BN;
  intentType: number;
  status: number; // 0: Created, 1: Confirmed, 2: Canceled
  expiration: BN;
  data: number[];
};

// Create connection to Solana network
const connection = new Connection("http://localhost:8899", {
  commitment: "confirmed",
});

// Token mint address (example)
let tokenMint = new PublicKey("Bm3Lo4x5PrrKb7T7iXUXjqNw3rcZNKfWyNAwXbe2KVYj");

// Demo keypair for maker (in a real app, this would be user's wallet)
const makerSecretKey = new Uint8Array([85,241,225,15,62,18,251,187,237,203,56,127,246,44,193,172,64,48,253,165,220,55,199,14,46,105,237,195,239,196,122,213,2,128,73,115,96,221,11,255,178,86,240,234,142,176,50,9,135,51,183,253,111,237,21,211,162,126,9,197,93,70,162,253]);
const makerKeypair = Keypair.fromSecretKey(makerSecretKey);

const authoritySecretKey = new Uint8Array([143,202,87,145,230,184,50,192,85,179,141,210,151,160,252,11,237,181,189,163,67,115,41,21,224,85,93,106,17,202,174,170,174,37,43,103,182,224,17,111,76,230,188,73,83,203,210,158,59,145,61,211,22,214,54,96,45,126,9,94,184,27,120,55]);
const authorityKeypair = Keypair.fromSecretKey(authoritySecretKey);

export function TestEscrowApp() {
  const { wallets } = useSolanaWallets();
  
  // State variables
  const [program, setProgram] = useState<Program<AnzoEscrow> | null>(null);
  const [makers, setMakers] = useState<{ publicKey: PublicKey, account: Maker }[]>([]);
  const [takers, setTakers] = useState<{ publicKey: PublicKey, account: Taker }[]>([]);
  const [offers, setOffers] = useState<{ publicKey: PublicKey, account: SellOffer }[]>([]);
  const [myIntents, setMyIntents] = useState<{ publicKey: PublicKey, account: OfferIntent }[]>([]);
  
  // Form state variables
  const [makerData, setMakerData] = useState<string>('');
  const [takerData, setTakerData] = useState<string>('');
  const [offerAmount, setOfferAmount] = useState<string>('100');
  const [offerRate, setOfferRate] = useState<string>('500'); // 5% in basis points
  const [offerCurrency, setOfferCurrency] = useState<string>('usd');
  const [intentAmount, setIntentAmount] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Status messages
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Refs to prevent redundant operations
  const isProgramInitialized = useRef(false);
  const makerCreated = useRef(false);
  const takerCreated = useRef(false);
  
  // Memoize wallet address to reduce re-renders
  const walletAddress = useMemo(() => 
    wallets[0] ? new PublicKey(wallets[0].address) : null, 
    [wallets]
  );
  
  // Initialize program connection when wallet connects
  useEffect(() => {
    if (wallets[0] && !isProgramInitialized.current) {
      try {
        const newProgram = EscrowClient.initializeConnection(connection, wallets[0]);
        setProgram(newProgram);
        isProgramInitialized.current = true;
        setStatusMessage('Connected to Anzo Escrow program');
      } catch (error) {
        console.error("Error initializing program:", error);
        setStatusMessage('Failed to connect to Anzo Escrow program');
      }
    }
  }, [wallets]);
  
  // Fetch makers, takers, offers, and intents
  useEffect(() => {
    if (!program || !walletAddress) return;
    
    const fetchData = async () => {
     
        // Fetch all offers
        try {
          const allOffers = await program.account.sellOffer.all();
          if (allOffers.length > 0) {
            // console.log("found some offers: ",allOffers);
            setOffers(allOffers);
          }
        
        } catch (error) {
          console.error("Error fetching offers:", error);
        }      
    };
    
    fetchData();
    
    // Set up periodic refresh
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [program, walletAddress]);


  const fetchMyIntents = async () => {
    if (!program || !walletAddress) {
      console.log("Can't fetch intents - program not initialized or wallet not connected");
      return;
    }
    
    setIsLoading(true);
    try {
      // Fetch both types of intents
      const buyIntents = await program.account.buyIntent.all();
      const sellIntents = await program.account.sellIntent.all();
      
      console.log("Fetched buy intents:", buyIntents.length);
      console.log("Fetched sell intents:", sellIntents.length);
      
      // Filter intents that belong to the current user
      const myBuyIntents = buyIntents.filter((intent: { account: { takerAuthority: { toString: () => string; }; }; }) => 
        intent.account.takerAuthority.toString() === walletAddress.toString()
      );
      
      const mySellIntents = sellIntents.filter((intent: { account: { takerAuthority: { toString: () => string; }; }; }) => 
        intent.account.takerAuthority.toString() === walletAddress.toString()
      );
      
      // Combine and transform the intents for display
      const allIntents = [
        ...myBuyIntents,
        ...mySellIntents
      ];
      
      console.log("My filtered intents:", allIntents);
      setMyIntents(allIntents);
    } catch (error: any) {
      console.error("Error fetching intents:", error);
      setStatusMessage(`Error fetching intents: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize controller (admin function)
  const handleInitializeController = async () => {
    if (!program || !wallets[0]) {
      setStatusMessage('Wallet not connected or program not initialized');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Initializing controller...');
    
    try {
      console.log('Creating initialize controller instruction...');
      const instruction = await EscrowClient.initializeController(program, authorityKeypair.publicKey, authorityKeypair.publicKey);
      console.log('Instruction created:', instruction);
      
      console.log('Creating transaction...');
      let tx = new Transaction().add(instruction);
      console.log('Getting latest blockhash...');
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = authorityKeypair.publicKey;
      
      console.log('Signing transaction...');
      tx.sign(authorityKeypair);
      console.log('Transaction signed');
      
      console.log('Sending transaction...');
      const response = await connection.sendTransaction(tx, [authorityKeypair]);
      console.log("Controller initialized:", response);
      setStatusMessage('Controller successfully initialized!');
    } catch (error: any) {
      console.error("Error initializing controller:", error);
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      }
      setStatusMessage(`Error initializing controller: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize maker account
  const handleInitializeMaker = async () => {
    if (!program || !wallets[0] || !walletAddress) {
      setStatusMessage('Wallet not connected or program not initialized');
      return;
    }
    
    if (makerCreated.current) {
      setStatusMessage('Maker account already exists for this wallet');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Creating maker account...');
    
    try {
      // Convert makerData string to byte array (max 256 bytes)
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(makerData || 'Default Maker');
      
      // Pad or truncate to 256 bytes
      const paddedData = new Uint8Array(256);
      paddedData.set(dataBytes.slice(0, 256));
      
      // Derive PDAs
      const [controllerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("CONTROLLER")], 
        program.programId
      );
      
      const [makerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("MAKER"), walletAddress.toBuffer()], 
        program.programId
      );
      
      // Build the transaction directly using program methods
      const tx = await program.methods
        .initializeMaker(Array.from(paddedData))
        .accounts({
          authority: authorityKeypair.publicKey,
          payer: walletAddress,
          controller: controllerPda,
          makerAuthority: walletAddress,
          maker: makerPda,
          systemProgram: SystemProgram.programId,  // Use SystemProgram.programId, not program.programId
        })
        .transaction();
      
      // Set recent blockhash and fee payer
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = walletAddress;
      
      // Partially sign with admin authority
      tx.partialSign(authorityKeypair);
      
      // Send transaction through the wallet adapter for user to sign as both payer and makerAuthority
      const signature = await wallets[0].sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Maker initialized:", signature);
      makerCreated.current = true;
      setStatusMessage('Maker account successfully created!');
    } catch (error: any) {
      console.error("Error initializing maker:", error);
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      }
      setStatusMessage(`Error creating maker account: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initialize taker account
  const handleInitializeTaker = async () => {
    if (!program || !wallets[0] || !walletAddress) {
      setStatusMessage('Wallet not connected or program not initialized');
      return;
    }
    
    if (takerCreated.current) {
      setStatusMessage('Taker account already exists for this wallet');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Creating taker account...');
    
    try {
      // Convert takerData string to byte array (max 256 bytes)
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(takerData || 'Default Taker');
      
      // Pad or truncate to 256 bytes
      const paddedData = new Uint8Array(256);
      paddedData.set(dataBytes.slice(0, 256));
      
      // Derive PDAs
      const [controllerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("CONTROLLER")], 
        program.programId
      );
      
      const [takerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("TAKER"), walletAddress.toBuffer()], 
        program.programId
      );
      
      // Build the transaction directly using program methods
      const tx = await program.methods
        .initializeTaker(Array.from(paddedData))
        .accounts({
          authority: authorityKeypair.publicKey,
          payer: walletAddress,
          controller: controllerPda,
          takerAuthority: walletAddress,
          taker: takerPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      
      // Set recent blockhash and fee payer
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = walletAddress;
      
      // Partially sign with admin authority
      tx.partialSign(authorityKeypair);
      
      // Send transaction through the wallet adapter for user to sign as both payer and takerAuthority
      const signature = await wallets[0].sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Taker initialized:", signature);
      takerCreated.current = true;
      setStatusMessage('Taker account successfully created!');
    } catch (error: any) {
      console.error("Error initializing taker:", error);
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      }
      setStatusMessage(`Error creating taker account: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create sell offer
  const handleCreateSellOffer = async () => {
    if (!program || !wallets[0] || !walletAddress || !makerCreated.current) {
      setStatusMessage('Wallet not connected, program not initialized, or maker account not created');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Creating sell offer...');
    
    try {
      // Parse amounts and rates
      const amount = parseFloat(offerAmount);
      const rate = parseFloat(offerRate);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }
      
      if (isNaN(rate) || rate <= 0) {
        throw new Error('Invalid rate');
      }
      
      // Check if token mint exists first
      try {
        const mintInfo = await connection.getAccountInfo(tokenMint);
        if (!mintInfo) {
          setStatusMessage('Token mint does not exist. Creating a new one...');
          // Create a new token mint
          tokenMint = await createMint(
            connection,
            authorityKeypair, // The payer
            authorityKeypair.publicKey, // Mint authority
            null, // Freeze authority (none)
            6 // Decimals
          );
          setStatusMessage(`New token mint created: ${tokenMint.toString()}`);
        }
      } catch (error) {
        console.error("Error checking token mint:", error);
        setStatusMessage('Creating a new token mint...');
        // Create a new token mint
        tokenMint = await createMint(
          connection,
          authorityKeypair, // The payer
          authorityKeypair.publicKey, // Mint authority
          null, // Freeze authority (none)
          6 // Decimals
        );
        setStatusMessage(`New token mint created: ${tokenMint.toString()}`);
      }
      
      // Create or get the user's token account
      let userTokenAccount;
      try {
        const tokenAccountAddress = await getAssociatedTokenAddress(
          tokenMint,
          walletAddress
        );
        
        const tokenAccountInfo = await connection.getAccountInfo(tokenAccountAddress);
        if (!tokenAccountInfo) {
          setStatusMessage('Creating your token account...');
          userTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            authorityKeypair, // The payer
            tokenMint,
            walletAddress
          );
          setStatusMessage('Token account created');
        } else {
          userTokenAccount = { address: tokenAccountAddress };
        }
      } catch (error) {
        console.error("Error getting token account:", error);
        setStatusMessage('Creating your token account...');
        userTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          authorityKeypair, // The payer
          tokenMint,
          walletAddress
        );
        setStatusMessage('Token account created');
      }
      
      // Mint tokens to the user's account
      try {
        const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount.address);
        const currentBalance = tokenBalance.value.uiAmount || 0;
        
        if (currentBalance < amount) {
          setStatusMessage(`Minting ${amount} tokens to your account...`);
          await mintTo(
            connection,
            authorityKeypair, // The payer
            tokenMint,
            userTokenAccount.address,
            authorityKeypair.publicKey, // The mint authority
            Math.ceil(amount * Math.pow(10, 6)) // Convert to raw amount
          );
          setStatusMessage('Tokens minted successfully');
        }
      } catch (error) {
        console.error("Error minting tokens:", error);
        setStatusMessage('Minting tokens to your account...');
        await mintTo(
          connection,
          authorityKeypair, // The payer
          tokenMint,
          userTokenAccount.address,
          authorityKeypair.publicKey, // The mint authority
          Math.ceil(amount * Math.pow(10, 6)) // Convert to raw amount
        );
        setStatusMessage('Tokens minted successfully');
      }
      
      // Convert offerData string to byte array (max 256 bytes)
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(`${offerCurrency.toUpperCase()} offer at ${rate} bps`);
      
      // Pad or truncate to 256 bytes
      const paddedData = new Uint8Array(256);
      paddedData.set(dataBytes.slice(0, 256));
      
      // Get the maker account to find the total_offers for the seed
      const [makerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("MAKER"), walletAddress.toBuffer()], 
        program.programId
      );
  
      // Fetch the maker account to get total_offers
      const makerAccount = await program.account.maker.fetch(makerPda);
      const totalOffers = makerAccount.totalOffers;
      
      // Create the buffer for total_offers (u64)
      const totalOffersBuffer = Buffer.alloc(8);
      totalOffersBuffer.writeBigUInt64LE(BigInt(totalOffers));
      
      // Derive the offer PDA
      const [offerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("SELL_OFFER"), walletAddress.toBuffer(), totalOffersBuffer],
        program.programId
      );
      
      // Derive the vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("VAULT"), offerPda.toBuffer()],
        program.programId
      );
      
      // Calculate the amount to transfer in the smallest units
      const decimalAmount = Math.ceil(amount * Math.pow(10, 6)); // Ensuring we have an integer
      
      // Build the transaction using program methods
      const tx = await program.methods
        .initializeSellOffer(Array.from(paddedData), new BN(decimalAmount))
        .accounts({
          makerAuthority: walletAddress,
          payer: walletAddress,
          maker: makerPda,
          offer: offerPda,
          mint: tokenMint,
          makerTokenAccount: userTokenAccount.address,
          vaultAta: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      
      // Set recent blockhash and fee payer
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = walletAddress;
      
      // Send transaction through the wallet adapter for user to sign
      const signature = await wallets[0].sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Sell offer created:", signature);
      setStatusMessage('Sell offer successfully created!');
      
      // Clear form fields
      setOfferAmount('100');
      setOfferRate('500');
    } catch (error: any) {
      console.error("Error creating sell offer:", error);
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      }
      setStatusMessage(`Error creating sell offer: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create intent to purchase
  const handleCreateIntent = async () => {
    if (!program) {
      setStatusMessage('Program not initialized');
      return;
    }
    
    if (!wallets[0] || !walletAddress) {
      setStatusMessage('Wallet not connected');
      return;
    }
    
    if (!takerCreated.current) {
      setStatusMessage('Taker account not created');
      return;
    }
    
    if (!selectedOffer) {
      setStatusMessage('No offer selected');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Creating intent for sell offer...');
    
    try {
      // Parse amount
      const amount = parseFloat(intentAmount);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }
      
      // Find the selected offer
      const offerPublicKey = new PublicKey(selectedOffer);
      const selectedOfferData = offers.find(
        offer => offer.publicKey.toString() === selectedOffer
      );
      
      if (!selectedOfferData) {
        throw new Error('Selected offer not found');
      }
      
      // Get the maker authority from the offer
      const makerAuthority = selectedOfferData.account.makerAuthority;
      
      // Get offer ID from the offer
      const offerId = selectedOfferData.account.id;
      
      // Fetch the offer account to get total_intents
      const offerAccount = await program.account.sellOffer.fetch(offerPublicKey);
      const totalIntents = offerAccount.totalIntents;
      
      // Create buffer for total_intents (u64)
      const totalIntentsBuffer = Buffer.alloc(8);
      totalIntentsBuffer.writeBigUInt64LE(BigInt(totalIntents.toNumber()));
      
      // Derive the taker PDA
      const [takerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("TAKER"), walletAddress.toBuffer()],
        program.programId
      );
      
      // Derive the intent PDA
      const [intentPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("SELL_INTENT"),
          offerPublicKey.toBuffer(),
          totalIntentsBuffer
        ],
        program.programId
      );
      
      // Derive the escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ESCROW"), intentPda.toBuffer()],
        program.programId
      );
      
      // Derive the vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("VAULT"), offerPublicKey.toBuffer()],
        program.programId
      );
      
      // Get the mint from the offer
      const mint = selectedOfferData.account.mint;
      
      // Find or create the receiver token account
      let receiverAta;
      try {
        receiverAta = await getOrCreateAssociatedTokenAccount(
          connection,
          authorityKeypair, // as payer
          mint, 
          walletAddress
        );
      } catch (error) {
        console.error("Error getting receiver token account:", error);
        // Try just getting the address
        receiverAta = { 
          address: await getAssociatedTokenAddress(mint, walletAddress) 
        };
      }
      
      // Convert intentData string to byte array (max 256 bytes)
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(`Intent to buy ${amount} tokens`);
      
      // Pad or truncate to 256 bytes
      const paddedData = new Uint8Array(256);
      paddedData.set(dataBytes.slice(0, 256));
      
      // Calculate the amount in raw units
      const decimalAmount = Math.ceil(amount * Math.pow(10, 6)); // Assuming 6 decimals
      
      // Build the transaction directly using program methods
      const tx = await program.methods
        .initializeSellIntent(
          offerId,
          new BN(decimalAmount),
          Array.from(paddedData)
        )
        .accounts({
          takerAuthority: walletAddress,
          payer: walletAddress,
          taker: takerPda,
          makerAuthority: makerAuthority,
          offer: offerPublicKey,
          intent: intentPda,
          mint: mint,
          vaultAta: vaultPda,
          escrowAta: escrowPda,
          receiverAta: receiverAta.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      
      // Set recent blockhash and fee payer
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = walletAddress;
      try {
        const signature = await wallets[0].sendTransaction(tx, connection);
        
        // Wait for confirmation with a timeout
        const confirmation = await Promise.race([
          connection.confirmTransaction(signature, 'confirmed'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000))
        ]);
        
        console.log("Intent created:", signature);
        setStatusMessage('Purchase intent successfully created!');
        fetchMyIntents();
      
        // Clear form fields
        setIntentAmount('');
        setSelectedOffer(null);
      } catch (txError: any) {
        console.error("Transaction error:", txError);
        if (txError.logs) {
          // Extract the most relevant error from logs
          const errorLog = txError.logs.find(log => log.includes("Error"));
          setStatusMessage(`Transaction failed: ${errorLog || txError.message || txError}`);
        } else {
          setStatusMessage(`Transaction failed: ${txError.message || txError}`);
        }
      }
    } catch (error: any) {
      console.error("Error creating intent:", error);
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      }
      setStatusMessage(`Error creating intent: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };
  // Confirm intent (as maker)
  // const handleConfirmIntent = async (intentPublicKey: string, offer: PublicKey, takerOwner: PublicKey) => {
  //   if (!program || !wallets[0] || !walletAddress) {
  //     setStatusMessage('Wallet not connected or program not initialized');
  //     return;
  //   }
    
  //   setIsLoading(true);
  //   setStatusMessage('Confirming intent...');
    
  //   try {
  //     const intentPubkey = new PublicKey(intentPublicKey);
      
  //     // Find the intent to get the ID
  //     const intent = myIntents.find(i => i.publicKey.toString() === intentPublicKey);
  //     if (!intent) {
  //       throw new Error('Intent not found');
  //     }

  //     const offerAccount = await program.account.sellOffer.fetch(offer);

  //     const [controllerPda] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("CONTROLLER")],
  //       program.programId
  //     );
      
  //     const intentId = intent.account.id;
  //     const offerId = offerAccount.id;
      
  //     const [escrowPda] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("ESCROW"), intentPubkey.toBuffer()],
  //       program.programId
  //     );
  //     const intentData = await program.account.offerIntent.fetch(intentPubkey);
  //     const receiverAta = intentData.escrow;

  //     const tx = await program.methods
  //     .confirmSellOfferIntent(
  //       intentId,
  //       offerId
  //     )
  //     .accounts({
  //       authority: walletAddress,
  //       payer: walletAddress,
  //       controller: controllerPda,
  //       makerAuthority: walletAddress, // The wallet is the maker authority
  //       offer: offer,
  //       intent: intentPubkey,
  //       escrowAta: escrowPda,
  //       receiverAta: new PublicKey(receiverAta),
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .transaction();

  //     tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
  //     tx.feePayer = walletAddress;

  //     const signature = await wallets[0].sendTransaction(tx, connection);
  //     await connection.confirmTransaction(signature, 'confirmed');
      
  //     console.log("Intent confirmed:", signature);
  //   setStatusMessage('Intent successfully confirmed!');
  // } catch (error: any) {
  //   console.error("Error confirming intent:", error);
  //   if (error.logs) {
  //     console.error("Transaction logs:", error.logs);
  //   }
  //   setStatusMessage(`Error confirming intent: ${error.message || error}`);
  // } finally {
  //   setIsLoading(false);
  // }
  // };
  
  const handleConfirmIntent = async (intentPublicKey: string, offer: PublicKey, takerOwner: PublicKey) => {
    if (!program || !wallets[0] || !walletAddress) {
      setStatusMessage('Wallet not connected or program not initialized');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Confirming intent...');
    
    try {
      const intentPubkey = new PublicKey(intentPublicKey);
      
      // Find the intent in the local state to get the ID
      const intent = myIntents.find(i => i.publicKey.toString() === intentPublicKey);
      if (!intent) {
        throw new Error('Intent not found in local state');
      }
  
      // Fetch the offer account to get its ID
      const offerAccount = await program.account.sellOffer.fetch(offer);
  
      // Derive the controller PDA
      const [controllerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("CONTROLLER")],
        program.programId
      );
      
      const intentId = intent.account.id;
      const offerId = offerAccount.id;
      
      // Derive the escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ESCROW"), intentPubkey.toBuffer()],
        program.programId
      );
      
      // Instead of fetching generic "offerIntent", fetch the specific "sellIntent"
      const intentData = await program.account.sellIntent.fetch(intentPubkey);
      
      // Use receiver_ata field from the intent account
      const receiverAta = intentData.receiverAta;
  
      console.log("Intent data:", intentData);
      console.log("Escrow ATA:", escrowPda.toString());
      console.log("Receiver ATA:", receiverAta.toString());
  
      const tx = await program.methods
        .confirmSellIntent( // Make sure this matches your program's instruction name
          intentId,
          offerId
        )
        .accounts({
          authority: walletAddress,
          payer: walletAddress,
          controller: controllerPda,
          makerAuthority: walletAddress, // The wallet is the maker authority
          offer: offer,
          intent: intentPubkey,
          escrowAta: escrowPda,
          receiverAta: receiverAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
  
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = walletAddress;
  
      const signature = await wallets[0].sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Intent confirmed:", signature);
      setStatusMessage('Intent successfully confirmed!');
      
      // Refresh the intents list after confirming
      fetchMyIntents();
    } catch (error: any) {
      console.error("Error confirming intent:", error);
      if (error.logs) {
        console.error("Transaction logs:", error.logs);
      }
      setStatusMessage(`Error confirming intent: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel intent (as taker)
  const handleCancelIntent = async (intentPublicKey: string, offer: PublicKey) => {
    if (!program || !wallets[0] || !walletAddress) {
      setStatusMessage('Wallet not connected or program not initialized');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Cancelling intent...');
    
    try {
      const intentPubkey = new PublicKey(intentPublicKey);
      
      // Find the intent to get the ID
      const intent = myIntents.find(i => i.publicKey.toString() === intentPublicKey);
      if (!intent) {
        throw new Error('Intent not found');
      }
      
      const intentId = intent.account.id.toNumber();
      
      const instruction = await EscrowClient.cancelSellOfferIntent(
        program,
        authorityKeypair.publicKey,
        intentId,
        offer,
        walletAddress
      );
      
      let tx = new Transaction().add(instruction);
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = walletAddress;
      
      const response = await wallets[0].sendTransaction(tx, connection);
      console.log("Intent cancelled:", response);
      setStatusMessage('Intent successfully cancelled!');
    } catch (error) {
      console.error("Error cancelling intent:", error);
      setStatusMessage(`Error cancelling intent: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Withdraw tokens from sell offer
  const handleWithdrawSellOffer = async (offerPublicKey: string, amount: string) => {
    if (!program || !wallets[0] || !walletAddress) {
      setStatusMessage('Wallet not connected or program not initialized');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Withdrawing tokens...');
    
    try {
      const offerPubkey = new PublicKey(offerPublicKey);
      
      // Find the offer to get the ID
      const offer = offers.find(o => o.publicKey.toString() === offerPublicKey);
      if (!offer) {
        throw new Error('Offer not found');
      }
      
      const offerId = offer.account.id.toNumber();
      const withdrawAmount = parseFloat(amount);
      
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        throw new Error('Invalid withdrawal amount');
      }
      
      const instruction = await EscrowClient.withdrawSellOffer(
        program,
        makerKeypair.publicKey,
        offerId,
        withdrawAmount
      );
      
      let tx = new Transaction().add(instruction);
      tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      tx.feePayer = walletAddress;
      
      const response = await wallets[0].sendTransaction(tx, connection);
      console.log("Tokens withdrawn:", response);
      setStatusMessage('Tokens successfully withdrawn!');
    } catch (error) {
      console.error("Error withdrawing tokens:", error);
      setStatusMessage(`Error withdrawing tokens: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to decode data bytes to string
  const decodeData = (data: number[]): string => {
    const bytes = new Uint8Array(data);
    const decoder = new TextDecoder();
    const nullTerminator = bytes.indexOf(0);
    const validBytes = nullTerminator >= 0 ? bytes.slice(0, nullTerminator) : bytes;
    return decoder.decode(validBytes);
  };

  // Helper function to display shortened public key
  const shortenPubkey = (pubkey: string): string => {
    return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
  };

  // Helper function to get status text
  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return 'Created';
      case 1: return 'Confirmed';
      case 2: return 'Cancelled';
      default: return 'Unknown';
    }
  };
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Anzo Escrow dApp</h1>
      
      {/* Status message */}
      {statusMessage && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
          {statusMessage}
        </div>
      )}
      
      {/* Wallet connection */}
      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
        {wallets[0] ? (
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-green-100 text-green-700 rounded">
              Connected: {shortenPubkey(wallets[0].address)}
            </div>
          </div>
        ) : (
          <div className="p-2 bg-yellow-100 text-yellow-700 rounded">
            Please connect your wallet to use this app
          </div>
        )}
      </div>
      
      {wallets[0] && (
        <>
          {/* Initialize Controller (Admin) */}
          <div className="mb-8 p-4 border rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Initialize Controller (Admin)</h2>
            <button 
              onClick={handleInitializeController}
              disabled={isLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              Initialize Controller
            </button>
          </div>
          
          {/* User Accounts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Create Maker Account */}
            <div className="p-4 border rounded shadow">
              <h2 className="text-xl font-semibold mb-4">Create Maker Account</h2>
              <div className="mb-4">
                <label className="block mb-1">Profile Data (optional)</label>
                <input
                  type="text"
                  value={makerData}
                  onChange={(e) => setMakerData(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Your maker profile info"
                />
              </div>
              <button 
                onClick={handleInitializeMaker}
                disabled={isLoading || makerCreated.current}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {makerCreated.current ? 'Maker Account Created' : 'Create Maker Account'}
              </button>
            </div>
            
            {/* Create Taker Account */}
            <div className="p-4 border rounded shadow">
              <h2 className="text-xl font-semibold mb-4">Create Taker Account</h2>
              <div className="mb-4">
                <label className="block mb-1">Profile Data (optional)</label>
                <input
                  type="text"
                  value={takerData}
                  onChange={(e) => setTakerData(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Your taker profile info"
                />
              </div>
              <button 
                onClick={handleInitializeTaker}
                disabled={isLoading || takerCreated.current}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {takerCreated.current ? 'Taker Account Created' : 'Create Taker Account'}
              </button>
            </div>
          </div>
          
          {/* Create Sell Offer */}
          <div className="mb-8 p-4 border rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Create Sell Offer</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block mb-1">Amount</label>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Amount of tokens"
                />
              </div>
              
              <div>
                <label className="block mb-1">Rate (basis points)</label>
                <input
                  type="number"
                  value={offerRate}
                  onChange={(e) => setOfferRate(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Rate in basis points (100 = 1%)"
                />
              </div>
              
              <div>
                <label className="block mb-1">Currency</label>
                <select
                  value={offerCurrency}
                  onChange={(e) => setOfferCurrency(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                  <option value="cad">CAD</option>
                  <option value="aud">AUD</option>
                </select>
              </div>
            </div>
            <button 
              onClick={handleCreateSellOffer}
              disabled={isLoading || !makerCreated.current}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Create Sell Offer
            </button>
            {!makerCreated.current && (
              <p className="mt-2 text-red-500 text-sm">You need to create a maker account first</p>
            )}
          </div>
          
          {/* Available Offers */}
          <div className="mb-8 p-4 border rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Available Sell Offers</h2>
            {offers.length === 0 ? (
              <p className="text-gray-500 italic">No offers available</p>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div key={offer.publicKey.toString()} className="p-4 border rounded bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                      <div>
                        <span className="text-gray-500 text-sm">Offer ID:</span>
                        <p>{shortenPubkey(offer.publicKey.toString())}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Maker:</span>
                        <p>{shortenPubkey(offer.account.makerAuthority.toString())}</p>
                      </div>
                      <div>
                      <span className="text-gray-500 text-sm">Mint:</span>
                      <p>{offer.account && offer.account.mint ? shortenPubkey(offer.account.mint.toString()) : 'N/A'}</p>
                    </div>
                    <div>
                    <span className="text-gray-500 text-sm">Total Intents:</span>
                    <p>{offer.account && offer.account.totalIntents ? offer.account.totalIntents.toString() : '0'}</p>
                  </div>
                    </div>
                    
                    {/* Purchase Intent Form */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
  <div className="flex flex-wrap gap-2 items-center">
    <input
      type="number"
      value={selectedOffer === offer.publicKey.toString() ? intentAmount : ''}
      onChange={(e) => {
        setSelectedOffer(offer.publicKey.toString());
        setIntentAmount(e.target.value);
      }}
      className="p-2 border rounded w-32"
      placeholder="Amount"
    />
    <button 
      onClick={() => handleCreateIntent()}
      disabled={isLoading || !takerCreated.current || selectedOffer !== offer.publicKey.toString() || !intentAmount}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
    >
      Create Intent
    </button>
    {offer.account && offer.account.makerAuthority && walletAddress && 
      offer.account.makerAuthority.toString() === walletAddress.toString() && (
      <div className="flex items-center ml-auto">
        <input
          type="number"
          className="p-2 border rounded w-32 mr-2"
          placeholder="Withdraw amount"
          id={`withdraw-${offer.publicKey.toString()}`}
        />
        <button 
          onClick={() => {
            const input = document.getElementById(`withdraw-${offer.publicKey.toString()}`) as HTMLInputElement;
            const amount = input.value;
            handleWithdrawSellOffer(offer.publicKey.toString(), amount);
          }}
          disabled={isLoading || !offer.account || !offer.account.makerAuthority || !walletAddress || 
                   offer.account.makerAuthority.toString() !== walletAddress.toString()}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:bg-gray-400"
        >
          Withdraw Tokens
        </button>
      </div>
    )}
  </div>
  {!takerCreated.current && (
    <p className="mt-2 text-red-500 text-sm">You need to create a taker account first</p>
  )}
</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* My Intents (as Taker) */}
          <div className="mb-8 p-4 border rounded shadow">
            <h2 className="text-xl font-semibold mb-4">My Purchase Intents</h2>
            {!myIntents || myIntents.length === 0 ? (
              <p className="text-gray-500 italic">You have no active purchase intents</p>
            ) : (
              <div className="space-y-4">
                {myIntents.map((intent) => (
                  <div key={intent.publicKey.toString()} className="p-4 border rounded bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                      <div>
                        <span className="text-gray-500 text-sm">Intent ID:</span>
                        <p>{shortenPubkey(intent.publicKey.toString())}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Offer:</span>
                        <p>{shortenPubkey(intent.account.offer.toString())}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Amount:</span>
                        {/* <p>{intent.account.amount}</p> */}
                      </div>
                      <div>
                        <span className="text-gray-500 text-sm">Status:</span>
                        <p className={
                          intent.account.status === 0 ? "text-blue-600" : 
                          intent.account.status === 1 ? "text-green-600" : 
                          "text-red-600"
                        }>
                          {getStatusText(intent.account.status)}
                        </p>
                      </div>
                    </div>
                    
                    {intent.account.status === 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end space-x-3">
                        <button
                          onClick={() => handleCancelIntent(intent.publicKey.toString(), intent.account.offer)}
                          disabled={isLoading}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                        >
                          Cancel Intent
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Intents to Confirm (as Maker) */}
          <div className="p-4 border rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Intents to Confirm (As Maker)</h2>
            {myIntents.length === 0 ? (
              <p className="text-gray-500 italic">No intents available to confirm</p>
            ) : (
              <div className="space-y-4">
                {offers
                  .filter(offer => {
                    return offer?.account?.makerAuthority?.toString() === walletAddress?.toString();
                  })
                  .map(offer => {
                    // For each offer where I'm the maker, find all intents for this offer
                    const relevantIntents = myIntents.filter(
                      intent =>  intent?.account?.offer?.toString() === offer?.publicKey?.toString() && 
                      intent?.account?.status === 0 // Only show pending intents
                    );
                    
                    if (relevantIntents.length === 0) {
                      return null;
                    }
                    
                    return (
                      <div key={offer.publicKey.toString()} className="p-4 border rounded bg-gray-50">
                        <h3 className="font-medium mb-3">
                        Offer: {offer?.publicKey ? shortenPubkey(offer.publicKey.toString()) : 'Unknown'}
                        </h3>
                        
                        <div className="space-y-3">
                          {relevantIntents.map((intent, intentIndex) => (
                            <div key={intent.publicKey.toString() ?? `intent-${intentIndex}`} className="p-3 border rounded bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                                <div>
                                  <span className="text-gray-500 text-sm">Intent ID:</span>
                                  <p>{intent?.publicKey ? shortenPubkey(intent.publicKey.toString()) : 'Unknown'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-sm">Taker:</span>
                                  <p>{intent?.account?.takerAuthority ? shortenPubkey(intent.account.takerAuthority.toString()) : 'Unknown'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-sm">Amount:</span>
                                  <p>{intent?.account?.amount?.toString() ?? 'Unknown'}</p>
                                </div>
                              </div>
                              
                              <div className="mt-2 flex justify-end">
                              {intent?.publicKey && offer?.publicKey && intent?.account?.takerAuthority && (
                                <button
                                  onClick={() => handleConfirmIntent(
                                    intent.publicKey.toString(), 
                                    offer.publicKey, 
                                    intent.account.taker
                                  )}
                                  disabled={isLoading}
                                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                                >
                                  Confirm Intent
                                </button>
                              )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <p className="text-lg font-semibold">Processing transaction...</p>
            <div className="mt-4 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
}
