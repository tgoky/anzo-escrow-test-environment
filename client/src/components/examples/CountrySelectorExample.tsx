
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountrySelector, InlineCountrySelector } from '@/components/ui/country-selector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CountrySelectorExample() {
  const [dialogCountry, setDialogCountry] = useState({
    code: "US",
    currency: "USD",
    rate: 1.0
  });

  const [inlineCountry, setInlineCountry] = useState({
    code: "US",
    currency: "USD",
    rate: 1.0
  });

  const handleDialogCountrySelect = (country: { code: string; currency: string; rate: number }) => {
    setDialogCountry(country);
    console.log("Dialog - Selected country:", country);
  };

  const handleInlineCountrySelect = (country: { code: string; currency: string; rate: number }) => {
    setInlineCountry(country);
    console.log("Inline - Selected country:", country);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Tabs defaultValue="both">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="both">Both Variants</TabsTrigger>
          <TabsTrigger value="dialog">Dialog Only</TabsTrigger>
          <TabsTrigger value="inline">Inline Only</TabsTrigger>
        </TabsList>

        <TabsContent value="both">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dialog Country Selector</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p>Currently selected: {dialogCountry.code} - {dialogCountry.currency}</p>
                </div>
                
                <CountrySelector 
                  selectedCountryCode={dialogCountry.code}
                  onCountrySelect={handleDialogCountrySelect}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inline Country Selector</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p>Currently selected: {inlineCountry.code} - {inlineCountry.currency}</p>
                </div>
                
                <InlineCountrySelector 
                  selectedCountryCode={inlineCountry.code}
                  onCountrySelect={handleInlineCountrySelect}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dialog">
          <Card>
            <CardHeader>
              <CardTitle>Dialog Country Selector</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p>Currently selected: {dialogCountry.code} - {dialogCountry.currency}</p>
              </div>
              
              <CountrySelector 
                selectedCountryCode={dialogCountry.code}
                onCountrySelect={handleDialogCountrySelect}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inline">
          <Card>
            <CardHeader>
              <CardTitle>Inline Country Selector</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p>Currently selected: {inlineCountry.code} - {inlineCountry.currency}</p>
              </div>
              
              <InlineCountrySelector 
                selectedCountryCode={inlineCountry.code}
                onCountrySelect={handleInlineCountrySelect}
                className="w-full"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
