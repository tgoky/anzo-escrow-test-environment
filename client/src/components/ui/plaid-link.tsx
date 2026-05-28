import React from 'react';
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PlaidLinkProps {
  linkToken: string;
  onSuccess: (publicToken: string, metadata: any) => Promise<void>;
  onExit: (err?: Error) => void;
  isLoading?: boolean;
}

export function PlaidLink({ linkToken, onSuccess, onExit, isLoading }: PlaidLinkProps) {
  const [error, setError] = React.useState<string | null>(null);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token: string, metadata: any) => {
      try {
        await onSuccess(public_token, metadata);
      } catch (error) {
        console.error('Error in Plaid onSuccess:', error);
        setError(error instanceof Error ? error.message : 'Failed to connect account');
        onExit(error instanceof Error ? error : new Error('Failed to connect account'));
      }
    },
    onExit: (err: any) => {
      console.log('Plaid Link exit:', err);
      onExit(err || undefined);
    },
    onLoad: () => {
      console.log('Plaid Link loaded');
    },
    onEvent: (eventName: string, metadata: any) => {
      console.log('Plaid Link event:', eventName, metadata);
    },
    receivedRedirectUri: window.location.href,
  });

  React.useEffect(() => {
    if (ready && !isLoading) {
      console.log('Opening Plaid Link automatically...');
      open();
    }
  }, [ready, open, isLoading]);

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 text-sm text-red-600">
              {error}
            </div>
          )}
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {ready ? "Connecting to your bank..." : "Preparing secure connection..."}
          </p>
          <Button
            variant="outline"
            onClick={onExit}
            className="w-full"
          >
            Back to Payment Methods
          </Button>
        </>
      )}
      <style jsx global>{`
        iframe[title="Plaid Link"] {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 2147483647 !important;
        }
      `}</style>
    </div>
  );
}