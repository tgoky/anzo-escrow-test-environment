import React from 'react';
import ReactCountryFlag from 'react-country-flag';
import { Languages, Check } from 'lucide-react';
import { useLanguage, languages } from '@/i18n/LanguageContext';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface LanguageSelectorProps {
  variant?: 'full' | 'minimal';
  className?: string;
}

export function LanguageSelector({ variant = 'full', className }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();

  // Get current language info
  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = (code: string) => {
    console.log(`Changing language to: ${code}`);
    
    // Call the language change function from context
    changeLanguage(code);
  };

  if (variant === 'minimal') {
    return (
      <>
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          <span>{t('common.language')}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              console.log(`Direct click on language: ${lang.code}`);
              handleLanguageChange(lang.code);
            }}
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
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`flex items-center gap-2 focus:outline-none ${className}`}>
        <Languages className="h-4 w-4" />
        <ReactCountryFlag countryCode={currentLang.flag} svg style={{ width: '1rem', height: '1rem' }} />
        <span>{currentLang.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuLabel>Select Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleLanguageChange(lang.code)}
          >
            <ReactCountryFlag countryCode={lang.flag} svg style={{ width: '1.2rem', height: '1.2rem' }} />
            <span>{lang.name}</span>
            {lang.code === currentLanguage && (
              <Check className="h-4 w-4 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}