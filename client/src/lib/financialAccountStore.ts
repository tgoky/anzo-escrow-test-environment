import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FinancialAccount } from '@shared/types/financial-account';

// Interface for connected account in the store
interface ConnectedFinancialAccount {
  account: FinancialAccount;
  id: string;
}

// Interface for the financial account store
interface FinancialAccountStore {
  connectedAccounts: ConnectedFinancialAccount[];
  selectedAccountIndex: number;
  setSelectedAccountIndex: (index: number) => void;
  addAccount: (account: FinancialAccount) => void;
  removeAccount: (idOrIndex: string | number) => void;
  updateAccount: (index: number, updatedAccount: Partial<FinancialAccount>) => void;
  getConnectedAccounts: () => ConnectedFinancialAccount[];
  getAccountById: (id: string) => FinancialAccount | undefined;
}

export const useFinancialAccountStore = create<FinancialAccountStore>()(
  persist(
    (set, get) => ({
      connectedAccounts: [],
      selectedAccountIndex: 0,

      setSelectedAccountIndex: (index) => {
        console.log('🔵 financialAccountStore: Setting selected account index to:', index);
        set({ selectedAccountIndex: index });
      },

      addAccount: (account) => {
        set((state) => {
          console.log('🔵 financialAccountStore: Adding account:', account);
          console.log('🔍 financialAccountStore: Current state:', state);

          // Check if account with this ID already exists
          const existingIndex = state.connectedAccounts.findIndex(acc => acc.account.id === account.id);
          if (existingIndex !== -1) {
            console.log('🔄 financialAccountStore: Replacing existing account at index:', existingIndex);
            // If it exists, replace it
            const newConnectedAccounts = [...state.connectedAccounts];
            newConnectedAccounts[existingIndex] = { 
              account,
              id: state.connectedAccounts[existingIndex].id
            };
            console.log('✅ financialAccountStore: Updated accounts:', newConnectedAccounts);
            return { connectedAccounts: newConnectedAccounts };
          }

          // Otherwise add it
          const newId = `account-${Date.now()}`;
          console.log('✅ financialAccountStore: Adding new account with ID:', newId);
          const newState = { 
            connectedAccounts: [...state.connectedAccounts, { 
              account, 
              id: newId 
            }],
            selectedAccountIndex: state.connectedAccounts.length // Update selected index
          };
          console.log('✅ financialAccountStore: New state:', newState);
          return newState;
        });
      },

      // Remove account by ID or index
      removeAccount: (idOrIndex) =>
        set((state) => {
          console.log('🔵 financialAccountStore: Removing account:', idOrIndex);
          console.log('🔍 financialAccountStore: Current state:', state);

          // Handle both string IDs and number indices
          let index: number;
          
          if (typeof idOrIndex === 'string') {
            // If idOrIndex is a string, find the index of the account with that ID
            const accountIndex = state.connectedAccounts.findIndex(acc => acc.id === idOrIndex);
            if (accountIndex === -1) {
              console.warn('⚠️ financialAccountStore: No account found with ID:', idOrIndex);
              return state; // Return unchanged state if account not found
            }
            index = accountIndex;
          } else {
            // If idOrIndex is a number, use it directly as the index
            index = idOrIndex;
          }

          const newAccounts = [...state.connectedAccounts];
          newAccounts.splice(index, 1);
          
          // Update selected index if necessary
          const newIndex = index === state.selectedAccountIndex 
            ? Math.min(Math.max(0, newAccounts.length - 1), state.selectedAccountIndex)
            : state.selectedAccountIndex > index
              ? state.selectedAccountIndex - 1
              : state.selectedAccountIndex;

          console.log('✅ financialAccountStore: New selected index will be:', newIndex);

          const newState = {
            connectedAccounts: newAccounts,
            selectedAccountIndex: newIndex
          };

          console.log('✅ financialAccountStore: New state:', newState);
          return newState;
        }),

      updateAccount: (index, updatedAccount) =>
        set((state) => {
          console.log('🔵 financialAccountStore: Updating account at index:', index, 'with:', updatedAccount);
          console.log('🔍 financialAccountStore: Current state:', state);
          const newAccounts = [...state.connectedAccounts];
          if (newAccounts[index]) {
            newAccounts[index] = {
              ...newAccounts[index],
              account: {
                ...newAccounts[index].account,
                ...updatedAccount
              }
            };
          }
          console.log('✅ financialAccountStore: Updated accounts:', newAccounts);
          return { connectedAccounts: newAccounts };
        }),

      // Get all connected accounts
      getConnectedAccounts: () => {
        console.log('🔍 financialAccountStore: Getting all connected accounts');
        return get().connectedAccounts;
      },

      // Get account by ID
      getAccountById: (id) => {
        console.log('🔍 financialAccountStore: Getting account by ID:', id);
        const account = get().connectedAccounts.find(acc => acc.id === id);
        return account?.account;
      }
    }),
    {
      name: 'financial-account-storage',
      partialize: (state) => ({
        connectedAccounts: state.connectedAccounts,
        selectedAccountIndex: state.selectedAccountIndex
      }),
    }
  )
);