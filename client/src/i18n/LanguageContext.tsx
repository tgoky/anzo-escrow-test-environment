import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import i18n from 'i18next';

// Define language interface
interface Language {
  code: string;
  name: string;
  flag: string;
}

// Supported languages
export const languages: Language[] = [
  { code: 'en', name: 'English', flag: 'US' },
  { code: 'vi', name: 'Tiếng Việt', flag: 'VN' },
  { code: 'ru', name: 'Русский', flag: 'RU' },
  { code: 'th', name: 'ภาษาไทย', flag: 'TH' },
  { code: 'id', name: 'Bahasa Indonesia', flag: 'ID' },
  { code: 'zh', name: '中文', flag: 'CN' }
];

// Language context interface
interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (code: string) => void;
  languages: Language[];
}

// Create context with default values
const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'en',
  changeLanguage: () => {},
  languages: languages
});

// Hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

// Provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // State to track the current language
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  // Enhanced implementation with proper error handling and loading
  const changeLanguage = (code: string) => {
    console.log(`LanguageContext: Changing language to: ${code}`);
    
    // Pre-load the language namespace first to ensure translations are available
    i18n.loadNamespaces('common').then(() => {
      console.log(`Namespace 'common' loaded for language ${code}`);
      
      // Use the i18n's built-in changeLanguage which handles all the side effects
      return i18n.changeLanguage(code);
    }).then(() => {
      console.log(`Language successfully changed to: ${code}, i18n reports: ${i18n.language}`);
      
      // Document language attribute (for accessibility)
      document.documentElement.lang = code;
      
      // Ensure the component state is updated
      setCurrentLanguage(code);
    }).catch(error => {
      console.error(`Error changing language to ${code}:`, error);
    });
  };

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng);
    };

    // Add event listener
    i18n.on('languageChanged', handleLanguageChanged);

    // Cleanup
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  // Context value
  const value = {
    currentLanguage,
    changeLanguage,
    languages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};