import React from 'react';
import ReactCountryFlag from 'react-country-flag';
import { useLanguage, languages } from '@/i18n/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

export function SimpleLanguageSelector() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();

  const handleLanguageChange = (code: string) => {
    console.log(`SimpleLanguageSelector: Changing language to: ${code}`);
    
    try {
      // Force reload resources for the target language
      i18n.reloadResources([code], ['common'])
        .then(() => {
          console.log(`Successfully reloaded resources for: ${code}`);
          
          // Change the language
          changeLanguage(code);
          
          // Log the change
          console.log(`Language should now be changed to: ${code}`);
        })
        .catch((err) => {
          console.error(`Error reloading resources: ${err}`);
        });
    } catch (error) {
      console.error(`Error during language change: ${error}`);
    }
  };

  return (
    <div className="flex items-center">
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 py-1 min-w-0",
            lang.code === currentLanguage ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
          )}
          onClick={() => handleLanguageChange(lang.code)}
        >
          <ReactCountryFlag 
            countryCode={lang.flag} 
            svg 
            style={{ width: '1rem', height: '1rem' }} 
          />
        </Button>
      ))}
    </div>
  );
}