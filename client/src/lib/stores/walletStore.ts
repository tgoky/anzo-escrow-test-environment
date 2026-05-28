import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletState {
  connectedWallet: string | null;
  setConnectedWallet: (wallet: string | null) => void;
  disconnectWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      connectedWallet: null,
      setConnectedWallet: (wallet) => set({ connectedWallet: wallet }),
      disconnectWallet: () => set({ connectedWallet: null }),
    }),
    {
      name: 'wallet-storage',
    }
  )
);