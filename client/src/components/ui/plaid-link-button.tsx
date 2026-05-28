
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { loadPlaidScript } from '@/lib/services/plaid-helper';

interface PlaidLinkButtonProps {
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit: () => void;
  walletAddress: string;
}

// Add Plaid to window type
declare global {
  interface Window {
    Plaid: {
      create: (config: any) => {
        open: () => void;
        exit: () => void;
      };
    };
  }
}

export function PlaidLinkButton({ onSuccess, onExit, walletAddress }: PlaidLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [plaidHandler, setPlaidHandler] = useState<any>(null);
  
  // Create a stable reference to onSuccess and onExit functions
  const handleSuccess = useCallback((public_token: string, metadata: any) => {
    console.log("Plaid success callback called with token:", public_token);
    setIsLoading(false);
    onSuccess(public_token, metadata);
  }, [onSuccess]);
  
  const handleExit = useCallback((err?: any) => {
    console.log("Plaid exit callback called with error:", err);
    setIsLoading(false);
    if (err) {
      setError(`Error: ${err.error_message || 'Unknown error'}`);
    }
    onExit();
  }, [onExit]);

  // Used to create the Plaid Link handler
  const createPlaidHandler = useCallback((token: string) => {
    if (!window.Plaid) {
      console.error("Plaid SDK not available");
      setError("Plaid SDK not available");
      return null;
    }
    
    console.log("Creating Plaid handler with token:", token);
    
    try {
      const handler = window.Plaid.create({
        token,
        onSuccess: (public_token: string, metadata: any) => {
          console.log("Plaid success:", public_token);
          handleSuccess(public_token, metadata);
        },
        onExit: (err?: any) => {
          console.log("Plaid exit:", err);
          handleExit(err);
        },
        onEvent: (eventName: string, metadata?: any) => {
          console.log("Plaid event:", eventName, metadata);
        },
        // Do not close on load - this is important
        receivedRedirectUri: null,
      });
      
      return handler;
    } catch (err) {
      console.error("Error creating Plaid handler:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  }, [handleSuccess, handleExit]);
  
  // Load the Plaid Link script on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadScript = async () => {
      try {
        await loadPlaidScript();
        console.log("Plaid script loaded successfully");
      } catch (err) {
        console.error("Failed to load Plaid script:", err);
        if (isMounted) {
          setError("Failed to load Plaid script");
        }
      }
    };
    
    loadScript();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // When we have a link token, create the handler
  useEffect(() => {
    if (linkToken) {
      const handler = createPlaidHandler(linkToken);
      setPlaidHandler(handler);
      
      // Open Plaid Link
      if (handler) {
        console.log("Auto-opening Plaid Link...");
        // Use setTimeout to ensure DOM is fully ready
        setTimeout(() => {
          try {
            handler.open();
            console.log("Plaid Link opened successfully");
          } catch (err) {
            console.error("Error opening Plaid Link:", err);
          }
        }, 100);
      }
    }
  }, [linkToken, createPlaidHandler]);

  const handleClick = async () => {
    try {
      console.log('Initializing Plaid connection...');
      setIsLoading(true);
      setError(null);
      
      // Clear previous token and handler
      setLinkToken(null);
      
      // Request a link token from your API
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, currency: 'USD' })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create link token: ${response.status}`);
      }
      
      const { link_token } = await response.json();
      console.log('Got link token:', link_token);
      
      // Set the link token which will trigger the useEffect
      setLinkToken(link_token);
      
    } catch (err) {
      console.error('Plaid error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Plaid');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <Button 
        onClick={handleClick} 
        disabled={isLoading} 
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting to Bank...
          </>
        ) : (
          "Connect Bank Account"
        )}
      </Button>
      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}
    </div>
  );
}
