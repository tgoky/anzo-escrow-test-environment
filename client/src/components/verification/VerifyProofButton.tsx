import { useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { idl } from "./idl";
import { sendTransactionAnchor } from "./utils";
import { ethers } from "ethers";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const EPOCH_CONFIG_ADDRESS = new PublicKey(
  "FUmVofehkRN6RG4CT8eeszswuqtDcZbCgVKMCQFLvgfY"
);

const RECLAIM_PROGRAM_ID = new PublicKey(
  "8rYXFrtST4ePpMWcEqhazFyRG2DtCUqgtFmKT7FdjRyp"
);

const SEED_PREFIX = new TextEncoder().encode("reclaim");
const SEED_EPOCH = new TextEncoder().encode("epoch");

function toU32Bytes(num: number): Buffer {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(num, 0);
  return bytes;
}

function getEpochPda({
  epochConfig,
  epochIdx,
  programId = RECLAIM_PROGRAM_ID,
}: {
  epochConfig: PublicKey;
  epochIdx: number;
  programId?: PublicKey;
}): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEED_PREFIX, epochConfig.toBuffer(), SEED_EPOCH, toU32Bytes(epochIdx)],
    programId
  );
}

interface Proof {
  claimData: {
    provider: string;
    parameters: string;
    context: string;
    owner: string;
    timestampS: number;
    epoch: number;
  };
  identifier: string;
  signatures: string[];
}

interface VerifyProofButtonProps {
  proof: Proof;
  connection: Connection;
  onSuccess?: (signature: string) => void;
  onError?: (error: Error) => void;
}

export default function VerifyProofButton({
  proof,
  connection,
  onSuccess,
  onError,
}: VerifyProofButtonProps) {
  const { wallets } = useSolanaWallets();
  const { toast } = useToast();
  const [isLoading, setLoading] = useState(false);

  async function verifyProof() {
    if (!wallets[0]) {
      const error = new Error("Wallet not connected");
      toast({
        title: "Wallet Error",
        description: "Please connect your wallet to verify the proof.",
        variant: "destructive",
      });
      onError?.(error);
      return;
    }
  
    setLoading(true);
    try {
      const walletAddress = new PublicKey(wallets[0].address);
      const context = JSON.parse(proof.claimData.context);
      const timestamp = proof.claimData.timestampS;
      const owner = Array.from(new Uint8Array(ethers.getBytes(proof.claimData.owner)));
      const epochIndex = proof.claimData.epoch;
  
      // Create provider
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: walletAddress,
          signTransaction: wallets[0].signTransaction,
          signAllTransactions: wallets[0].signAllTransactions,
        },
        { commitment: "confirmed" }
      );
  
      // Initialize program with correct parameters
      const program = new Program(idl, RECLAIM_PROGRAM_ID, provider);
  
      const [epochPda] = getEpochPda({
        epochConfig: EPOCH_CONFIG_ADDRESS,
        epochIdx: epochIndex,
      });
  
      const verifyTx = await program.methods
        .verifyProof({
          signedClaim: {
            signatures: proof.signatures.map((s) =>
              Array.from(new Uint8Array(ethers.getBytes(s)))
            ),
            claimData: {
              identifier: Array.from(new Uint8Array(ethers.getBytes(proof.identifier))),
              epochIndex,
              timestamp,
              owner,
            },
          },
        })
        .accounts({
          signer: walletAddress,
          epoch: epochPda,
          epochConfig: EPOCH_CONFIG_ADDRESS,
        })
        .transaction();
  
      const sig = await sendTransactionAnchor(
        connection,
        verifyTx.instructions,
        walletAddress,
        {
          publicKey: walletAddress,
          signTransaction: wallets[0].signTransaction,
          signAllTransactions: wallets[0].signAllTransactions,
        },
        []
      );
  
      toast({
        title: "Proof Verified",
        description: "The proof has been successfully verified on-chain.",
      });
      onSuccess?.(sig);
    } catch (err) {
      console.error("Error verifying proof:", err);
      toast({
        title: "Verification Failed",
        description: "Failed to verify the proof. Please try again.",
        variant: "destructive",
      });
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button
      onClick={verifyProof}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? "Verifying..." : "Verify Proof"}
    </Button>
  );
}