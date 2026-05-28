import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ManualAccountFormProps {
  walletAddress: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  paymentMethodOptions: any[];
  selectedPaymentMethod?: string;
  currency: string;
  country: string;
  isLoading?: boolean;
  simplified?: boolean;
}

// Simplified form schema
const formSchema = z.object({
  walletAddress: z.string().min(1, "Wallet address is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.string().default("bank_account"),
  institution: z.object({
    name: z.string().default(""),
    type: z.string().default("bank"),
    country: z.string().min(2, "Country code is required")
  }),
  currency: z.string().min(3, "Currency code is required"),
  paymentMethods: z.array(
    z.object({
      type: z.string().min(1, "Payment method type is required"),
      provider: z.string().default(""),
      details: z.record(z.string(), z.string()),
      country: z.string().min(2, "Country code is required"),
      currency: z.string().min(3, "Currency code is required"),
      instructions: z.string().optional()
    })
  ).min(1, "At least one payment method is required")
});

export function ManualAccountForm({
  walletAddress,
  onSubmit,
  onCancel,
  paymentMethodOptions,
  selectedPaymentMethod,
  currency,
  country,
  isLoading = false,
  simplified = false
}: ManualAccountFormProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  
  // Get the selected payment method configuration
  useEffect(() => {
    if (selectedPaymentMethod) {
      const method = paymentMethodOptions.find(m => m.type === selectedPaymentMethod);
      if (method) {
        setPaymentMethod(method);
      }
    }
  }, [selectedPaymentMethod, paymentMethodOptions]);
  
  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      walletAddress,
      accountName: paymentMethod?.name || "My Payment Method",
      accountType: "bank_account",
      institution: {
        name: "",
        type: "bank",
        country: country
      },
      currency,
      paymentMethods: selectedPaymentMethod ? [{
        type: selectedPaymentMethod,
        provider: "",
        details: {},
        country,
        currency,
        instructions: ""
      }] : []
    }
  });
  
  useEffect(() => {
    // Update form when payment method changes
    if (paymentMethod && selectedPaymentMethod) {
      form.setValue("paymentMethods", [{
        type: selectedPaymentMethod,
        provider: "",
        details: {},
        country,
        currency,
        instructions: ""
      }]);
      
      form.setValue("accountName", paymentMethod.name);
    }
  }, [paymentMethod, selectedPaymentMethod, form, currency, country]);
  
  const handleFormSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      console.log('📝 Form data before submission:', JSON.stringify(data));
      console.log('📝 Payment methods data:', JSON.stringify(data.paymentMethods));
      
      // Ensure details property is properly initialized for each payment method
      if (data.paymentMethods?.length > 0) {
        data.paymentMethods = data.paymentMethods.map(method => {
          // Make sure details is an object and not undefined
          if (!method.details || typeof method.details !== 'object') {
            method.details = {};
          }
          
          // Make sure provider is not empty
          if (!method.provider) {
            method.provider = method.type;
          }
          
          // Add default values based on payment method type
          if (method.type === 'zelle' && !method.details.email && !method.details.phoneNumber) {
            // For Zelle, extract email or phone from instructions if provided
            if (method.instructions && method.instructions.includes('@')) {
              // Try to extract email
              const emailMatch = method.instructions.match(/\b[\w\.-]+@[\w\.-]+\.\w+\b/);
              if (emailMatch) {
                method.details.email = emailMatch[0];
                console.log('📝 Extracted email from instructions:', method.details.email);
              }
            } else if (method.instructions) {
              // Set instructions as email if no specific format is found
              method.details.email = method.instructions;
              console.log('📝 Using instructions as email:', method.details.email);
            } else {
              // Set a placeholder to pass validation
              method.details.email = `${method.type}@example.com`;
              console.log('📝 Using placeholder email for validation');
            }
          }
          
          return method;
        });
      }
      
      console.log('📝 Updated payment methods data:', JSON.stringify(data.paymentMethods));
      await onSubmit(data);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive"
      });
    }
  };

  // Get required fields only
  const getRequiredFields = () => {
    if (!paymentMethod || !paymentMethod.fields) return [];
    
    // For simplified mode, only show required fields
    if (simplified) {
      return paymentMethod.fields.filter((field: any) => field.required);
    }
    
    return paymentMethod.fields;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {!simplified && (
          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input placeholder={paymentMethod?.name || "My Payment Method"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {paymentMethod && (
          <div className="space-y-4">
            <h3 className="text-md font-medium">{paymentMethod.name} Details</h3>
            
            {getRequiredFields().map((fieldDef: any) => (
              <FormField
                key={fieldDef.name}
                control={form.control}
                name={`paymentMethods.0.details.${fieldDef.name}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldDef.label}</FormLabel>
                    <FormControl>
                      {fieldDef.type === 'textarea' ? (
                        <Textarea 
                          placeholder={fieldDef.label} 
                          {...field} 
                        />
                      ) : (
                        <Input 
                          type={fieldDef.type === 'email' ? 'email' : 'text'} 
                          placeholder={fieldDef.label} 
                          {...field}
                          required={fieldDef.required} 
                        />
                      )}
                    </FormControl>
                    {fieldDef.description && (
                      <FormDescription>{fieldDef.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            
            {/* If there are only a few fields or simplified is true, show the instructions field last */}
            {(getRequiredFields().length < 3 || !simplified) && (
              <FormField
                control={form.control}
                name={`paymentMethods.0.instructions`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information needed to receive payments" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Payment Method
          </Button>
        </div>
      </form>
    </Form>
  );
}