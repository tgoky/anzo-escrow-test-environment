import { useState } from 'react';
import { Plus, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountPaymentDisplay } from './AccountPaymentDisplay';
import { useFinancialAccountStore } from '@/lib/financialAccountStore';
import { AccountConnectionDialog } from '@/components/ui/account-connection-dialog';
import type { FinancialAccount } from '@shared/types/financial-account';

export function PaymentMethodsTab() {
  const {
    connectedAccounts,
    addAccount,
    removeAccount
  } = useFinancialAccountStore();
  const [accountConnectionOpen, setAccountConnectionOpen] = useState(false);
  
  const handleAccountConnect = (account: FinancialAccount) => {
    addAccount(account);
    setAccountConnectionOpen(false);
  };
  
  const handleDeleteAccount = (accountId: string) => {
    removeAccount(accountId);
  };
  
  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Payment Methods</h2>
        <Button
          variant="default"
          size="sm"
          onClick={() => setAccountConnectionOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Payment Method
        </Button>
      </div>
      
      {connectedAccounts.length > 0 ? (
        <div className="grid gap-4">
          {connectedAccounts.map((account) => (
            <AccountPaymentDisplay 
              key={account.id} 
              account={account.account} 
              onDelete={() => handleDeleteAccount(account.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Payment Methods</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Connect a bank account or add a payment method to start accepting payments.
            </p>
            <Button onClick={() => setAccountConnectionOpen(true)}>
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      )}
      
      <AccountConnectionDialog 
        open={accountConnectionOpen}
        onOpenChange={setAccountConnectionOpen}
        onSuccess={handleAccountConnect}
      />
    </div>
  );
}