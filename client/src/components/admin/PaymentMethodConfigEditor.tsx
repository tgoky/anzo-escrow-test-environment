import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getCountryCodes } from '@/lib/countries';
// We're no longer using dnd-kit for sorting, using up/down buttons instead

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  BanknoteIcon,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Pencil,
  PlusCircle,
  Save,
  Trash2,
  XCircle,
  CheckCircle,
  Copy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface PaymentMethodConfig {
  currency: string;
  methodType: string;
  uniqueMethodId?: string; // Format: methodType_CURRENCY (e.g., zelle_USD)
  name: string;
  description: string;
  enabled: boolean;
  accountType: string; // 'bank_account', 'e-wallet', 'mobile_money', 'crypto_wallet', 'cash'
  fields: PaymentMethodField[];
}

interface PaymentMethodField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  position?: number;     // Optional position for ordering
  validation?: string;   // Field validation rules
  copyable?: boolean;    // Whether to show a copy button
}

// FieldRow component with up/down buttons for reordering
const FieldRow = ({ 
  field, 
  onEdit, 
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: { 
  field: PaymentMethodField;
  onEdit: (field: PaymentMethodField) => void;
  onRemove: (fieldName: string) => void;
  onMoveUp: (fieldName: string) => void;
  onMoveDown: (fieldName: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) => {
  return (
    <TableRow>
      <TableCell className="w-10">
        <div className="flex flex-col gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 h-6" 
            onClick={() => onMoveUp(field.name)}
            disabled={isFirst}
          >
            <ChevronUp className="h-3 w-3 text-gray-400" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 h-6" 
            onClick={() => onMoveDown(field.name)}
            disabled={isLast}
          >
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </Button>
        </div>
      </TableCell>
      <TableCell>{field.name}</TableCell>
      <TableCell>{field.label}</TableCell>
      <TableCell>{field.type}</TableCell>
      <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
      <TableCell>{field.copyable ? 'Yes' : 'No'}</TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(field)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(field.name)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function PaymentMethodConfigEditor({ connectedWallet }: { connectedWallet: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [editingConfig, setEditingConfig] = useState<PaymentMethodConfig | null>(null);
  const [editingField, setEditingField] = useState<PaymentMethodField | null>(null);
  const [newFieldDialogOpen, setNewFieldDialogOpen] = useState(false);
  const [addingNewMethod, setAddingNewMethod] = useState(false);
  const [newMethodData, setNewMethodData] = useState<Partial<PaymentMethodConfig>>({
    currency: '',
    methodType: '',
    uniqueMethodId: undefined,
    name: '',
    description: '',
    enabled: true,
    accountType: 'bank_account', // Default account type
    fields: []
  });

  // Query for currencies
  const currenciesQuery = useQuery({
    queryKey: ['admin', 'payment-methods', 'currencies'],
    queryFn: async () => {
      const response = await apiRequest({
        url: '/api/admin/payment-methods/currencies',
        method: 'GET',
        headers: { 'x-wallet-address': connectedWallet }
      });
      const data = await response.json();
      console.log('✅ Currencies data received:', data);
      
      // Handle structured response format
      if (data && typeof data === 'object' && 'currencies' in data && Array.isArray(data.currencies)) {
        console.log(`✅ Found ${data.currencies.length} currencies in structured response`);
        return data.currencies;
      }
      
      // Fallback to direct array response
      if (Array.isArray(data)) {
        console.log(`✅ Found ${data.length} currencies in array response`);
        return data;
      }
      
      // Log error for unexpected data format
      console.error('❌ Unexpected currency data format:', data);
      return ['USD']; // Default fallback for safety
    },
    enabled: !!connectedWallet
  });

  // Query for payment method configurations by currency
  const paymentMethodsQuery = useQuery({
    queryKey: ['admin', 'payment-methods', selectedCurrency],
    queryFn: async () => {
      const response = await apiRequest({
        url: `/api/admin/payment-methods/${selectedCurrency}`,
        method: 'GET',
        headers: { 'x-wallet-address': connectedWallet }
      });
      return await response.json();
    },
    enabled: !!connectedWallet && !!selectedCurrency
  });

  // Mutation to update payment method configuration
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (config: PaymentMethodConfig) => {
      const response = await apiRequest({
        url: `/api/admin/payment-methods/${config.currency}/${config.methodType}`,
        method: 'PUT',
        headers: { 'x-wallet-address': connectedWallet },
        data: config
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Configuration updated",
        description: "Payment method configuration has been updated successfully.",
      });
      // Invalidate the specific currency's payment methods query
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods', selectedCurrency] });
      
      // Also invalidate the general payment methods queries that might be used in other parts of the app
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      
      // Invalidate specific country and currency combinations that might be used
      getCountryCodes().forEach(countryCode => {
        console.log(`🔄 Invalidating cache for [payment-methods, ${selectedCurrency}, ${countryCode}]`);
        queryClient.invalidateQueries({ 
          queryKey: ['payment-methods', selectedCurrency, countryCode] 
        });
      });
      
      // Refetch the payment methods immediately to update the UI
      paymentMethodsQuery.refetch();
      
      setEditingConfig(null);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: `Failed to update payment method configuration: ${error}`,
        variant: "destructive"
      });
    }
  });

  // Mutation to enable/disable payment method
  const togglePaymentMethodMutation = useMutation({
    mutationFn: async ({ currency, methodType, enabled }: { currency: string; methodType: string; enabled: boolean }) => {
      const response = await apiRequest({
        url: `/api/admin/payment-methods/${currency}/${methodType}/toggle`,
        method: 'PATCH',
        headers: { 'x-wallet-address': connectedWallet },
        data: { enabled }
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Payment method status has been updated successfully.",
      });
      // Invalidate the specific currency's payment methods query
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods', selectedCurrency] });
      
      // Also invalidate the general payment methods queries that might be used in other parts of the app
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      
      // Invalidate specific country and currency combinations that might be used
      getCountryCodes().forEach(countryCode => {
        console.log(`🔄 Invalidating cache for [payment-methods, ${selectedCurrency}, ${countryCode}]`);
        queryClient.invalidateQueries({ 
          queryKey: ['payment-methods', selectedCurrency, countryCode] 
        });
      });
      
      // Refetch the payment methods immediately to update the UI
      paymentMethodsQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: `Failed to update payment method status: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to delete payment method
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async ({ currency, methodType }: { currency: string; methodType: string }) => {
      const response = await apiRequest({
        url: `/api/admin/payment-methods/${currency}/${methodType}`,
        method: 'DELETE',
        headers: { 'x-wallet-address': connectedWallet }
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Payment method deleted",
        description: "The payment method has been deleted successfully.",
      });
      // Invalidate the specific currency's payment methods query
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods', selectedCurrency] });
      
      // Also invalidate the general payment methods queries that might be used in other parts of the app
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      
      // Invalidate specific country and currency combinations that might be used
      getCountryCodes().forEach(countryCode => {
        console.log(`🔄 Invalidating cache for [payment-methods, ${selectedCurrency}, ${countryCode}]`);
        queryClient.invalidateQueries({ 
          queryKey: ['payment-methods', selectedCurrency, countryCode] 
        });
      });
      
      // Refetch the payment methods immediately to update the UI
      paymentMethodsQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: `Failed to delete payment method: ${error}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation to create new payment method
  const createPaymentMethodMutation = useMutation({
    mutationFn: async (methodData: PaymentMethodConfig) => {
      const response = await apiRequest({
        url: `/api/admin/payment-methods`,
        method: 'POST',
        headers: { 'x-wallet-address': connectedWallet },
        data: methodData
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Payment method created",
        description: "New payment method has been added successfully.",
      });
      // Invalidate the specific currency's payment methods query
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods', selectedCurrency] });
      
      // Also invalidate the general payment methods queries that might be used in other parts of the app
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      
      // Invalidate specific country and currency combinations that might be used
      getCountryCodes().forEach(countryCode => {
        console.log(`🔄 Invalidating cache for [payment-methods, ${selectedCurrency}, ${countryCode}]`);
        queryClient.invalidateQueries({ 
          queryKey: ['payment-methods', selectedCurrency, countryCode] 
        });
      });
      
      // Refetch the payment methods immediately to update the UI
      paymentMethodsQuery.refetch();
      
      setAddingNewMethod(false);
      setNewMethodData({
        currency: selectedCurrency,
        methodType: '',
        uniqueMethodId: undefined,
        name: '',
        description: '',
        enabled: true,
        fields: []
      });
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: `Failed to create payment method: ${error}`,
        variant: "destructive"
      });
    }
  });

  const handleStartEditing = (config: PaymentMethodConfig) => {
    setEditingConfig({ ...config });
  };

  const handleSaveConfig = () => {
    if (editingConfig) {
      updatePaymentMethodMutation.mutate(editingConfig);
    }
  };

  const handleTogglePaymentMethod = (currency: string, methodType: string, currentEnabled: boolean) => {
    togglePaymentMethodMutation.mutate({ 
      currency, 
      methodType, 
      enabled: !currentEnabled 
    });
  };

  const handleAddField = () => {
    if (editingConfig) {
      const newField: PaymentMethodField = {
        name: '',
        label: '',
        type: 'text',
        required: false,
        position: editingConfig.fields.length, // Set position for new field at the end
        validation: '',
        copyable: false,
      };
      setEditingField(newField);
      setNewFieldDialogOpen(true);
    }
  };

  const handleSaveField = () => {
    if (editingConfig && editingField) {
      if (!editingField.name || !editingField.label) {
        toast({
          title: "Validation error",
          description: "Field name and label are required",
          variant: "destructive"
        });
        return;
      }

      // Check if this is a new field or editing existing one
      const existingFieldIndex = editingConfig.fields.findIndex(f => f.name === editingField.name);
      const updatedFields = [...editingConfig.fields];
      
      if (existingFieldIndex >= 0) {
        // Update existing field
        updatedFields[existingFieldIndex] = editingField;
      } else {
        // Add new field
        updatedFields.push(editingField);
      }
      
      setEditingConfig({
        ...editingConfig,
        fields: updatedFields
      });
      
      setEditingField(null);
      setNewFieldDialogOpen(false);
    }
  };

  const handleRemoveField = (fieldName: string) => {
    if (editingConfig) {
      const updatedFields = editingConfig.fields.filter(f => f.name !== fieldName);
      setEditingConfig({
        ...editingConfig,
        fields: updatedFields
      });
    }
  };
  
  // Handlers for moving fields up and down
  const handleMoveFieldUp = (fieldName: string) => {
    if (editingConfig) {
      const fieldIndex = editingConfig.fields.findIndex(f => f.name === fieldName);
      if (fieldIndex > 0) {
        const updatedFields = [...editingConfig.fields];
        // Swap the field with the one above it
        [updatedFields[fieldIndex - 1], updatedFields[fieldIndex]] = 
        [updatedFields[fieldIndex], updatedFields[fieldIndex - 1]];
        
        // Update positions
        updatedFields.forEach((field, idx) => {
          field.position = idx;
        });
        
        setEditingConfig({
          ...editingConfig,
          fields: updatedFields
        });
      }
    }
  };
  
  const handleMoveFieldDown = (fieldName: string) => {
    if (editingConfig) {
      const fieldIndex = editingConfig.fields.findIndex(f => f.name === fieldName);
      if (fieldIndex < editingConfig.fields.length - 1) {
        const updatedFields = [...editingConfig.fields];
        // Swap the field with the one below it
        [updatedFields[fieldIndex], updatedFields[fieldIndex + 1]] = 
        [updatedFields[fieldIndex + 1], updatedFields[fieldIndex]];
        
        // Update positions
        updatedFields.forEach((field, idx) => {
          field.position = idx;
        });
        
        setEditingConfig({
          ...editingConfig,
          fields: updatedFields
        });
      }
    }
  };

  const handleEditField = (field: PaymentMethodField) => {
    setEditingField({ ...field });
    setNewFieldDialogOpen(true);
  };

  // Handle field value changes
  const handleFieldChange = (field: string, value: any) => {
    if (editingField) {
      setEditingField({
        ...editingField,
        [field]: value
      });
    }
  };

  if (currenciesQuery.isLoading) {
    return <div className="py-8 text-center">Loading currencies...</div>;
  }

  // Add handler for deleting payment method
  const handleDeletePaymentMethod = (currency: string, methodType: string) => {
    if (confirm(`Are you sure you want to delete this payment method? This cannot be undone.`)) {
      deletePaymentMethodMutation.mutate({ currency, methodType });
    }
  };

  // Add handler for creating new payment method
  const handleAddNewMethod = () => {
    setNewMethodData({
      currency: selectedCurrency,
      methodType: '',
      uniqueMethodId: undefined,
      name: '',
      description: '',
      enabled: true,
      fields: []
    });
    setAddingNewMethod(true);
  };

  // Save new payment method
  const handleSaveNewMethod = () => {
    if (!newMethodData.methodType || !newMethodData.name) {
      toast({
        title: "Validation error",
        description: "Method type and name are required",
        variant: "destructive"
      });
      return;
    }

    createPaymentMethodMutation.mutate(newMethodData as PaymentMethodConfig);
  };

  // Change handler for new method fields
  const handleNewMethodChange = (field: string, value: any) => {
    // If method type is changing, auto-detect account type based on the method
    if (field === 'methodType') {
      // Define mapping of method types to account types
      const methodToAccountTypeMap: Record<string, string> = {
        // Bank-based methods
        'bank_transfer': 'bank_account',
        'bank_transfer_ng': 'bank_account',
        'faster_payments': 'bank_account',
        'sepa': 'bank_account',
        'ach': 'bank_account',
        'wire': 'bank_account',
        'imps': 'bank_account',
        'zelle': 'bank_account',
        
        // E-wallets
        'paypal': 'e-wallet',
        'revolut': 'e-wallet',
        'venmo': 'e-wallet',
        'cashapp': 'e-wallet',
        
        // Mobile money
        'mpesa': 'mobile_money',
        'mobile_money': 'mobile_money',
        'upi': 'mobile_money',
        'pix': 'mobile_money',
        
        // Crypto
        'bitcoin': 'crypto_wallet',
        'ethereum': 'crypto_wallet',
        'sol': 'crypto_wallet',
        'usdc': 'crypto_wallet',
        'usdt': 'crypto_wallet',
        
        // Cash
        'cash_deposit': 'cash',
        'cash_pickup': 'cash',
        'cash_delivery': 'cash',
      };
      
      // Auto-select account type based on method type
      const detectedAccountType = methodToAccountTypeMap[value] || 'bank_account';
      
      // Generate unique method ID by combining method type with currency
      const uniqueMethodId = `${value}_${newMethodData.currency || selectedCurrency}`;
      
      setNewMethodData({
        ...newMethodData,
        methodType: value,
        accountType: detectedAccountType,
        uniqueMethodId: uniqueMethodId
      });
    } else if (field === 'currency') {
      // Update the unique method ID when currency changes
      const uniqueMethodId = newMethodData.methodType 
        ? `${newMethodData.methodType}_${value}`
        : undefined;
        
      setNewMethodData({
        ...newMethodData,
        currency: value,
        uniqueMethodId: uniqueMethodId
      });
    } else {
      setNewMethodData({
        ...newMethodData,
        [field]: value
      });
    }
  };

  // We no longer need the country handling code since we're removing this feature

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <label className="text-sm font-medium mb-1 block">Currency</label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currenciesQuery.data && Array.isArray(currenciesQuery.data) ? 
                currenciesQuery.data.map((currency: string) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                )) : (
                  <SelectItem value="USD">USD</SelectItem> // Fallback option
                )}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAddNewMethod} className="flex items-center">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {paymentMethodsQuery.isLoading ? (
        <div className="py-8 text-center">Loading payment methods...</div>
      ) : paymentMethodsQuery.data?.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
          {paymentMethodsQuery.data.map((config: PaymentMethodConfig) => (
            <AccordionItem key={config.methodType} value={config.methodType}>
              <AccordionTrigger className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    {config.methodType === 'zelle' && <DollarSign className="h-5 w-5 mr-2 text-blue-500" />}
                    {config.methodType === 'bank_transfer' && <BanknoteIcon className="h-5 w-5 mr-2 text-green-500" />}
                    {config.methodType === 'paypal' && <DollarSign className="h-5 w-5 mr-2 text-indigo-500" />}
                    <span className="font-medium">{config.name}</span>
                  </div>
                  <Badge variant={config.enabled ? "default" : "secondary"} className="ml-2">
                    {config.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-2">
                {editingConfig && editingConfig.methodType === config.methodType ? (
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Method Name</label>
                        <Input 
                          value={editingConfig.name}
                          onChange={(e) => setEditingConfig({...editingConfig, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Method Type</label>
                        <Input 
                          value={editingConfig.methodType}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Unique Method ID</label>
                        <Input 
                          value={editingConfig.uniqueMethodId || `${editingConfig.methodType}_${editingConfig.currency}`}
                          onChange={(e) => setEditingConfig({...editingConfig, uniqueMethodId: e.target.value})}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Unique identifier used for matching. Format should be methodType_CURRENCY (e.g., zelle_USD)
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Description</label>
                      <Input 
                        value={editingConfig.description}
                        onChange={(e) => setEditingConfig({...editingConfig, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Account Type</label>
                      <Select 
                        value={editingConfig.accountType || 'bank_account'} 
                        onValueChange={(value) => setEditingConfig({...editingConfig, accountType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_account">Bank Account</SelectItem>
                          <SelectItem value="e-wallet">E-Wallet</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="crypto_wallet">Crypto Wallet</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Type of financial account this payment method is for
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Status</label>
                      <div className="flex items-center">
                        <Switch 
                          checked={editingConfig.enabled} 
                          onCheckedChange={(checked) => setEditingConfig({...editingConfig, enabled: checked})}
                        />
                        <span className="ml-2">{editingConfig.enabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Required Fields</label>
                        <Button variant="outline" size="sm" onClick={handleAddField} className="flex items-center">
                          <PlusCircle className="h-3 w-3 mr-1" />
                          Add Field
                        </Button>
                      </div>
                      
                      {editingConfig.fields.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead></TableHead>
                              <TableHead>Field Name</TableHead>
                              <TableHead>Label</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Required</TableHead>
                              <TableHead>Copyable</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingConfig.fields.map((field, index) => (
                              <TableRow key={field.name}>
                                <TableCell className="w-8">
                                  <div className="flex flex-col">
                                    {index > 0 && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="px-1 h-6"
                                        onClick={() => handleMoveFieldUp(field.name)}
                                      >
                                        <ChevronUp className="h-4 w-4 text-gray-400" />
                                      </Button>
                                    )}
                                    {index < editingConfig.fields.length - 1 && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="px-1 h-6"
                                        onClick={() => handleMoveFieldDown(field.name)}
                                      >
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>{field.name}</span>
                                    {field.validation && (
                                      <span className="text-xs text-gray-500">
                                        Validation: {field.validation}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{field.label}</TableCell>
                                <TableCell>{field.type}</TableCell>
                                <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                                <TableCell>
                                  {field.copyable ? (
                                    <div className="flex items-center">
                                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                      <Copy className="h-4 w-4 text-gray-400" />
                                    </div>
                                  ) : 'No'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditField(field)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveField(field.name)}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No fields defined yet. Add fields to collect information from users.
                        </div>
                      )}
                    </div>
                    
                    {/* Country selection section removed */}
                    
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setEditingConfig(null)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveConfig}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">Method Name</label>
                        <p className="font-medium">{config.name}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Method Type</label>
                        <p className="font-medium">{config.methodType}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Description</label>
                      <p>{config.description}</p>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500">Account Type</label>
                      <p className="flex items-center">
                        {(() => {
                          switch(config.accountType) {
                            case 'bank_account':
                              return <><BanknoteIcon className="h-4 w-4 mr-1 text-blue-500" /> Bank Account</>;
                            case 'e-wallet':
                              return <><DollarSign className="h-4 w-4 mr-1 text-green-500" /> E-Wallet</>;
                            case 'mobile_money':
                              return <><DollarSign className="h-4 w-4 mr-1 text-purple-500" /> Mobile Money</>;
                            case 'crypto_wallet':
                              return <><DollarSign className="h-4 w-4 mr-1 text-yellow-500" /> Crypto Wallet</>;
                            case 'cash':
                              return <><BanknoteIcon className="h-4 w-4 mr-1 text-green-500" /> Cash</>;
                            default:
                              return config.accountType || 'Bank Account';
                          }
                        })()}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500">Required Fields</label>
                      {config.fields.length > 0 ? (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {config.fields.map(field => (
                            <div key={field.name} className="bg-gray-50 p-2 rounded">
                              <p className="font-medium">{field.label}</p>
                              <p className="text-xs text-gray-500">
                                {field.type} · {field.required ? 'Required' : 'Optional'}
                                {field.copyable && ' · Copyable'}
                                {field.validation && ' · Validated'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No fields defined</p>
                      )}
                    </div>
                    
                    {/* Country selection section removed */}
                    
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePaymentMethod(config.currency, config.methodType, config.enabled)}
                      >
                        {config.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEditing(config)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeletePaymentMethod(config.currency, config.methodType)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="py-8 text-center text-gray-500">
          No payment methods defined for {selectedCurrency}. Click "Add Payment Method" to create one.
        </div>
      )}
      
      {/* Add New Method Dialog */}
      {addingNewMethod && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-medium mb-4">Add New Payment Method</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Currency</label>
                <Select 
                  value={newMethodData.currency || selectedCurrency} 
                  onValueChange={(value) => handleNewMethodChange('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currenciesQuery.data && Array.isArray(currenciesQuery.data) ? 
                      currenciesQuery.data.map((currency: string) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      )) : (
                        <SelectItem value="USD">USD</SelectItem> // Fallback option
                      )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Method Type</label>
                <Input 
                  placeholder="e.g., bank_transfer, zelle, mpesa"
                  value={newMethodData.methodType || ''}
                  onChange={(e) => handleNewMethodChange('methodType', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
              </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Account Type</label>
                <Select 
                  value={newMethodData.accountType || 'bank_account'} 
                  onValueChange={(value) => handleNewMethodChange('accountType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_account">Bank Account</SelectItem>
                    <SelectItem value="e-wallet">E-Wallet</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="crypto_wallet">Crypto Wallet</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Type of financial account associated with this payment method.
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Display Name</label>
                <Input 
                  placeholder="e.g., Bank Transfer, Zelle, M-Pesa"
                  value={newMethodData.name || ''}
                  onChange={(e) => handleNewMethodChange('name', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Human-readable name shown to users.
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input 
                  placeholder="e.g., Transfer funds directly to the recipient's bank account"
                  value={newMethodData.description || ''}
                  onChange={(e) => handleNewMethodChange('description', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <div className="flex items-center">
                  <Switch 
                    checked={newMethodData.enabled} 
                    onCheckedChange={(checked) => handleNewMethodChange('enabled', checked)}
                  />
                  <span className="ml-2">{newMethodData.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              
              {/* Countries section removed */}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setAddingNewMethod(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveNewMethod}>
                Create Payment Method
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Field Dialog */}
      {newFieldDialogOpen && editingField && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {editingField.name ? `Edit Field: ${editingField.name}` : 'Add New Field'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Field Name</label>
                <Input 
                  placeholder="e.g., account_number, email_address"
                  value={editingField.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  A unique identifier for this field (lowercase, no spaces).
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Display Label</label>
                <Input 
                  placeholder="e.g., Account Number, Email Address"
                  value={editingField.label}
                  onChange={(e) => handleFieldChange('label', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Human-readable label shown to users.
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Field Type</label>
                <Select 
                  value={editingField.type} 
                  onValueChange={(value) => handleFieldChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="tel">Phone Number</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
                <Input 
                  placeholder="e.g., Enter the 9-digit routing number"
                  value={editingField.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="field-required"
                    checked={editingField.required}
                    onCheckedChange={(checked) => handleFieldChange('required', !!checked)}
                  />
                  <label htmlFor="field-required" className="text-sm">
                    This field is required
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="field-copyable"
                    checked={editingField.copyable}
                    onCheckedChange={(checked) => handleFieldChange('copyable', !!checked)}
                  />
                  <label htmlFor="field-copyable" className="text-sm">
                    Add copy button (useful for account numbers, wallet addresses, etc.)
                  </label>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Validation Pattern (Optional)</label>
                <Input 
                  placeholder="e.g., ^[0-9]{9}$ for a 9-digit number"
                  value={editingField.validation || ''}
                  onChange={(e) => handleFieldChange('validation', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Regular expression pattern to validate field input.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingField(null);
                  setNewFieldDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveField}>
                Save Field
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}