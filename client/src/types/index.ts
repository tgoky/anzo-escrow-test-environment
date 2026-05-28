import type { FinancialAccount } from '@shared/types/financial-account';

// Export the FinancialAccount type for consistency
export type { FinancialAccount };

// Common interface for connected accounts
export interface ConnectedAccount {
  account: FinancialAccount;
  id: string;
}