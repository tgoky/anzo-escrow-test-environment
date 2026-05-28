import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  connectedWallet: string | null;
  setConnectedWallet: (wallet: string | null) => void;
  // Added new method to check if wallet is connected
  isConnected: () => boolean;
}

// IMPORTANT: Don't access localStorage directly in the initial state to prevent double updates
// This was causing the "Maximum update depth exceeded" error
export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      connectedWallet: null, // Start with null, let persist middleware restore the value
      setConnectedWallet: (wallet) => {
        console.log("🔑 Setting connected wallet in store:", wallet);
        set({ connectedWallet: wallet });
      },
      isConnected: () => {
        return get().connectedWallet !== null;
      }
    }),
    {
      name: 'wallet-storage', // name for the storage key
      partialize: (state) => ({ connectedWallet: state.connectedWallet }),
    }
  )
);
