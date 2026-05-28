import { useState, useEffect } from 'react';
import type { FinancialAccount } from '@shared/types/financial-account';
import {
  Mail,
  Phone,
  User,
  Globe,
  Euro,
  Smartphone,
  DollarSign,
  CreditCard,
  Banknote,
  Building,
  QrCode,
  Wifi,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

/**
 * Helper function to get a display name for a payment method type
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
  
  return displayNames[type] || type.replace(/_/g, ' ');
}

interface PaymentInfoType {
  holderName?: string;
  accountName?: string;
  email?: string;
  phone?: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  bic?: string;
  swiftCode?: string;
  upiId?: string;
  pixKey?: string;
  bankName?: string;
  otherDetails?: Record<string, string>;
}

interface AccountPaymentDisplayProps {
  account: FinancialAccount;
  onDelete?: (accountId: string) => void;
}

export function AccountPaymentDisplay({ account, onDelete }: AccountPaymentDisplayProps) {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [primaryMethod, setPrimaryMethod] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfoType>({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Extract payment information on component mount
  useEffect(() => {
    // Extract primary payment method
    const extractPrimaryMethod = () => {
      // Look for payment method in different possible structures
      if (account.paymentCapabilities) {
        if (account.paymentCapabilities.zelle?.enabled) {
          setPrimaryMethod({
            id: 'zelle',
            name: 'Zelle',
            description: 'Fast bank-to-bank transfers in the US'
          });
          return;
        }
        
        if (account.paymentCapabilities.wire?.enabled) {
          setPrimaryMethod({
            id: 'wire',
            name: 'Wire Transfer',
            description: 'International wire transfer'
          });
          return;
        }
        
        if (account.paymentCapabilities.sepa?.enabled) {
          setPrimaryMethod({
            id: 'sepa',
            name: 'SEPA Transfer',
            description: 'European payment system'
          });
          return;
        }
      }
      
      // Check for manual account details
      if ('manualDetails' in account) {
        const manualAccount = account as any;
        if (manualAccount.manualDetails && Array.isArray(manualAccount.manualDetails.paymentMethods) && manualAccount.manualDetails.paymentMethods.length > 0) {
          const method = manualAccount.manualDetails.paymentMethods[0];
          setPrimaryMethod({
            id: method.type,
            name: method.provider || getDisplayNameForPaymentMethod(method.type),
            description: `${method.type} payment method`
          });
          return;
        }
      }
      
      // Fallback
      setPrimaryMethod(null);
    };
    
    // Extract payment information from all possible sources
    const extractPaymentInfo = () => {
      const info: PaymentInfoType = {};
      
      // Get account holder name from account if available
      if (account.accountHolder?.individual?.name?.fullName) {
        info.holderName = account.accountHolder.individual.name.fullName;
      }
      
      // Add account name
      info.accountName = account.accountName;
      
      // Extract payment information based on payment capabilities
      if (account.paymentCapabilities) {
        // Zelle
        if (account.paymentCapabilities.zelle?.enabled) {
          info.email = account.paymentCapabilities.zelle.email;
          info.phone = account.paymentCapabilities.zelle.phone;
        }
        
        // Wire transfer
        if (account.paymentCapabilities.wire?.enabled) {
          info.swiftCode = account.paymentCapabilities.wire.swift_code;
          info.routingNumber = account.paymentCapabilities.wire.routing_number;
        }
        
        // SEPA
        if (account.paymentCapabilities.sepa?.enabled) {
          info.iban = account.paymentCapabilities.sepa.iban;
          info.bic = account.paymentCapabilities.sepa.bic;
        }
        
        // UPI
        if (account.paymentCapabilities.upi?.enabled) {
          info.upiId = account.paymentCapabilities.upi.id;
        }
        
        // Interac
        if (account.paymentCapabilities.interac?.enabled) {
          info.email = account.paymentCapabilities.interac.email;
        }
        
        // PIX
        if (account.paymentCapabilities.pix?.enabled) {
          info.pixKey = account.paymentCapabilities.pix.key;
        }
      }
      
      // Check for manual account details
      if ('manualDetails' in account) {
        const manualAccount = account as any;
        if (manualAccount.manualDetails && 
            Array.isArray(manualAccount.manualDetails.paymentMethods) && 
            manualAccount.manualDetails.paymentMethods.length > 0) {
          
          const method = manualAccount.manualDetails.paymentMethods[0];
          const details = method.details || {};
          
          // Extract detailed info
          info.holderName = details.account_holder_name || details.name || info.holderName || account.accountName;
          info.email = details.email || info.email;
          info.phone = details.phone || info.phone;
          info.accountNumber = details.account_number || info.accountNumber;
          info.bankName = details.bank_name || info.bankName;
          info.otherDetails = details;
        }
      }
      
      // Extract from metadata if available
      if (account.metadata && typeof account.metadata === 'object') {
        const metadata = account.metadata as any;
        
        // Look for common fields
        info.holderName = info.holderName || metadata.name || metadata.holderName;
        info.email = info.email || metadata.email;
        info.phone = info.phone || metadata.phone;
      }
      
      // Extract from regional details
      if (account.regionalDetails) {
        info.accountNumber = info.accountNumber || account.regionalDetails.accountNumber;
        info.routingNumber = info.routingNumber || account.regionalDetails.routingNumber;
        info.iban = info.iban || account.regionalDetails.iban;
        info.bic = info.bic || account.regionalDetails.bic;
      }
      
      setPaymentInfo(info);
    };
    
    extractPrimaryMethod();
    extractPaymentInfo();
  }, [account]);
  
  // Get the most appropriate payment info to display prominently
  const getMainPaymentInfo = () => {
    if (!primaryMethod) return null;
    
    if (primaryMethod.id === 'zelle' && paymentInfo.email) {
      return {
        label: 'Email',
        value: paymentInfo.email
      };
    }
    
    if (primaryMethod.id === 'zelle' && paymentInfo.phone) {
      return {
        label: 'Phone',
        value: paymentInfo.phone
      };
    }
    
    if (primaryMethod.id === 'wire' && paymentInfo.swiftCode) {
      return {
        label: 'SWIFT',
        value: paymentInfo.swiftCode
      };
    }
    
    if (primaryMethod.id === 'sepa' && paymentInfo.iban) {
      return {
        label: 'IBAN',
        value: paymentInfo.iban
      };
    }
    
    if (primaryMethod.id === 'upi' && paymentInfo.upiId) {
      return {
        label: 'UPI ID',
        value: paymentInfo.upiId
      };
    }
    
    if (primaryMethod.id === 'interac' && paymentInfo.email) {
      return {
        label: 'Email',
        value: paymentInfo.email
      };
    }
    
    if (primaryMethod.id === 'pix' && paymentInfo.pixKey) {
      return {
        label: 'PIX Key',
        value: paymentInfo.pixKey
      };
    }
    
    if (paymentInfo.accountNumber) {
      return {
        label: 'Account',
        value: paymentInfo.accountNumber.startsWith('•') ? 
               paymentInfo.accountNumber : 
               `••••${paymentInfo.accountNumber.slice(-4)}`
      };
    }
    
    // Fall back to any available detail from otherDetails
    if (paymentInfo.otherDetails) {
      const entries = Object.entries(paymentInfo.otherDetails);
      if (entries.length > 0) {
        const [key, value] = entries[0];
        if (value && typeof value === 'string') {
          return {
            label: key.replace(/_/g, ' '),
            value: value
          };
        }
      }
    }
    
    return null;
  };
  
  // Function to get the proper icon for the payment method
  const getPaymentMethodIcon = () => {
    if (!primaryMethod) return <DollarSign className="h-5 w-5 text-primary" />;
    
    switch (primaryMethod.id) {
      case 'zelle':
        return <CreditCard className="h-5 w-5 text-primary" />;
      case 'cash_deposit':
        return <Banknote className="h-5 w-5 text-primary" />;
      case 'bank_transfer':
        return <Building className="h-5 w-5 text-primary" />;
      case 'wire':
        return <Globe className="h-5 w-5 text-primary" />;
      case 'sepa':
        return <Euro className="h-5 w-5 text-primary" />;
      case 'upi':
        return <Smartphone className="h-5 w-5 text-primary" />;
      case 'pix':
        return <QrCode className="h-5 w-5 text-primary" />;
      case 'interac':
        return <Wifi className="h-5 w-5 text-primary" />;
      default:
        return <DollarSign className="h-5 w-5 text-primary" />;
    }
  };
  
  // Function to render payment method details based on method type
  const renderPaymentMethodDetails = () => {
    // Extract all contact info for display
    const contactInfo = [];
    
    // Name - from all possible sources
    const name = paymentInfo.holderName || 
      account.accountHolder?.individual?.name?.fullName || 
      (account.metadata && (account.metadata as any).name) ||
      '';
    
    if (name) {
      contactInfo.push({ 
        label: 'Name', 
        value: name, 
        icon: <User className="h-4 w-4 text-primary" /> 
      });
    }
    
    // Email - from all possible sources
    const email = paymentInfo.email || 
      account.paymentCapabilities?.zelle?.email || 
      account.paymentCapabilities?.interac?.email || 
      (account.metadata && (account.metadata as any).email) ||
      '';
    
    if (email) {
      contactInfo.push({ 
        label: 'Email', 
        value: email, 
        icon: <Mail className="h-4 w-4 text-primary" /> 
      });
    }
    
    // Phone - from all possible sources
    const phone = paymentInfo.phone || 
      account.paymentCapabilities?.zelle?.phone || 
      (account.metadata && (account.metadata as any).phone) ||
      '';
    
    if (phone) {
      contactInfo.push({ 
        label: 'Phone', 
        value: phone, 
        icon: <Phone className="h-4 w-4 text-primary" /> 
      });
    }
    
    // Other account details
    if (paymentInfo.accountNumber) contactInfo.push({ 
      label: 'Account', 
      value: paymentInfo.accountNumber.startsWith('•') ? paymentInfo.accountNumber : `••••${paymentInfo.accountNumber.slice(-4)}`,
      icon: <CreditCard className="h-4 w-4 text-primary" />
    });
    if (paymentInfo.swiftCode) contactInfo.push({ 
      label: 'SWIFT', 
      value: paymentInfo.swiftCode, 
      icon: <Globe className="h-4 w-4 text-primary" /> 
    });
    if (paymentInfo.iban) contactInfo.push({ 
      label: 'IBAN', 
      value: paymentInfo.iban, 
      icon: <Euro className="h-4 w-4 text-primary" /> 
    });
    if (paymentInfo.upiId) contactInfo.push({ 
      label: 'UPI ID', 
      value: paymentInfo.upiId, 
      icon: <Smartphone className="h-4 w-4 text-primary" /> 
    });
    
    if (contactInfo.length > 0) {
      return (
        <div className="bg-primary/5 p-4 rounded-lg mb-4 shadow-sm">
          <h3 className="text-primary font-bold mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Contact Information
          </h3>
          <div className="grid gap-3">
            {contactInfo.map((info, idx) => (
              <div 
                key={idx} 
                className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2">
                  {info.icon}
                  <span className="font-medium text-primary">{info.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{info.value}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 border-primary/20 hover:bg-primary/10" 
                    onClick={() => {
                      navigator.clipboard.writeText(info.value);
                      toast({
                        title: "Copied!",
                        description: `${info.label} copied to clipboard`,
                        duration: 2000,
                      });
                    }}
                  >
                    <Copy className="h-3 w-3 text-primary" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Get main payment info for prominent display
  const mainInfo = getMainPaymentInfo();
  
  return (
    <div className="w-full">
      {/* Enhanced Payment method card - Binance P2P style with more prominent design */}
      <div className="bg-card border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            {/* Payment method icon and name */}
            <div className="bg-primary/15 p-3 rounded-full shadow-sm">
              {getPaymentMethodIcon()}
            </div>
            <div>
              <div className="font-bold text-lg text-primary">
                {primaryMethod?.name || account.accountName}
              </div>
              <div className="text-sm font-medium">
                {/* Show name from all possible sources */}
                {paymentInfo.holderName || 
                  account.accountHolder?.individual?.name?.fullName || 
                  (account.metadata && (account.metadata as any).name) || 
                  account.accountName}
              </div>
              {/* Always show email as it's a critical piece of contact info */}
              {(paymentInfo.email || 
                account.paymentCapabilities?.zelle?.email || 
                account.paymentCapabilities?.interac?.email || 
                (account.metadata && (account.metadata as any).email)) && (
                <div className="text-sm text-primary flex items-center gap-1.5 mt-1">
                  <Mail className="h-3 w-3" />
                  {paymentInfo.email || 
                   account.paymentCapabilities?.zelle?.email || 
                   account.paymentCapabilities?.interac?.email || 
                   (account.metadata && (account.metadata as any).email)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Phone number if available */}
            {(paymentInfo.phone || 
              account.paymentCapabilities?.zelle?.phone || 
              (account.metadata && (account.metadata as any).phone)) && (
              <div className="text-sm flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-primary" />
                <span className="font-medium">
                  {paymentInfo.phone || 
                   account.paymentCapabilities?.zelle?.phone || 
                   (account.metadata && (account.metadata as any).phone)}
                </span>
              </div>
            )}
            
            {/* Action buttons - Details and Delete */}
            <div className="flex gap-2">
              {/* Details toggle button */}
              <Button 
                variant="outline"
                size="sm"
                className="h-9 border-primary/20 text-primary hover:bg-primary/10" 
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? "Hide Details" : "View Details"}
                {showDetails ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
              
              {/* Delete button - Only if onDelete is provided */}
              {onDelete && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-9 border-destructive/20 text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main payment info preview - always visible with more prominence */}
        {mainInfo && (
          <div className="px-4 py-3 bg-muted/5 border-t border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {mainInfo.label === 'Email' && <Mail className="h-4 w-4 text-primary" />}
                {mainInfo.label === 'Phone' && <Phone className="h-4 w-4 text-primary" />}
                {mainInfo.label === 'SWIFT' && <Globe className="h-4 w-4 text-primary" />}
                {mainInfo.label === 'IBAN' && <Euro className="h-4 w-4 text-primary" />}
                {mainInfo.label === 'UPI ID' && <Smartphone className="h-4 w-4 text-primary" />}
                <span className="font-medium text-primary">{mainInfo.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{mainInfo.value}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7 border-primary/20 hover:bg-primary/10" 
                  onClick={() => {
                    navigator.clipboard.writeText(mainInfo.value);
                    toast({
                      title: "Copied!",
                      description: `${mainInfo.label} has been copied to clipboard`,
                      duration: 2000,
                    });
                  }}
                >
                  <Copy className="h-3 w-3 text-primary" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Expanded details section - Enhanced with better visual hierarchy */}
        {showDetails && (
          <div className="border-t bg-gradient-to-b from-muted/5 to-white p-4">
            {/* Contact information displayed first */}
            {renderPaymentMethodDetails()}
            
            {/* Additional payment details in card format */}
            <div className="bg-muted/10 p-4 rounded-lg">
              <h3 className="text-primary font-bold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Additional Details
              </h3>
              <div className="text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Account Type</span>
                  <span className="font-medium">{account.accountType || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Institution</span>
                  <span className="font-medium">{account.institution?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{account.currency || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Country</span>
                  <span className="font-medium">{account.institution?.country || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your {account.accountName} account from your payment methods.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (onDelete) {
                  onDelete(account.id);
                  toast({
                    title: "Account deleted",
                    description: `${account.accountName} has been removed from your payment methods`,
                    duration: 4000,
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}