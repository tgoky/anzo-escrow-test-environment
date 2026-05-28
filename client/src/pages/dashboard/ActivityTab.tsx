import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistance } from "date-fns";

interface ActivityTabProps {
  walletAddress: string;
  transactions: any[];
  isLoading: boolean;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  getStatusIcon: (status: string) => React.ReactNode;
  getTransactionIcon: (transaction: any) => React.ReactNode;
}

export default function ActivityTab({
  walletAddress,
  transactions,
  isLoading,
  getStatusBadgeVariant,
  getStatusIcon,
  getTransactionIcon
}: ActivityTabProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p>Loading transactions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No transactions found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-medium mb-4">Recent Transactions</h3>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 bg-card border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  {getTransactionIcon(transaction)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {transaction.type === "buy" ? "Buy" : "Sell"} {transaction.token}
                    </span>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {getStatusIcon(transaction.status)}
                      <span className="ml-1">{transaction.status}</span>
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.createdAt && (
                      <span>
                        {formatDistance(new Date(transaction.createdAt), new Date(), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {transaction.tokenAmount} {transaction.token}
                </div>
                <div className="text-sm text-muted-foreground">
                  {transaction.amount} {transaction.currency || "USD"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}