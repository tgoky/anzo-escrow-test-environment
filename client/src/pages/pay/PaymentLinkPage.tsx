import { useState } from "react";
import { useRoute } from "wouter";
import BuyForm from "@/components/exchange/BuyForm";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FinancialAccount } from "@/lib/financialAccountStore";

export default function PaymentLinkPage() {
  const [, params] = useRoute("/pay/:offerId");
  const offerId = params?.offerId;

  const { data: offer, isLoading, error } = useQuery({
    queryKey: ['offer-payment', offerId],
    queryFn: async () => {
      const response = await axios.get(`/api/offers/${offerId}`);
      // Record link access
      await axios.post(`/api/offers/${offerId}/link-access`);
      return response.data;
    },
    enabled: !!offerId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto p-6">
          <Card className="p-6">
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto p-6">
          <Card className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-4">This payment link is no longer valid or has been cancelled.</p>
            <Button onClick={() => window.location.href = '/'}>
              Return to Homepage
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto p-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-6">Purchase {offer.token}</h1>
          <BuyForm 
            predefinedOffer={offer}
            onBankConnect={(account: FinancialAccount) => {}}
            connectedBanks={[]}
            selectedBankIndex={0}
          />
        </div>
      </div>
    </div>
  );
}