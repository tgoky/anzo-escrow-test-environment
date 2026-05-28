import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { 
  Landmark, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  CircleDollarSign, 
  UserRound, 
  HomeIcon,
  CreditCard,
  Building, 
  Globe,
  CalendarClock,
  ShieldCheck,
  Activity,
  BarChart3,
  Trash2,
  AlertCircle
} from "lucide-react";

import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import { ArrowLeft } from "lucide-react";

/**
 * Component to display payment method details from account metadata
 */
interface AccountPaymentMethodDetailsProps {
  metadata: any;
}

/**
 * Get a display name for a payment method type
 */
function getDisplayNameForPaymentMethod(type: string): string {
  const displayNames: Record<string, string> = {
    'zelle': 'Zelle',
    'cash_deposit': 'Cash Deposit',
    'bank_transfer': 'Bank Transfer',
    'sepa': 'SEPA Transfer',
    'instant_sepa': 'Instant SEPA',
    'revolut': 'Revolut',
    'wise': 'Wise',
    'cashapp': 'Cash App',
    'venmo': 'Venmo',
    'mpesa': 'M-Pesa',
    'upi': 'UPI',
    'pix': 'Pix',
    'interac': 'Interac'
  };
  
  return displayNames[type] || type.replace('_', ' ');
}

function AccountPaymentMethodDetails({ metadata }: AccountPaymentMethodDetailsProps) {
  // Check if it's a manual account with payment methods
  if (!metadata.isManual || !metadata.manualPaymentMethods || metadata.manualPaymentMethods.length === 0) {
    return <p className="font-medium">No payment methods available.</p>;
  }

  return (
    <div className="space-y-3">
      {metadata.manualPaymentMethods.map((method: any, index: number) => (
        <div key={index} className="bg-gray-50 p-3 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <Badge variant="outline" className="capitalize text-primary">
              {method.provider || getDisplayNameForPaymentMethod(method.type)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {method.currency}
            </Badge>
          </div>
          
          {method.details && Object.keys(method.details).length > 0 && (
            <div className="space-y-1">
              {Object.entries(method.details).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                  <span className="text-gray-900">{value as string}</span>
                </div>
              ))}
            </div>
          )}
          
          {method.instructions && (
            <div className="mt-2 text-sm text-gray-600 border-t pt-2">
              <p className="font-medium">Instructions</p>
              <p>{method.instructions}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FinancialAccountDetailsPage() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Get accounts from store and remove account function
  const { connectedAccounts, removeAccount } = useFinancialAccountStore();

  // Find the account in the store
  const storedAccount = connectedAccounts.find(a => a.id === accountId);

  // Mock data for demonstration or fallback if the store doesn't have the account
  const mockAccount = {
    id: accountId || 'unknown',
    accountName: "Sample Account",
    accountType: "Checking",
    accountSubtype: "Personal",
    currency: "USD",
    mask: "1234",
    institution: {
      name: "Example Bank",
      logo: "",
      country: "US",
      primary_color: "#0066CC"
    },
    balances: {
      available: 2500,
      current: 2750,
      limit: null
    },
    accountHolder: {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1 (555) 123-4567",
      holderType: "individual",
      verificationStatus: "verified",
      taxId: "123456789"
    },
    paymentCapabilities: {
      zelle: {
        enabled: true,
        email: "john.doe@example.com",
        phone: "+1 (555) 123-4567"
      },
      wire: {
        enabled: true,
        swift_code: "EXAMPUS33",
        routing_number: "021000021"
      },
      ach: {
        enabled: true
      }
    },
    connectivity: {
      provider: "plaid",
      lastSynced: new Date().toISOString(),
      syncStatus: "connected",
      dataPermissions: ["transactions", "balance", "identity", "accounts"]
    },
    regionalDetails: {
      routingNumber: "021000021",
      accountNumber: "********7890",
      regulatoryStatus: "FDIC Insured"
    },
    status: "active",
    riskLevel: "low",
    kycStatus: "verified",
    openedDate: "2022-01-15T00:00:00Z",
    lastVerification: new Date().toISOString(),
    complianceNotes: "Account verified through standard KYC procedures. No suspicious activity detected."
  };

  // Fetch account details or use mock data
  const { data: account, isLoading, error, refetch } = useQuery({
    queryKey: ['financialAccount', accountId],
    queryFn: async () => {
      try {
        const response = await axios.get(`/api/financial-accounts/${accountId}`);
        return response.data;
      } catch (error) {
        console.error("Error fetching account:", error);
        return storedAccount?.account || mockAccount;
      }
    },
    initialData: storedAccount?.account || mockAccount,
    enabled: !!accountId
  });

  // Function to format currency
  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Function to handle back button click
  const handleBack = () => {
    navigate('/maker');
  };
  
  // Function to handle account deletion
  const handleDeleteAccount = async () => {
    if (!accountId) return;
    
    setIsDeleting(true);
    try {
      // Delete the account from the API
      await axios.delete(`/api/financial-accounts/${accountId}`);
      
      // Remove from the store using ID (string) instead of index (number)
      removeAccount(accountId as string);
      
      toast({
        title: "Account deleted",
        description: "The financial account has been successfully deleted",
        variant: "default",
      });
      
      // Navigate back to the dashboard
      navigate('/maker');
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete the account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to get status badge color
  const getStatusBadgeColor = (status: string | undefined) => {
    if (!status) return "bg-gray-400";

    switch (status.toLowerCase()) {
      case 'active':
        return "bg-green-500";
      case 'inactive':
        return "bg-yellow-500";
      case 'suspended':
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  // Function to get connectivity status badge
  const getConnectivityStatusBadge = () => {
    if (!account?.connectivity?.syncStatus) return (
      <Badge variant="outline" className="bg-gray-200">
        <Clock className="w-3 h-3 mr-1" />
        Unknown
      </Badge>
    );

    switch (account.connectivity.syncStatus) {
      case 'connected':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-200">
            <Clock className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-red-800">Error Loading Account</h2>
          <p className="text-red-700">There was an error loading the account details. Please try again later.</p>
          <Button onClick={() => refetch()} className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green/20 pt-20 px-6 py-8"> {/* Updated green background opacity */}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="bg-background rounded-lg shadow-sm w-full px-6 pb-8">
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <Button variant="ghost" onClick={handleBack} className="mb-2 p-0 h-auto">
                ← Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-center md:text-left">{account?.accountName || "Sample Account"}</h1>
              <div className="flex items-center gap-2 mt-1">
                {account?.institution?.country && (
                  <span className="text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                    {account.institution.country}
                  </span>
                )}
                <span className="text-gray-600">
                  {account?.institution?.name || "Example Bank"}
                </span>
                {account?.status && (
                  <Badge variant="secondary" className={`${getStatusBadgeColor(account.status)} text-white ml-2`}>
                    {account.status || "active"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 md:mt-0 flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              {/* Delete account confirmation dialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      financial account and remove its data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div> 
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="px-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Balance Card */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CircleDollarSign className="h-5 w-5 text-primary" />
                  Balance Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Available Balance</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(account?.balances?.available || 0, account?.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current Balance</p>
                    <p className="text-lg">
                      {formatCurrency(account?.balances?.current || 0, account?.currency)}
                    </p>
                  </div>
                  {account?.balances?.limit !== null && account?.balances?.limit !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Credit Limit</p>
                      <p className="text-lg">
                        {formatCurrency(account.balances.limit, account.currency)}
                      </p>
                    </div>
                  )}
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Currency</p>
                    <p className="text-md">{account?.currency || 'USD'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Details Card */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Account Type</p>
                    <p className="font-medium">{account?.accountType || 'Unknown'} {account?.accountSubtype ? `(${account.accountSubtype})` : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Account Number</p>
                    <p className="font-medium">•••• {account?.mask || '****'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Institution</p>
                    <p className="font-medium">{account?.institution?.name || 'Unknown Institution'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Routing Number</p>
                    <p className="font-medium">{account?.paymentCapabilities?.wire?.routing_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Country</p>
                    <div className="flex items-center gap-2">
                      {account?.institution?.country && (
                        <span className="text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                          {account.institution.country}
                        </span>
                      )}
                      <p className="font-medium">
                        {account?.institution?.country ? 
                          new Intl.DisplayNames(['en'], {type: 'region'}).of(account.institution.country) : 
                          'Unknown'
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Regulatory Status</p>
                    <p className="font-medium">{account?.regionalDetails?.regulatoryStatus || 'Unknown'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Connection Status</p>
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-2">
                        {getConnectivityStatusBadge()}
                        {account?.connectivity?.lastSynced && (
                          <span className="text-sm text-gray-500">
                            Last updated: {new Date(account.connectivity.lastSynced).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {account?.connectivity?.provider && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Connectivity Provider</p>
                          <p className="font-medium flex items-center gap-2">
                            {account.connectivity.provider === 'plaid' && <Globe className="h-4 w-4 text-blue-500" />}
                            {account.connectivity.provider === 'mono' && <Globe className="h-4 w-4 text-purple-500" />}
                            {account.connectivity.provider === 'truelayer' && <Globe className="h-4 w-4 text-green-500" />}
                            {account.connectivity.provider === 'stripe' && <Globe className="h-4 w-4 text-indigo-500" />}
                            {account.connectivity.provider.charAt(0).toUpperCase() + account.connectivity.provider.slice(1)}
                          </p>
                        </div>
                      )}
                      {account?.connectivity?.dataPermissions && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Data Permissions</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {account.connectivity.dataPermissions.map((permission: string, index: number) => (
                              <Badge key={index} variant="outline" className="bg-blue-50">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Currency</p>
                    <p className="font-medium">{account?.currency || 'USD'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment Methods</p>
                    <div>
                      {account?.metadata && typeof account?.metadata === 'object' && (
                        <AccountPaymentMethodDetails metadata={account.metadata as any} />
                      )}
                      {(!account?.metadata || typeof account?.metadata !== 'object') && (
                        <p className="font-medium">No payment methods configured.</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Holder Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  Account Holder
                </CardTitle>
              </CardHeader>
              <CardContent>
                {account?.accountHolder ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="font-medium">{account.accountHolder.name}</p>
                    </div>
                    {account.accountHolder.holderType && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Type</p>
                        <p className="font-medium capitalize">
                          {account.accountHolder.holderType}
                          {account.accountHolder.verificationStatus && (
                            <Badge variant="outline" className="ml-2 bg-green-50">
                              {account.accountHolder.verificationStatus}
                            </Badge>
                          )}
                        </p>
                      </div>
                    )}
                    {account.accountHolder.email && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="font-medium">{account.accountHolder.email}</p>
                      </div>
                    )}
                    {account.accountHolder.phone && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="font-medium">{account.accountHolder.phone}</p>
                      </div>
                    )}
                    {account.accountHolder.taxId && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Tax ID</p>
                        <p className="font-medium">••••{account.accountHolder.taxId.slice(-4)}</p>
                      </div>
                    )}
                    {account.accountHolder.address && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Address</p>
                          <p className="font-medium">
                            {account.accountHolder.address.street}, <br />
                            {account.accountHolder.address.city}, {account.accountHolder.address.state} {account.accountHolder.address.zip}<br />
                            {account.accountHolder.address.country && 
                              new Intl.DisplayNames(['en'], {type: 'region'}).of(account.accountHolder.address.country)
                            }
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No account holder information available.</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {account?.paymentCapabilities?.zelle && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={account.paymentCapabilities.zelle.enabled ? "default" : "outline"}>
                          Zelle
                        </Badge>
                        <span className={account.paymentCapabilities.zelle.enabled ? "text-green-600" : "text-gray-400"}>
                          {account.paymentCapabilities.zelle.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      {account.paymentCapabilities.zelle.enabled && (
                        <div className="pl-6 text-sm">
                          {account.paymentCapabilities.zelle.email && (
                            <p>Email: {account.paymentCapabilities.zelle.email}</p>
                          )}
                          {account.paymentCapabilities.zelle.phone && (
                            <p>Phone: {account.paymentCapabilities.zelle.phone}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {account?.paymentCapabilities?.wire && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={account.paymentCapabilities.wire.enabled ? "default" : "outline"}>
                          Wire Transfer
                        </Badge>
                        <span className={account.paymentCapabilities.wire.enabled ? "text-green-600" : "text-gray-400"}>
                          {account.paymentCapabilities.wire.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      {account.paymentCapabilities.wire.enabled && (
                        <div className="pl-6 text-sm">
                          {account.paymentCapabilities.wire.swift_code && (
                            <p>SWIFT Code: {account.paymentCapabilities.wire.swift_code}</p>
                          )}
                          {account.paymentCapabilities.wire.routing_number && (
                            <p>Routing Number: {account.paymentCapabilities.wire.routing_number}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {account?.paymentCapabilities?.ach && (
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={account.paymentCapabilities.ach.enabled ? "default" : "outline"}>
                          ACH Transfer
                        </Badge>
                        <span className={account.paymentCapabilities.ach.enabled ? "text-green-600" : "text-gray-400"}>
                          {account.paymentCapabilities.ach.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  )}

                  {(!account?.paymentCapabilities?.zelle && 
                    !account?.paymentCapabilities?.wire && 
                    !account?.paymentCapabilities?.ach) && (
                    <p className="text-gray-500">No payment capabilities configured.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security and Compliance Card */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Security & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Risk Assessment</p>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={
                        account?.riskLevel === "high" ? "bg-red-50 text-red-800" : 
                        account?.riskLevel === "medium" ? "bg-yellow-50 text-yellow-800" : 
                        "bg-green-50 text-green-800"
                      }
                    >
                      {account?.riskLevel ? account.riskLevel.toUpperCase() : "LOW"} RISK
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Last Verification</p>
                  <p className="font-medium">
                    {account?.lastVerification ? 
                      new Date(account.lastVerification).toLocaleDateString() : 
                      "Not verified yet"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">KYC Status</p>
                  <Badge 
                    variant="outline" 
                    className={
                      account?.kycStatus === "verified" ? "bg-green-50 text-green-800" : 
                      account?.kycStatus === "pending" ? "bg-yellow-50 text-yellow-800" : 
                      "bg-red-50 text-red-800"
                    }
                  >
                    {account?.kycStatus ? account.kycStatus.toUpperCase() : "PENDING"}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Account Age</p>
                  <p className="font-medium">
                    {account?.openedDate ? 
                      `${Math.floor((new Date().getTime() - new Date(account.openedDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months` : 
                      "Unknown"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-sm text-gray-600">
                    {account?.complianceNotes || "No compliance notes available for this account."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="px-2">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>View your recent transactions for this account.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Transaction history is not available at this time.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="px-2">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Payment Methods Configuration</CardTitle>
              <CardDescription>Manage your payment methods for this account</CardDescription>
            </CardHeader>
            <CardContent>
              {account?.metadata && typeof account?.metadata === 'object' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-lg mb-3">Available Payment Methods</h3>
                    <AccountPaymentMethodDetails metadata={account.metadata as any} />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium text-lg mb-3">Add New Payment Method</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      You can add more payment methods to this account to expand your payment options.
                    </p>
                    <Button variant="outline" disabled>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 mb-4">This account doesn't have any payment methods configured yet.</p>
                  <Button variant="outline" disabled>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add First Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="px-2">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account settings and preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Account settings are not available at this time.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}