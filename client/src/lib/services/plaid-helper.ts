import { useEffect, useState } from 'react';

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

const PLAID_SCRIPT_ID = 'plaid-link-script';

export function loadPlaidScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(PLAID_SCRIPT_ID)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = PLAID_SCRIPT_ID;
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => {
      console.log('Plaid script loaded successfully');
      resolve();
    };
    script.onerror = () => {
      console.error('Failed to load Plaid script');
      reject(new Error('Failed to load Plaid script'));
    };
    document.head.appendChild(script);
  });
}

export function initializePlaid(config: any) {
  if (!window.Plaid) {
    throw new Error('Plaid not loaded');
  }
  return window.Plaid.create(config);
}

export function usePlaidScriptLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlaidScript()
      .then(() => setIsLoaded(true))
      .catch((err) => setError(err.message));
  }, []);

  return { isLoaded, error };
}