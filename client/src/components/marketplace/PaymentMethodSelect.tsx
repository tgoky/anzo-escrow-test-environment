import { useEffect, useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { getPaymentMethodsForCurrency } from '@/lib/supportedCurrencies';

interface PaymentMethodSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  currency: string;
  country?: string;
}

export function PaymentMethodSelect({ 
  value, 
  onValueChange, 
  currency, 
  country = 'US' 
}: PaymentMethodSelectProps) {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch payment methods when currency changes
  useEffect(() => {
    async function fetchPaymentMethods() {
      setIsLoading(true);
      try {
        const methods = await getPaymentMethodsForCurrency(currency, country);
        setPaymentMethods(methods);
        
        // If current value is not in new methods list, reset to "all"
        if (value !== 'all' && !methods.some(m => m.type === value)) {
          onValueChange('all');
        }
      } catch (error) {
        console.error('Failed to fetch payment methods:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPaymentMethods();
  }, [currency, country, value, onValueChange]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Payment Method" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Payment Methods</SelectItem>
        {paymentMethods.map(method => (
          <SelectItem key={method.type} value={method.type}>
            {method.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}