import { Program, AnchorProvider, setProvider, BN, Idl } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY, 
  Keypair, 
  Connection,
  TransactionInstruction
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress 
} from "@solana/spl-token";

import { AnzoEscrow } from '@/types/escrow';
import AnzoEscrowIDL from "@/types/anzo_escrow";

// Initialize the program connection
export function initializeConnection(
  connection: Connection,
  wallet: any
): Program<AnzoEscrow> {
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );
    
  const program = new Program(AnzoEscrowIDL as unknown as Idl, provider);

  return program;
}

// Initialize the controller (admin)
export async function initializeController(
  program: Program<AnzoEscrow>,
  authority: PublicKey,
  payer: PublicKey
): Promise<TransactionInstruction> {
  return program.methods
    .initializeController()
    .accounts({
      authority: authority,
      payer: payer,
      controller: findControllerPDA(program.programId),
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// Initialize a maker account
export async function initializeMaker(
  program: Program<AnzoEscrow>,
  authority: PublicKey,
  payer: PublicKey,
  owner: PublicKey,
  data: number[]
): Promise<TransactionInstruction> {
  const [makerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("MAKER"), owner.toBuffer()],
    program.programId
  );

  return program.methods
    .initializeMaker(Array.from(data))
    .accounts({
      authority,
      payer,
      owner,
      controller: findControllerPDA(program.programId),
      maker: makerPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// Initialize a taker account
export async function initializeTaker(
  program: Program<AnzoEscrow>,
  authority: PublicKey,
  owner: PublicKey,
  data: number[]
): Promise<TransactionInstruction> {
  const [takerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("TAKER"), owner.toBuffer()],
    program.programId
  );

  return program.methods
    .initializeTaker(Array.from(data))
    .accounts({
      authority,
      owner,
      payer: owner,
      controller: findControllerPDA(program.programId),
      taker: takerPda,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// Initialize a sell offer
export async function initializeSellOffer(
  program: Program<AnzoEscrow>,
  payer: PublicKey,
  makerOwner: PublicKey,
  tokenMint: PublicKey,
  rate: number | BN,
  data: number[]
): Promise<TransactionInstruction> {
  const [makerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("MAKER"), makerOwner.toBuffer()],
    program.programId
  );

  const maker = await program.account.maker.fetch(makerPda);
  const [offerPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("MAKER_OFFER"), 
      makerPda.toBuffer(),
      new BN(maker.totalOffers).toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("VAULT"), offerPda.toBuffer()],
    program.programId
  );

  return program.methods
    .initializeSellOffer(
      typeof rate === 'number' ? new BN(rate) : rate,
      Array.from(data)
    )
    .accounts({
      makerOwner: makerOwner,
      payer,
      maker: makerPda,
      offer: offerPda,
      mint: tokenMint,
      vault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// Initialize a sell offer intent
export async function initializeSellOfferIntent(
  program: Program<AnzoEscrow>,
  takerOwner: PublicKey,
  maker: PublicKey,
  offerId: number | BN,
  amount: number | BN,
  data: number[]
): Promise<TransactionInstruction> {
  const [takerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("TAKER"), takerOwner.toBuffer()],
    program.programId
  );

  const [makerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("MAKER"), maker.toBuffer()],
    program.programId
  );

  const offerIdBN = typeof offerId === 'number' ? new BN(offerId) : offerId;
  
  const [offerPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("MAKER_OFFER"), 
      makerPda.toBuffer(),
      offerIdBN.toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  );

  const offer = await program.account.sellOffer.fetch(offerPda);
  
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("VAULT"), offerPda.toBuffer()],
    program.programId
  );

  const [intentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("INTENT"), 
      offerPda.toBuffer(),
      new BN(offer.totalIntents).toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  );

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("ESCROW"), intentPda.toBuffer()],
    program.programId
  );

  return program.methods
    .initializeSellOfferIntent(
      offerIdBN,
      maker,
      typeof amount === 'number' ? new BN(amount) : amount,
      Array.from(data)
    )
    .accounts({
      takerOwner: takerOwner,
      taker: takerPda,
      offer: offerPda,
      vault: vaultPda,
      intent: intentPda,
      mint: offer.mint,
      escrow: escrowPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// Cancel a sell offer intent
export async function cancelSellOfferIntent(
  program: Program<AnzoEscrow>,
  authority: PublicKey,
  intentId: number | BN,
  offer: PublicKey,
  takerOwner: PublicKey
): Promise<TransactionInstruction> {
  const intentIdBN = typeof intentId === 'number' ? new BN(intentId) : intentId;
  
  const [intentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("INTENT"), 
      offer.toBuffer(),
      intentIdBN.toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  );

  const intent = await program.account.offerIntent.fetch(intentPda);
  
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("ESCROW"), intentPda.toBuffer()],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("VAULT"), offer.toBuffer()],
    program.programId
  );

  return program.methods
    .cancelSellOfferIntent(
      intentIdBN,
      offer,
      takerOwner
    )
    .accounts({
      authority,
      controller: findControllerPDA(program.programId),
      taker: intent.taker,
      intent: intentPda,
      escrow: escrowPda,
      vault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// Confirm a sell offer intent
export async function confirmSellOfferIntent(
  program: Program<AnzoEscrow>,
  authority: PublicKey,
  intentId: number | BN,
  offer: PublicKey,
  takerOwner: PublicKey,
  makerOwner: PublicKey
): Promise<TransactionInstruction> {
  const intentIdBN = typeof intentId === 'number' ? new BN(intentId) : intentId;
  
  const [takerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("TAKER"), takerOwner.toBuffer()],
    program.programId
  );

  const [makerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("MAKER"), makerOwner.toBuffer()],
    program.programId
  );

  const [intentPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("INTENT"), 
      offer.toBuffer(),
      intentIdBN.toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  );

  const intent = await program.account.offerIntent.fetch(intentPda);
  
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("ESCROW"), intentPda.toBuffer()],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("VAULT"), offer.toBuffer()],
    program.programId
  );

  // Get taker's token account
  const takerTokenAccount = await getAssociatedTokenAddress(
    intent.escrow.mint,
    takerOwner
  );

  return program.methods
    .confirmSellOfferIntent(
      intentIdBN,
      offer,
      takerOwner,
      makerOwner
    )
    .accounts({
      authority,
      controller: findControllerPDA(program.programId),
      taker: takerPda,
      maker: makerPda,
      intent: intentPda,
      escrow: escrowPda,
      vault: vaultPda,
      takerOwnerAta: takerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// Withdraw tokens from a sell offer
export async function withdrawSellOffer(
  program: Program<AnzoEscrow>,
  makerOwner: PublicKey,
  offerId: number | BN,
  amount: number | BN
): Promise<TransactionInstruction> {
  const [makerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("MAKER"), makerOwner.toBuffer()],
    program.programId
  );

  const offerIdBN = typeof offerId === 'number' ? new BN(offerId) : offerId;
  
  const [offerPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("MAKER_OFFER"), 
      makerPda.toBuffer(),
      offerIdBN.toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  );

  const offer = await program.account.sellOffer.fetch(offerPda);
  
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("VAULT"), offerPda.toBuffer()],
    program.programId
  );

  // Get maker's token account
  const makerTokenAccount = await getAssociatedTokenAddress(
    offer.mint,
    makerOwner
  );

  return program.methods
    .withdrawSellOffer(
      offerIdBN,
      typeof amount === 'number' ? new BN(amount) : amount
    )
    .accounts({
      makerOwner: makerOwner,
      maker: makerPda,
      offer: offerPda,
      mint: offer.mint,
      vault: vaultPda,
      receiver: makerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// Helper function to find controller PDA
function findControllerPDA(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("CONTROLLER")],
    programId
  );
  return pda;
}

// Helper function to find maker PDA
export function findMakerPDA(owner: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("MAKER"), owner.toBuffer()],
    programId
  );
  return pda;
}

// Helper function to find taker PDA
export function findTakerPDA(owner: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("TAKER"), owner.toBuffer()],
    programId
  );
  return pda;
}

// Helper function to find offer PDA
export function findOfferPDA(maker: PublicKey, offerId: number | BN, programId: PublicKey): PublicKey {
  const offerIdBN = typeof offerId === 'number' ? new BN(offerId) : offerId;
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("MAKER_OFFER"), 
      maker.toBuffer(),
      offerIdBN.toArrayLike(Buffer, "le", 8)
    ],
    programId
  );
  return pda;
}

// Helper function to find vault PDA
export function findVaultPDA(offer: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("VAULT"), offer.toBuffer()],
    programId
  );
  return pda;
}

// Helper function to find intent PDA
export function findIntentPDA(offer: PublicKey, intentId: number | BN, programId: PublicKey): PublicKey {
  const intentIdBN = typeof intentId === 'number' ? new BN(intentId) : intentId;
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("INTENT"), 
      offer.toBuffer(),
      intentIdBN.toArrayLike(Buffer, "le", 8)
    ],
    programId
  );
  return pda;
}

// Helper function to find escrow PDA
export function findEscrowPDA(intent: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("ESCROW"), intent.toBuffer()],
    programId
  );
  return pda;
}