import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet } from "lucide-react";
import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import { accountConnectionRegistry } from "@/lib/account-connection-registry";
import { InlineCountrySelector } from "@/components/ui/country-selector";
import { ManualAccountForm } from "@/components/ui/manual-account-form";
import { useToast } from "@/hooks/use-toast";
import { FinancialAccount } from '@shared/types/financial-account';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface AccountConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  walletAddress: string;
  onAccountConnect?: (account: FinancialAccount) => void;
  source?: string;
  preselectedCountryCode?: string;
  preselectedCurrency?: string;
}

export function AccountConnectionDialog({
  open,
  onClose,
  onOpenChange,
  walletAddress,
  onAccountConnect,
  source,
  preselectedCountryCode,
  preselectedCurrency
}: AccountConnectionDialogProps) {
  const initialStep = source === "buyForm" || preselectedCurrency ? "payment_method" : "currency";
  const [step, setStep] = useState<"currency" | "payment_method" | "account_form">(initialStep);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(preselectedCurrency || "USD");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(preselectedCountryCode || "US");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { addAccount } = useFinancialAccountStore();
  
  // Mutation for creating a manual account
  const createAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await apiRequest({
        url: '/api/manual-accounts',
        method: 'POST',
        data: accountData
      });
      return await response.json();
    },
    onSuccess: (account: FinancialAccount) => {
      console.log('✅ ACCOUNT DIALOG: Account created successfully:', JSON.stringify(account));
      
      // Add the account to the store
      addAccount(account);
      if (onAccountConnect) {
        onAccountConnect(account);
      }
      
      // Invalidate any relevant queries
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      
      toast({
        title: "Account added",
        description: "Your payment details were successfully saved.",
      });
      
      handleClose();
    },
    onError: (error: any) => {
      console.error('Error creating account:', error);
      setError(error instanceof Error ? error.message : 'Failed to create account');
    }
  });

  // Load payment method options using React Query
  const paymentMethodsQuery = useQuery({
    queryKey: ['payment-methods', selectedCurrency, selectedCountryCode],
    queryFn: async () => {
      console.log(`🔄 Fetching payment methods for ${selectedCurrency} in ${selectedCountryCode}`);
      const response = await apiRequest({
        url: `/api/payment-method-options?currency=${selectedCurrency}&country=${selectedCountryCode}`,
        method: 'GET'
      });
      const data = await response.json();
      console.log(`✅ Received ${data.length} payment methods for ${selectedCurrency}`);
      return data;
    },
    enabled: step === "payment_method",
    staleTime: 0, // Always refetch when requested
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true // Refetch when window gets focus
  });
  
  // Update payment method options when query data changes
  useEffect(() => {
    if (paymentMethodsQuery.data) {
      setPaymentMethodOptions(paymentMethodsQuery.data);
    }
  }, [paymentMethodsQuery.data]);
  
  // Handle query error
  useEffect(() => {
    if (paymentMethodsQuery.error) {
      console.error('Error fetching payment method options:', paymentMethodsQuery.error);
      setError(paymentMethodsQuery.error instanceof Error ? 
        paymentMethodsQuery.error.message : 'Failed to load payment options');
    }
  }, [paymentMethodsQuery.error]);

  const handleAccountSubmit = async (data: any) => {
    try {
      console.log('📤 ACCOUNT DIALOG: Submitting account data:', JSON.stringify(data));
      
      // Make sure institution is properly set
      if (!data.institution || typeof data.institution !== 'object') {
        data.institution = {
          name: data.accountName || `${selectedPaymentMethod} Account`,
          type: 'payment_provider',
          country: selectedCountryCode
        };
      } else if (!data.institution.name) {
        // Set institution name if it's empty
        data.institution.name = data.accountName || `${selectedPaymentMethod} Account`;
      }
      
      // Make sure payment methods have all required fields
      if (data.paymentMethods && Array.isArray(data.paymentMethods)) {
        data.paymentMethods = data.paymentMethods.map((method: {
          type: string;
          provider?: string;
          country?: string;
          currency?: string;
          details?: Record<string, string>;
          instructions?: string;
        }) => {
          // Set country and currency if not set
          if (!method.country) method.country = selectedCountryCode;
          if (!method.currency) method.currency = selectedCurrency;
          
          // Make sure provider is not empty
          if (!method.provider) method.provider = method.type;
          
          // Make sure details is an object
          if (!method.details || typeof method.details !== 'object') {
            method.details = {};
          }
          
          return method;
        });
      }
      
      console.log('📤 ACCOUNT DIALOG: Enhanced account data:', JSON.stringify(data));
      
      // Use the mutation to create the account
      createAccountMutation.mutate(data);
    } catch (error) {
      console.error('Error processing account data:', error);
      setError(error instanceof Error ? error.message : 'Failed to process account data');
    }
  };

  const handleCountrySelect = (country: { code: string; currency: string; rate: number }) => {
    setSelectedCountryCode(country.code);
    setSelectedCurrency(country.currency);
    setStep("payment_method");
  };

  const handlePaymentMethodSelection = (value: string) => {
    setSelectedPaymentMethod(value);
    setError(null);
    setStep("account_form");
  };

  const handleClose = () => {
    setStep(initialStep);
    setSelectedCurrency(preselectedCurrency || "USD");
    setSelectedCountryCode(preselectedCountryCode || "US");
    setSelectedPaymentMethod("");
    setError(null);
    onClose();
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const paymentMethods = paymentMethodOptions.map(option => ({
    id: option.type,
    name: option.name,
    description: option.description
  }));

  const getDialogTitle = () => {
    switch (step) {
      case "currency": return "Select Your Region";
      case "payment_method": return "Select Payment Method";
      case "account_form": return "Enter Payment Details";
      default: return "Connect Payment Method";
    }
  };

  const getDialogDescription = () => {
    switch (step) {
      case "currency": return "Choose your region for relevant payment options";
      case "payment_method": return "Select how you want to receive payments";
      case "account_form": return "Enter the necessary details for your payment method";
      default: return "Connect a payment method to your account";
    }
  };

  // Determine if any operations are in progress
  const isProcessing = paymentMethodsQuery.isLoading || createAccountMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(shouldClose) => !isProcessing && handleClose()}>
      <DialogContent className={step === "account_form" ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 p-3 rounded-md mb-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        {step === "currency" && (
          <div className="mt-2">
            <InlineCountrySelector
              selectedCountryCode={selectedCountryCode}
              onCountrySelect={handleCountrySelect}
              showTitle={false}
              className="w-full border-0 p-0"
            />
          </div>
        )}

        {step === "payment_method" && (
          <>
            {paymentMethodsQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {paymentMethods.length > 0 ? (
                  <RadioGroup
                    onValueChange={handlePaymentMethodSelection}
                    className="gap-4"
                  >
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-2 rounded-md border p-3 cursor-pointer hover:bg-accent">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-muted-foreground">{method.description}</div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-md">
                    <Wallet className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p>No payment methods available for {selectedCurrency} in {selectedCountryCode}.</p>
                    <p className="mt-1">Please select a different region.</p>
                  </div>
                )}
              </>
            )}
            
            <Button
              variant="outline"
              onClick={() => setStep("currency")}
              className="mt-4"
              disabled={paymentMethodsQuery.isLoading || createAccountMutation.isPending}
            >
              Back
            </Button>
          </>
        )}

        {step === "account_form" && (
          <div className="w-full">
            <ManualAccountForm
              walletAddress={walletAddress}
              onSubmit={handleAccountSubmit}
              onCancel={() => setStep("payment_method")}
              paymentMethodOptions={paymentMethodOptions}
              selectedPaymentMethod={selectedPaymentMethod}
              currency={selectedCurrency}
              country={selectedCountryCode}
              isLoading={createAccountMutation.isPending}
              simplified={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}