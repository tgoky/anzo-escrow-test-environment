import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '@/lib/walletStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  BarChart,
  ArrowUpDown,
  Users,
  ShieldAlert,
  FileSearch,
  Settings,
  AlertTriangle,
  Database,
  Activity,
  Wallet,
  CreditCard,
  DollarSign,
  BanknoteIcon,
  Building,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import PaymentMethodConfigEditor from '@/components/admin/PaymentMethodConfigEditor';

interface Admin {
  id: number;
  walletAddress: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: number;
  type: 'buy' | 'sell';
  status: string;
  amount: number;
  fiatCurrency: string;
  token: string;
  walletAddress: string;
  counterpartyAddress?: string;
  createdAt: string;
  updatedAt?: string;
  makerWalletAddress?: string;
  takerWalletAddress?: string;
  makerApproval?: boolean;
  takerApproval?: boolean;
  platformApproval?: boolean;
  disputeReason?: string;
}

interface FinancialAccount {
  id: number;
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype?: string;
  currency: string;
  status: 'active' | 'inactive' | 'pending' | 'frozen';
  mask?: string;
  balances: {
    available: number | null;
    current: number | null;
    limit?: number | null;
    iso_currency_code: string;
  };
  institution: {
    id: string;
    name: string;
    type: string;
    logo?: string;
    primary_color?: string;
    country: string;
    url?: string;
  };
  paymentCapabilities: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const { connectedWallet } = useWalletStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [accountFilters, setAccountFilters] = useState({
    currency: '',
    accountType: '',
    status: '',
    search: ''
  });

  // Check if the user is an admin
  const adminStatusQuery = useQuery({
    queryKey: ['admin', 'status'],
    queryFn: async () => {
      if (!connectedWallet) return { isAdmin: false, admin: null };
      const response = await apiRequest({
        url: '/api/admin/status',
        method: 'GET',
        headers: { 'x-wallet-address': connectedWallet }
      });
      return await response.json();
    },
    enabled: !!connectedWallet
  });

  // Fetch all admins
  const adminsQuery = useQuery({
    queryKey: ['admin', 'admins'],
    queryFn: async () => {
      if (!connectedWallet) return [];
      const response = await apiRequest({
        url: '/api/admin/admins',
        method: 'GET',
        headers: { 'x-wallet-address': connectedWallet }
      });
      return await response.json();
    },
    enabled: !!connectedWallet && adminStatusQuery.data?.isAdmin
  });

  // Fetch all transactions
  const transactionsQuery = useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn: async () => {
      if (!connectedWallet) return [];
      const response = await apiRequest({
        url: '/api/admin/transactions',
        method: 'GET',
        headers: { 'x-wallet-address': connectedWallet }
      });
      return await response.json();
    },
    enabled: !!connectedWallet && adminStatusQuery.data?.isAdmin
  });
  
  // Fetch all financial accounts
  const financialAccountsQuery = useQuery({
    queryKey: ['admin', 'financial-accounts', accountFilters],
    queryFn: async () => {
      if (!connectedWallet) return [];
      
      // Build query parameters
      const params = new URLSearchParams();
      if (accountFilters.currency) params.append('currency', accountFilters.currency);
      if (accountFilters.accountType) params.append('accountType', accountFilters.accountType);
      if (accountFilters.status) params.append('status', accountFilters.status);
      if (accountFilters.search) params.append('search', accountFilters.search);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const response = await apiRequest({
        url: `/api/admin/financial-accounts${queryString}`,
        method: 'GET',
        headers: { 'x-wallet-address': connectedWallet }
      });
      return await response.json();
    },
    enabled: !!connectedWallet && adminStatusQuery.data?.isAdmin
  });
  
  // Fetch financial account stats
  const accountStatsQuery = useQuery({
    queryKey: ['admin', 'financial-accounts', 'stats'],
    queryFn: async () => {
      if (!connectedWallet) return null;
      const response = await apiRequest({
        url: '/api/admin/financial-accounts/stats',
        method: 'GET',
        headers: { 'x-wallet-address': connectedWallet }
      });
      return await response.json();
    },
    enabled: !!connectedWallet && adminStatusQuery.data?.isAdmin
  });

  // Count active disputes
  const activeDisputes = transactionsQuery.data?.filter(
    (tx: Transaction) => tx.status === 'dispute'
  ) || [];

  // Pending approvals
  const pendingApprovals = transactionsQuery.data?.filter(
    (tx: Transaction) => tx.status === 'verification' && !tx.platformApproval
  ) || [];

  if (!connectedWallet) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="mt-2">Please connect your wallet to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (adminStatusQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="mt-2">Loading admin status...</p>
        </div>
      </div>
    );
  }

  if (adminStatusQuery.isError || !adminStatusQuery.data?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="mt-2">You do not have admin privileges.</p>
          <p>Connected wallet: {connectedWallet}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">
            Manage your platform's operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            {adminStatusQuery.data?.admin?.role || 'Admin'}
          </Badge>
          <div className="text-sm text-right">
            <div className="font-medium">
              {adminStatusQuery.data?.admin?.name || 'Admin User'}
            </div>
            <div className="text-xs text-gray-500">
              {connectedWallet?.substring(0, 8)}...
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactionsQuery.data?.length || 0}
            </div>
            <p className="text-xs text-gray-500">+12.5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeDisputes.length}
            </div>
            <p className="text-xs text-gray-500">
              {activeDisputes.length > 0 ? 'Requires attention' : 'No open disputes'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingApprovals.length}
            </div>
            <p className="text-xs text-gray-500">
              {pendingApprovals.length > 0 ? 'Waiting for review' : 'No pending approvals'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Financial Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountStatsQuery.data?.totalAccounts || 0}
            </div>
            <p className="text-xs text-gray-500">
              {accountStatsQuery.data?.byStatus?.active || 0} active accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminsQuery.data?.length || 0}
            </div>
            <p className="text-xs text-gray-500">
              {adminsQuery.data?.filter((admin: Admin) => admin.isActive).length || 0} active
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 md:w-fit w-full">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span className="hidden md:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="financial-accounts" className="flex items-center gap-1">
            <BanknoteIcon className="h-4 w-4" />
            <span className="hidden md:inline">Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="disputes" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden md:inline">Disputes</span>
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Admins</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
              <CardDescription>
                Key metrics and platform performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px] overflow-hidden">
                    <ScrollArea className="h-[280px]">
                      {transactionsQuery.isLoading ? (
                        <div className="text-center py-4">Loading transactions...</div>
                      ) : transactionsQuery.data?.length > 0 ? (
                        <ul className="space-y-2">
                          {transactionsQuery.data.slice(0, 10).map((tx: Transaction) => (
                            <li key={tx.id} className="border-b pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">
                                    {tx.type === 'buy' ? 'Buy' : 'Sell'} {tx.token}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(tx.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                <Badge variant={
                                  tx.status === 'completed' ? 'default' :
                                  tx.status === 'dispute' ? 'destructive' :
                                  tx.status === 'matched' ? 'secondary' :
                                  'outline'
                                }>
                                  {tx.status}
                                </Badge>
                              </div>
                              <div className="text-sm mt-1">
                                {tx.amount} {tx.fiatCurrency} - ID: {tx.id}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center py-4">No transactions found</div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Dispute Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px] overflow-hidden">
                    <ScrollArea className="h-[280px]">
                      {activeDisputes.length > 0 ? (
                        <ul className="space-y-2">
                          {activeDisputes.map((dispute: Transaction) => (
                            <li key={dispute.id} className="border-b pb-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">
                                    Dispute #{dispute.id}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(dispute.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                <Badge variant="destructive">
                                  Active
                                </Badge>
                              </div>
                              <div className="text-sm mt-1">
                                {dispute.type === 'buy' ? 'Buy' : 'Sell'} {dispute.token} - {dispute.amount} {dispute.fiatCurrency}
                              </div>
                              {dispute.disputeReason && (
                                <div className="text-xs mt-1 text-gray-500">
                                  Reason: {dispute.disputeReason.substring(0, 60)}
                                  {dispute.disputeReason.length > 60 ? '...' : ''}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center py-4">No active disputes</div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Management</CardTitle>
              <CardDescription>
                View and manage all platform transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableCaption>List of all transactions on the platform</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          Loading transactions...
                        </TableCell>
                      </TableRow>
                    ) : transactionsQuery.data?.length > 0 ? (
                      transactionsQuery.data.map((tx: Transaction) => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.id}</TableCell>
                          <TableCell>
                            <Badge variant={tx.type === 'buy' ? 'default' : 'secondary'}>
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.amount} {tx.fiatCurrency}</TableCell>
                          <TableCell>{tx.token}</TableCell>
                          <TableCell>
                            <Badge variant={
                              tx.status === 'completed' ? 'default' :
                              tx.status === 'dispute' ? 'destructive' :
                              tx.status === 'matched' ? 'secondary' :
                              'outline'
                            }>
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial-accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Accounts Management</CardTitle>
              <CardDescription>
                View and manage platform financial accounts and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Currency</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md"
                    value={accountFilters.currency}
                    onChange={(e) => setAccountFilters({...accountFilters, currency: e.target.value})}
                  >
                    <option value="">All Currencies</option>
                    {accountStatsQuery.data?.byCurrency && Object.keys(accountStatsQuery.data.byCurrency).map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Account Type</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md"
                    value={accountFilters.accountType}
                    onChange={(e) => setAccountFilters({...accountFilters, accountType: e.target.value})}
                  >
                    <option value="">All Types</option>
                    {accountStatsQuery.data?.byAccountType && Object.keys(accountStatsQuery.data.byAccountType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md"
                    value={accountFilters.status}
                    onChange={(e) => setAccountFilters({...accountFilters, status: e.target.value})}
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="frozen">Frozen</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Search</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Search account name or ID"
                    value={accountFilters.search}
                    onChange={(e) => setAccountFilters({...accountFilters, search: e.target.value})}
                  />
                </div>
              </div>

              <ScrollArea className="h-[500px]">
                <Table>
                  <TableCaption>Financial accounts on the platform</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialAccountsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          Loading accounts...
                        </TableCell>
                      </TableRow>
                    ) : financialAccountsQuery.data?.length > 0 ? (
                      financialAccountsQuery.data.map((account: FinancialAccount) => (
                        <TableRow key={account.id}>
                          <TableCell>{account.id}</TableCell>
                          <TableCell>{account.accountName}</TableCell>
                          <TableCell>
                            {account.institution?.name || 'N/A'}
                          </TableCell>
                          <TableCell>{account.currency}</TableCell>
                          <TableCell>{account.accountType}</TableCell>
                          <TableCell>
                            <Badge variant={
                              account.status === 'active' ? 'default' :
                              account.status === 'pending' ? 'secondary' :
                              account.status === 'frozen' ? 'destructive' :
                              'outline'
                            }>
                              {account.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No financial accounts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Payment methods statistics section */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Payment Methods Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {accountStatsQuery.data?.byPaymentMethod && Object.entries(accountStatsQuery.data.byPaymentMethod).map(([method, count]) => (
                    <Card key={method}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          {method === 'wire' && <BanknoteIcon className="h-4 w-4 mr-2" />}
                          {method === 'ach' && <Building className="h-4 w-4 mr-2" />}
                          {method === 'zelle' && <DollarSign className="h-4 w-4 mr-2" />}
                          {method === 'sepa' && <Building className="h-4 w-4 mr-2" />}
                          {method.toUpperCase()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          {String(typeof count === 'number' ? count : 0)} accounts
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Supported payment method
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Resolution</CardTitle>
              <CardDescription>
                Manage and resolve transaction disputes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeDisputes.length > 0 ? (
                <div className="space-y-4">
                  {activeDisputes.map((dispute: Transaction) => (
                    <Card key={dispute.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-lg">
                            Dispute #{dispute.id}
                          </CardTitle>
                          <Badge variant="destructive">Active</Badge>
                        </div>
                        <CardDescription>
                          {new Date(dispute.createdAt).toLocaleString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-1">Transaction Details</h4>
                            <ul className="space-y-1 text-sm">
                              <li><span className="font-medium">Type:</span> {dispute.type}</li>
                              <li><span className="font-medium">Amount:</span> {dispute.amount} {dispute.fiatCurrency}</li>
                              <li><span className="font-medium">Token:</span> {dispute.token}</li>
                              <li><span className="font-medium">Taker:</span> {dispute.walletAddress?.substring(0, 8)}...</li>
                              <li><span className="font-medium">Maker:</span> {dispute.counterpartyAddress?.substring(0, 8)}...</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Dispute Information</h4>
                            <p className="text-sm">
                              {dispute.disputeReason || 'No reason provided'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          View Evidence
                        </Button>
                        <Button variant="destructive" size="sm">
                          Resolve for Maker
                        </Button>
                        <Button variant="default" size="sm">
                          Resolve for Taker
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <ShieldAlert className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium">No Active Disputes</h3>
                  <p className="text-gray-500 mt-2">
                    All transactions are currently running smoothly
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>
                View and manage platform administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button variant="default">
                  <Users className="mr-2 h-4 w-4" />
                  Add New Admin
                </Button>
              </div>
              
              <Table>
                <TableCaption>List of all platform administrators</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Loading admins...
                      </TableCell>
                    </TableRow>
                  ) : adminsQuery.data?.length > 0 ? (
                    adminsQuery.data.map((admin: Admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>{admin.id}</TableCell>
                        <TableCell>{admin.name}</TableCell>
                        <TableCell>{admin.walletAddress.substring(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={admin.isActive ? 'default' : 'secondary'}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                            {admin.isActive ? (
                              <Button variant="destructive" size="sm">
                                Deactivate
                              </Button>
                            ) : (
                              <Button variant="default" size="sm">
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No admins found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings and options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Transaction Settings</h3>
                  <Separator className="mb-4" />
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium">Default Transaction Timeout (hours)</label>
                        <p className="text-sm text-gray-500">Set how long before pending transactions expire</p>
                      </div>
                      <div>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-md" 
                          defaultValue={24} 
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium">Platform Fee (%)</label>
                        <p className="text-sm text-gray-500">Transaction fee charged by the platform</p>
                      </div>
                      <div>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-md" 
                          defaultValue={1.5} 
                          step={0.1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Security Settings</h3>
                  <Separator className="mb-4" />
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium">Required Approvals</label>
                        <p className="text-sm text-gray-500">Number of admins required to approve large transactions</p>
                      </div>
                      <div>
                        <select className="w-full p-2 border rounded-md">
                          <option value="1">1 Admin</option>
                          <option value="2" selected>2 Admins</option>
                          <option value="3">3 Admins</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-medium">Large Transaction Threshold</label>
                        <p className="text-sm text-gray-500">Amount above which additional approvals are required (USD)</p>
                      </div>
                      <div>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-md" 
                          defaultValue={5000} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline">
                Reset
              </Button>
              <Button variant="default">
                Save Changes
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Configuration</CardTitle>
              <CardDescription>
                Configure available payment methods by currency and define required fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectedWallet && (
                <PaymentMethodConfigEditor connectedWallet={connectedWallet} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}