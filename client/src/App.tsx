import { Route, Router, Switch } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import {toSolanaWalletConnectors} from '@privy-io/react-auth/solana';
import { PrivyProvider } from '@privy-io/react-auth';
import NotFound from "@/pages/not-found";
import ExchangePage from "@/pages/exchange/ExchangePage";
import Dashboard from "@/pages/maker/Dashboard";
import OfferDetails from "@/pages/maker/OfferDetails";
import PaymentLinkPage from "@/pages/pay/PaymentLinkPage";
import TransactionPage from "@/pages/exchange/TransactionPage";
import FinancialAccountDetailsPage from './pages/maker/FinancialAccountDetailsPage';
import UserSettingsPage from './pages/settings/UserSettingsPage';
import PrivacyPolicy from './pages/privacy-policy';
import TermsOfService from './pages/terms-of-service';
import About from './pages/about';
import AdminDashboard from './pages/admin/AdminDashboard';
import { TestEscrowApp } from "./pages/test/TestContract";
import MarketplacePage from "./pages/marketplace/MarketplacePage";
import OfferPage from "./pages/marketplace/OfferPage";

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

const privyConfig = {
  loginMethods: ['wallet', 'email'],
  appearance: {
    theme: 'light' as 'light', // Type assertion to fix TypeScript error
    accentColor: '#676FFF',
    walletChainType: 'solana-only',
  },
  externalWallets: {
    solana: {
      connectors: solanaConnectors,
    },
  },
  solanaClusters: [{name: 'localnet', rpcUrl: 'http://localhost:8899'}],
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={ExchangePage} />
      <Route path="/exchange" component={ExchangePage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/offer/:id" component={OfferPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/offers/:offerId" component={OfferDetails} />
      <Route path="/pay/:offerId" component={PaymentLinkPage} />
      {/* Removing this route to use existing transaction flow in dashboard */}
      {/* <Route path="/exchange/transaction/:id" component={TransactionPage} /> */}
      <Route path="/dashboard/accounts/:accountId" component={FinancialAccountDetailsPage} />
      <Route path="/settings" component={UserSettingsPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/test/solana" component={TestEscrowApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
     <PrivyProvider
        appId={"cm85k7aux00yz9j5wizkc6pw3"}
        config={privyConfig}
      >
        <QueryClientProvider client={queryClient}>
          <Router>
            <Header />
            <AppRoutes />
            <Toaster />
          </Router>
        </QueryClientProvider>
      </PrivyProvider>
  );
}

export default App;
