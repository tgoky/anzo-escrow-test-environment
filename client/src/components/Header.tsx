import { useState } from "react";
import { PhantomLogo } from "@/components/exchange/PhantomLogo";
import { cn } from "@/lib/utils"
import { Wallet, ChevronDown, MoreHorizontal, Languages, Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountPanel } from "@/components/exchange/AccountPanel";
import {useSolanaWallets} from '@privy-io/react-auth/solana';
import {usePrivy} from "@privy-io/react-auth"
import logo from "../../../attached_assets/Logos/landing_page_logo.svg";
import { useFinancialAccountStore } from "@/lib/financialAccountStore";
import type { FinancialAccount } from "@shared/types/financial-account";
import { Link, useLocation } from "wouter"; // Using wouter instead of react-router-dom
import { Badge } from "@/components/ui/badge";
import ReactCountryFlag from "react-country-flag";
import { useLanguage, languages } from "@/i18n/LanguageContext";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function Header() {
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [location] = useLocation();
  const {wallets} = useSolanaWallets();
  const {ready, authenticated, logout} = usePrivy();
  const { t } = useTranslation(); // Added missing useTranslation hook
  
  const { 
    connectedAccounts,
    selectedAccountIndex,
    setSelectedAccountIndex,
    addAccount,
    removeAccount
  } = useFinancialAccountStore();

  const handleWalletDisconnect = () => {
    const disableLogout = !ready || (ready && !authenticated);
  
    if(disableLogout) return;
    
    logout();
    console.log("🔑 Header: Disconnected wallet");
  };

  const handleBankConnect = (account: FinancialAccount) => {
    addAccount(account);
  };

  const handleBankDisconnect = (index: number) => {
    removeAccount(index);
  };

  // Settings dropdown menu with three dots
  const SettingsMenu = () => {
    const { currentLanguage, changeLanguage } = useLanguage();
    
    // Define languages directly to avoid import issues
    const appLanguages = [
      { code: 'en', name: 'English', flag: 'US' },
      { code: 'vi', name: 'Tiếng Việt', flag: 'VN' },
      { code: 'ru', name: 'Русский', flag: 'RU' },
      { code: 'th', name: 'ภาษาไทย', flag: 'TH' },
      { code: 'id', name: 'Bahasa Indonesia', flag: 'ID' },
      { code: 'zh', name: '中文', flag: 'CN' }
    ];
    
    // Handler to directly change language
    const handleLanguageChange = (code: string) => {
      console.log('Header: Changing language to:', code);
      
      // Call the language change function and log result
      changeLanguage(code);
      
      // Force a small delay to ensure UI is updated
      setTimeout(() => {
        console.log('Language change completed in Header, current language:', currentLanguage);
      }, 100);
    };
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>{t('header.globalPreferences')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Language selection section */}
          <DropdownMenuLabel className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <span>Language</span>
          </DropdownMenuLabel>
          
          {/* Directly map language options as dropdown items */}
          {appLanguages.map((lang) => (
            <DropdownMenuItem 
              key={lang.code}
              className="flex items-center gap-2 cursor-pointer pl-8"
              onClick={() => handleLanguageChange(lang.code)}
            >
              <ReactCountryFlag 
                countryCode={lang.flag} 
                svg 
                style={{ width: '1rem', height: '1rem' }} 
              />
              <span>{lang.name}</span>
              {lang.code === currentLanguage && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <Link href="/settings">
            <DropdownMenuItem className="flex items-center cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              <span>{t('header.settings')}</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 pt-3">
        {/* Clean navigation bar inspired by Uniswap */}
        <div className="flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
          <div className="flex items-center">
            {/* Logo with dropdown for navigation */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer">
                  <img 
                    src={logo} 
                    alt="Landing Page Logo" 
                    className={cn(
                      "h-8 md:h-10 w-auto",
                      "transition-all duration-200"
                    )}
                  />
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <Link href="/">
                  <DropdownMenuItem className="cursor-pointer">
                    {t('header.exchange')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/marketplace">
                  <DropdownMenuItem className="cursor-pointer">
                    {t('header.marketplace')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard">
                  <DropdownMenuItem className="cursor-pointer">
                    {t('header.dashboard')}
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            {/* Three dots menu for settings */}
            <SettingsMenu />
            
            {/* Connect wallet button */}
            {wallets[0] ? (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 rounded-full px-3 border-gray-200 hover:border-gray-300 transition-colors"
                onClick={() => setAccountPanelOpen(true)}
              >
                <PhantomLogo />
                <span className="font-mono text-sm">
                  {wallets[0].address?.slice(0, 4)}...{wallets[0].address?.slice(-4)}
                </span>
              </Button>
            ) : (
              <Button
                onClick={() => setAccountPanelOpen(true)}
                size="sm"
                className="rounded-full bg-[#BCE704] hover:bg-[#a5cc02] text-black px-4"
              >
                <span>{t('header.connect')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <AccountPanel
        open={accountPanelOpen}
        onOpenChange={setAccountPanelOpen}
        onDisconnect={handleWalletDisconnect}
        selectedAccountIndex={selectedAccountIndex}
        onAccountSelect={setSelectedAccountIndex}
        onAccountDisconnect={handleBankDisconnect}
        setAccountPanelOpen={setAccountPanelOpen}
      />
    </header>
  );
}