import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnzoEscrow } from "../target/types/anzo_escrow";
import { assert } from "chai";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo , ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";


describe("anzo_escrow", () => {
    const payer = Keypair.generate();
    const provider = new anchor.AnchorProvider(
        anchor.AnchorProvider.local().connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed", skipPreflight: false }
    );
    anchor.setProvider(provider);
    const program = anchor.workspace.AnzoEscrow as Program<AnzoEscrow>;
    // Keypairs and accounts
    let maker: Keypair;
    let taker: Keypair;
    let admin: Keypair;
    let tokenMint: PublicKey;
    let makerTokenAccount: PublicKey;
    let adminTokenAccount: PublicKey;
    let vaultTokenAccount: PublicKey;

    // PDAs
    let makerPda: PublicKey;
    let takerPda: PublicKey;
    let offerPda: PublicKey;
    let controllerPda: PublicKey;
    it("happy path", async () => {
        const airdropSig = await provider.connection.requestAirdrop(payer.publicKey, 30_000_000_000);
        await provider.connection.confirmTransaction(airdropSig);
        maker = Keypair.generate();
        taker = Keypair.generate();
        admin = Keypair.generate();

        console.log("Maker public key:", maker.publicKey.toString());
        console.log("Taker public key:", taker.publicKey.toString());
        console.log("Admin public key:", admin.publicKey.toString());
        // Fund maker and taker
        const fundTx = new anchor.web3.Transaction().add(
            SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: maker.publicKey, lamports: 5_000_000_000 }),
            SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: taker.publicKey, lamports: 5_000_000_000 }),
            SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: admin.publicKey, lamports: 5_000_000_000 })
          );
        await provider.sendAndConfirm(fundTx);
         // Create token mint
         tokenMint = await createMint(provider.connection, payer, payer.publicKey, null, 6);
         // Create and fund maker token account
        const makerAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, tokenMint, maker.publicKey);
        makerTokenAccount = makerAta.address;
        await mintTo(provider.connection, payer, tokenMint, makerTokenAccount, payer, 1000);

        const adminAta = await getOrCreateAssociatedTokenAccount(provider.connection, payer, tokenMint, admin.publicKey);
        adminTokenAccount = adminAta.address;
        await mintTo(provider.connection, payer, tokenMint, adminTokenAccount, payer, 1000);


        [makerPda] = PublicKey.findProgramAddressSync([Buffer.from("MAKER"), maker.publicKey.toBuffer()], program.programId);
        [takerPda] = PublicKey.findProgramAddressSync([Buffer.from("TAKER"), taker.publicKey.toBuffer()], program.programId);
        [controllerPda] = PublicKey.findProgramAddressSync([Buffer.from("CONTROLLER")], program.programId);

        console.log("Controller PDA:", controllerPda.toString());
        console.log("Maker PDA:", makerPda.toString());
        console.log("Taker PDA:", takerPda.toString());

        // First initialize the controller
        await program.methods
        .initializeController()
        .accounts({
            authority: admin.publicKey,
            payer: payer.publicKey,
            controller: controllerPda,
            system_program: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

        await program.methods
        .initializeMaker(Array(256).fill(0)) // Create a proper 256-byte array filled with zeros
        .accounts({
          authority: admin.publicKey,
          payer: payer.publicKey,
          controller: controllerPda,
          makerAuthority: maker.publicKey,
          maker: makerPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, maker]) // Include both admin and maker as signers
        .rpc();

        await program.methods
        .initializeTaker(Array(256).fill(0))
        .accounts({
            authority: admin.publicKey,
            payer: payer.publicKey,
            controller: controllerPda,
            takerAuthority: taker.publicKey,
            taker: takerPda,
            systemProgram: SystemProgram.programId,
        })
        .signers([admin, taker])
        .rpc();
        ////////////////////////////////////////////////////////////////
        
        // After initializing the maker account
        const makerAccount = await program.account.maker.fetch(makerPda);
        
        // Try both u32 and u64 formats to see which matches
        const totalOffers = makerAccount.totalOffers;
        
        const u32Buffer = Buffer.alloc(4);
        u32Buffer.writeUInt32LE(totalOffers);
        
        const u64Buffer = Buffer.alloc(8);
        u64Buffer.writeBigUInt64LE(BigInt(totalOffers));
        
        // Test both to see which works
        
        const [offerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("SELL_OFFER"), maker.publicKey.toBuffer(), u64Buffer],
          program.programId
        );

        console.log("U64 PDA:", offerPda.toString());
        
        // Then derive vault correctly
        const [vaultPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("VAULT"), offerPda.toBuffer()],
          program.programId
        );
        
        // Use in your instruction
        await program.methods.initializeSellOffer(Array(256).fill(0), new anchor.BN(10))
          .accounts({
            makerAuthority: maker.publicKey,
            payer: payer.publicKey,
            maker: makerPda,
            offer: offerPda,
            mint: tokenMint,
            vaultAta: vaultPda,
            makerTokenAccount: makerTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([maker])
          .rpc();

        
    const takerAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        tokenMint,
        taker.publicKey
    );
    console.log("Taker ATA created:", takerAta.address.toString());
    
    // 2. Fetch the offer account to get total_intents
    const offerAccount = await program.account.sellOffer.fetch(offerPda);
    console.log("Offer total intents:", offerAccount.totalIntents);
    
    // 3. Create buffer for total_intents (u64)
    const totalIntentsBuffer = Buffer.alloc(8);
    totalIntentsBuffer.writeBigUInt64LE(BigInt(offerAccount.totalIntents.toNumber()));
    // 4. Derive intent PDA with correct seeds
    const [intentPda] = PublicKey.findProgramAddressSync(
        [
        Buffer.from("SELL_INTENT"),
        offerPda.toBuffer(),
        totalIntentsBuffer
        ],
        program.programId
    );
    console.log("Intent PDA:", intentPda.toString());
    
    // 5. Derive escrow PDA
    const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ESCROW"), intentPda.toBuffer()],
        program.programId
    );
    console.log("Escrow PDA:", escrowPda.toString());
    
    // 6. Initialize the sell intent
    await program.methods.initializeSellIntent(
        new anchor.BN(0), // offer_id
        new anchor.BN(10), // amount
        Array(256).fill(0) // data
    )
    .accounts({
        takerAuthority: taker.publicKey,
        payer: payer.publicKey,
        taker: takerPda,
        makerAuthority: maker.publicKey,
        offer: offerPda,
        intent: intentPda,
        mint: tokenMint,
        vaultAta: vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        escrowAta: escrowPda,
        receiverAta: takerAta.address, // Use the actual token account
        systemProgram: SystemProgram.programId,
    })
    .signers([taker])
    .rpc();
    console.log("Is maker a Keypair?", maker instanceof anchor.web3.Keypair);
    console.log("Maker public key:", maker.publicKey.toString());
    console.log("Maker has secretKey?", maker.secretKey && maker.secretKey.length > 0);
    await program.methods.confirmSellIntent(new anchor.BN(0), new anchor.BN(0))
    .accounts({
        authority: maker.publicKey,
        payer: payer.publicKey,
        controller: controllerPda,
        makerAuthority: maker.publicKey,
        offer: offerPda,
        intent: intentPda,
        escrowAta: escrowPda,
        receiverAta: takerAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
    }).signers([maker])
    .rpc();

    const makerTokenBalance = await provider.connection.getTokenAccountBalance(makerTokenAccount);
    const takerTokenBalance = await provider.connection.getTokenAccountBalance(takerAta.address);
    const vaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultPda);
    const escrowTokenBalance = await provider.connection.getTokenAccountBalance(escrowPda);

    console.log("=== Verification ===");
    console.log("Maker token balance:", makerTokenBalance.value.uiAmount);
    console.log("Taker token balance:", takerTokenBalance.value.uiAmount);
    console.log("Vault token balance:", vaultTokenBalance.value.uiAmount);
    console.log("Escrow token balance:", escrowTokenBalance.value.uiAmount);

    //2. Verify intent status is updated to "confirmed" (status = 1)
    const intentAccount = await program.account.sellIntent.fetch(intentPda);
    console.log("Intent status:", intentAccount.status);
    assert.equal(intentAccount.status, 1, "Intent status should be 1 (confirmed)");

    //3. Verify the tokens were transferred from escrow to taker
    assert.equal(escrowTokenBalance.value.uiAmount, 0, "Escrow should be empty after confirmation");
    assert.approximately(takerTokenBalance.value.uiAmount, 0.00001, 0.000001, "Taker should have received approximately 0.00001 tokens");

    //4. Verify vault balance is reduced 
    assert.equal(vaultTokenBalance.value.uiAmount, 0, "Vault should have 0 tokens left");

    // 5. Verify intent account relationships
    const intentAccount2 = await program.account.sellIntent.fetch(intentPda);
    console.log("Intent status:", intentAccount2.status);
    assert.equal(intentAccount2.status, 1, "Intent status should be 1 (confirmed)");
    
    // Add debug logs
    console.log("Intent offer PDA:", intentAccount2.offer.toString());
    console.log("Expected offer PDA:", offerPda.toString());
    
    assert.isTrue(intentAccount2.offer.equals(offerPda), "Intent offer should match offer PDA");
   
    assert.approximately(
        makerTokenBalance.value.uiAmount,
        0.00099, // 0.001 - 0.00001
        0.000001,
        "Maker should have correct remaining balance"
      );

    assert.isTrue(
        intentAccount2.takerAuthority.equals(taker.publicKey),
        "Intent taker authority should match taker public key"
    );

})
})