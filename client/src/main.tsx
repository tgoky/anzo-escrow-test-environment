import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from './App';
import './index.css';
import './i18n'; // Import i18n initialization
import { LanguageProvider } from './i18n/LanguageContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      retry: false
    }
  }
});

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert" className="p-4">
      <h2 className="text-lg font-bold text-red-600">Something went wrong:</h2>
      <pre className="mt-2 text-sm text-red-500">{error.message}</pre>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);