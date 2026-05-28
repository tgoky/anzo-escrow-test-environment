import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { 
  ShieldCheck, 
  ShieldAlert,
  ShieldX,
  RefreshCw, 
  Info,
  User,
  Settings,
  Bell,
  Wallet,
  Copy,
  CheckCheck
} from "lucide-react";
import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import { Badge } from "@/components/ui/badge";
import { DialogTrigger } from "@/components/ui/dialog";

interface RiskProfile {
  walletAddress: string;
  riskCategory: 'low' | 'medium' | 'high';
  riskScore?: number;
  riskFactors?: {
    lastUpdated: string;
    factorBreakdown: Record<string, string>;
  };
  calculated?: boolean;
}

export default function UserSettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { connectedAccounts } = useFinancialAccountStore();
  
  // Use the actual wallet address instead of the account ID
  // The account ID format from connectedAccounts doesn't match what we need for risk profile lookup
  const walletAddress = "6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ";
    
  // Function to copy wallet address to clipboard
  const copyToClipboard = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
          toast({
            title: "Address Copied",
            description: "Wallet address copied to clipboard",
            variant: "default",
          });
        })
        .catch((error) => {
          console.error("Failed to copy:", error);
          toast({
            title: "Copy Failed",
            description: "Could not copy address to clipboard",
            variant: "destructive",
          });
        });
    }
  };
  
  // Query to fetch the user's risk profile
  const { 
    data: riskProfile,
    isLoading: isLoadingRisk, 
    error: riskError, 
    refetch: refetchRisk
  } = useQuery({
    queryKey: ['riskProfile', walletAddress],
    queryFn: async () => {
      try {
        const response = await axios.get(`/api/risk-profile/${walletAddress}`);
        return response.data as RiskProfile;
      } catch (error) {
        console.error("Error fetching risk profile:", error);
        throw error;
      }
    },
    enabled: !!walletAddress
  });

  // Function to calculate risk score
  const calculateRiskScore = async () => {
    if (!walletAddress) return;
    
    setIsCalculatingRisk(true);
    try {
      const response = await axios.post(`/api/risk-profile/${walletAddress}/calculate`);
      
      toast({
        title: "Risk Profile Updated",
        description: "Your risk profile has been recalculated based on your activity.",
        variant: "default",
      });
      
      // Refresh risk profile data
      refetchRisk();
    } catch (error) {
      console.error("Error calculating risk score:", error);
      toast({
        title: "Error",
        description: "Failed to calculate risk score. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingRisk(false);
    }
  };

  // Function to get risk category icon
  const getRiskCategoryIcon = (category?: string) => {
    switch (category) {
      case 'low':
        return <ShieldCheck className="h-8 w-8 text-green-500" />;
      case 'medium':
        return <ShieldAlert className="h-8 w-8 text-yellow-500" />;
      case 'high':
        return <ShieldX className="h-8 w-8 text-red-500" />;
      default:
        return <ShieldCheck className="h-8 w-8 text-gray-400" />;
    }
  };

  // Function to get risk category label
  const getRiskCategoryLabel = (category?: string) => {
    switch (category) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High Risk</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unknown</Badge>;
    }
  };

  // Function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Settings</h1>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6 grid grid-cols-3 max-w-md">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="reputation">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Reputation
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
          </TabsList>
          
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your personal information and account settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-500">Wallet Address</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={copyToClipboard}
                      className="h-8 px-2"
                    >
                      {isCopied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md">
                    <Wallet className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <p className="font-mono text-sm overflow-hidden text-ellipsis">{walletAddress}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Connected Accounts</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="py-1">
                      {connectedAccounts.length} account{connectedAccounts.length !== 1 ? 's' : ''} connected
                    </Badge>
                    {connectedAccounts.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Verified User</Badge>
                    )}
                  </div>
                </div>
                
                {riskProfile && (
                  <div className="space-y-1 pt-2">
                    <p className="text-sm font-medium text-gray-500">Current Reputation</p>
                    <div className="flex gap-2">
                      {getRiskCategoryLabel(riskProfile.riskCategory)}
                      <Button 
                        variant="link" 
                        className="text-xs h-auto p-0" 
                        onClick={() => document.querySelector('[value="reputation"]')?.dispatchEvent(new Event('click'))}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button variant="default" onClick={() => navigate('/maker')}>
                  <Wallet className="h-4 w-4 mr-2" />
                  Manage Accounts
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Reputation Tab */}
          <TabsContent value="reputation">
            <Card>
              <CardHeader>
                <CardTitle>Reputation & Risk Profile</CardTitle>
                <CardDescription>
                  View your current risk category and factors that contribute to your reputation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRisk ? (
                  <div className="py-6 space-y-4">
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="animate-pulse h-32 bg-gray-200 rounded"></div>
                  </div>
                ) : riskError ? (
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-red-800 font-medium">Error loading risk profile</p>
                    <p className="text-red-600 text-sm">Please try again later or contact support.</p>
                    <Button variant="outline" onClick={() => refetchRisk()} className="mt-2">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getRiskCategoryIcon(riskProfile?.riskCategory)}
                        <div>
                          <h3 className="font-medium text-lg">Risk Category</h3>
                          <div className="mt-1">{getRiskCategoryLabel(riskProfile?.riskCategory)}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={calculateRiskScore}
                        disabled={isCalculatingRisk}
                      >
                        {isCalculatingRisk ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 
                            Calculating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" /> 
                            Recalculate
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {riskProfile?.riskScore !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Risk Score</h3>
                          <span className="font-bold">{riskProfile.riskScore}/100</span>
                        </div>
                        <Progress value={riskProfile.riskScore} className="h-3" />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Low Risk</span>
                          <span>Medium Risk</span>
                          <span>High Risk</span>
                        </div>
                      </div>
                    )}
                    
                    {riskProfile?.riskFactors && (
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h3 className="font-medium mb-2">Risk Factors</h3>
                        <div className="space-y-2">
                          {Object.entries(riskProfile.riskFactors.factorBreakdown || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          <Info className="h-3 w-3 inline mr-1" />
                          Last updated: {formatDate(riskProfile.riskFactors.lastUpdated)}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                      <p>
                        <Info className="h-4 w-4 inline mr-1" />
                        Your risk category affects how other users perceive your reliability as a trading partner.
                        Maintaining a good reputation helps you get better trading opportunities.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Manage your app settings and notification preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notification settings will be available soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}