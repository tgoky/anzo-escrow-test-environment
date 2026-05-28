import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { CountrySelector } from "@/components/ui/country-selector";

interface MarketplaceFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: {
    token: string;
    currency: string;
    paymentMethod: string;
    amount: string;
    rating?: number;
    countries?: string[];
    allowVerifiedOnly?: boolean;
  };
  onApplyFilters: (filters: any) => void;
}

export default function MarketplaceFilters({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters
}: MarketplaceFiltersProps) {
  const [filters, setFilters] = useState(currentFilters);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(currentFilters.countries || []);
  
  const handleChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleAddCountry = (country: string) => {
    if (!selectedCountries.includes(country)) {
      setSelectedCountries([...selectedCountries, country]);
      handleChange('countries', [...selectedCountries, country]);
    }
  };
  
  const handleRemoveCountry = (country: string) => {
    const updatedCountries = selectedCountries.filter(c => c !== country);
    setSelectedCountries(updatedCountries);
    handleChange('countries', updatedCountries);
  };
  
  const handleApply = () => {
    onApplyFilters(filters);
  };
  
  const handleReset = () => {
    const resetFilters = {
      token: 'USDT',
      currency: 'USD',
      paymentMethod: '',
      amount: '',
      rating: 0,
      countries: [],
      allowVerifiedOnly: false
    };
    
    setFilters(resetFilters);
    setSelectedCountries([]);
    onApplyFilters(resetFilters);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Select value={filters.token} onValueChange={(value) => handleChange('token', value)}>
                <SelectTrigger id="token">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={filters.currency} onValueChange={(value) => handleChange('currency', value)}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={filters.paymentMethod} onValueChange={(value) => handleChange('paymentMethod', value)}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="All Payment Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Payment Methods</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="cash_deposit">Cash Deposit</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="revolut">Revolut</SelectItem>
                <SelectItem value="wise">Wise</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="alipay">Alipay</SelectItem>
                <SelectItem value="wechat_pay">WeChat Pay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={filters.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
            />
          </div>
          
          {filters.rating !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="rating">Minimum Trader Rating</Label>
                <span className="text-sm text-muted-foreground">{filters.rating}%</span>
              </div>
              <Slider
                defaultValue={[filters.rating]}
                max={100}
                step={5}
                onValueChange={(value) => handleChange('rating', value[0])}
              />
            </div>
          )}
          
          {/* Countries selection */}
          <div className="space-y-2">
            <Label>Country Filter</Label>
            <div className="flex gap-2">
              <CountrySelector 
                onCountrySelect={(country) => handleAddCountry(country.code)}
              />
            </div>
          </div>
          
          {/* Selected countries */}
          {selectedCountries.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Countries</Label>
              <div className="flex flex-wrap gap-2">
                {selectedCountries.map(country => (
                  <div key={country} className="flex items-center bg-muted px-2 py-1 rounded-md text-sm">
                    {country}
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => handleRemoveCountry(country)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {filters.allowVerifiedOnly !== undefined && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={filters.allowVerifiedOnly}
                onCheckedChange={(checked) => handleChange('allowVerifiedOnly', checked)}
              />
              <Label htmlFor="verified" className="text-sm font-normal">
                Show verified traders only
              </Label>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset Filters
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}