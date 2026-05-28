"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import ReactCountryFlag from "react-country-flag"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"

// Import from shared countries module
import { Country, countries } from "@/lib/countries"

// Re-export for backward compatibility
export type { Country }
export { countries }

// Shared country selection UI component
export const CountrySelectUI = ({ 
  onCountrySelect, 
  selectedCountryCode,
  showTitle = false,
  className = "",
  maxHeight
}: { 
  onCountrySelect: (country: Country) => void
  selectedCountryCode?: string
  showTitle?: boolean
  className?: string
  maxHeight?: string
}) => {
  return (
    <div className={className}>
      {showTitle && (
        <h3 className="text-lg font-medium p-4 border-b">Select your region</h3>
      )}
      
      <Command className="rounded-lg">
        <div className="flex items-center px-3 border-b">
          <Search className="h-4 w-4 shrink-0 opacity-50 mr-2" />
          <CommandInput 
            placeholder="Search by country name, currency code, or symbol..."
            className="border-0 focus:ring-0 flex-1"
          />
        </div>
        <CommandEmpty>No country found.</CommandEmpty>
        <CommandGroup className="overflow-auto max-h-[250px]">
          {countries
            .map((country) => (
              <CommandItem
                key={country.code}
                value={country.code}
                onSelect={(currentValue) => {
                  const country = countries.find(c => c.code === currentValue);
                  if (country) onCountrySelect(country);
                }}
                className="flex items-center gap-2 py-2 px-3"
              >
                <ReactCountryFlag 
                  countryCode={country.code} 
                  svg 
                  style={{
                    width: '1.5em',
                    height: '1.5em',
                  }}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{country.name}</span>
                  <span className="text-sm text-gray-500">
                    {country.currency} ({country.symbol})
                  </span>
                </div>
                <Check
                  className={`ml-auto h-4 w-4 shrink-0 ${selectedCountryCode === country.code ? "opacity-100" : "opacity-0"}`}
                />
              </CommandItem>
            ))}
        </CommandGroup>
      </Command>
    </div>
  )
}

// Dialog version (popup) - maintains compatibility with existing usage
export function CountrySelector({ 
  onCountrySelect, 
  selectedCountryCode = "US",
  triggerClassName = ""
}: { 
  onCountrySelect: (country: { code: string; currency: string; rate: number }) => void
  selectedCountryCode?: string
  triggerClassName?: string
}) {
  const selectedCountry = countries.find(c => c.code === selectedCountryCode)
  const [open, setOpen] = React.useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`flex justify-between items-center w-full ${triggerClassName}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedCountry && (
              <ReactCountryFlag 
                countryCode={selectedCountry.code} 
                svg 
                style={{
                  width: '1.2em',
                  height: '1.2em',
                  flexShrink: 0
                }}
              />
            )}
            <span className="truncate">{selectedCountry?.currency || "USD"}</span>
          </div>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 w-[90vw] max-w-[450px]">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle>Select your region</DialogTitle>
        </DialogHeader>
        <CountrySelectUI 
          onCountrySelect={(country) => {
            onCountrySelect({
              code: country.code,
              currency: country.currency,
              rate: country.rate
            });
            setOpen(false);
          }}
          selectedCountryCode={selectedCountryCode}
        />
      </DialogContent>
    </Dialog>
  )
}

// Inline version (non-popup)
export function InlineCountrySelector({ 
  onCountrySelect, 
  selectedCountryCode = "US",
  className = "",
  showTitle = true,
  maxHeight
}: { 
  onCountrySelect: (country: { code: string; currency: string; rate: number }) => void
  selectedCountryCode?: string
  className?: string
  showTitle?: boolean
  maxHeight?: string
}) {
  return (
    <div className={`border rounded-lg ${className}`}>
      <CountrySelectUI 
        onCountrySelect={(country) => {
          onCountrySelect({
            code: country.code,
            currency: country.currency,
            rate: country.rate
          });
        }}
        selectedCountryCode={selectedCountryCode}
        showTitle={showTitle}
        maxHeight={maxHeight}
      />
    </div>
  )
}