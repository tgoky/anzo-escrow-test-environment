import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Default translations for fallback
const defaultResources = {
  en: {
    common: {
      header: {
        exchange: 'Exchange',
        marketplace: 'Marketplace',
        dashboard: 'Dashboard',
        settings: 'Settings',
        globalPreferences: 'Global Preferences'
      }
    }
  }
};

// Check if i18n is already initialized to prevent duplicate initialization
if (!i18n.isInitialized) {
  console.log('Initializing i18n for the first time');
  
  // Configure i18n to use the HTTP backend to load translations from locales
  i18n
    // Use HTTP backend to load translations
    .use(Backend)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Detect user's language
    .use(LanguageDetector)
    // Initialize configuration
    .init({
      // Backend configuration
      backend: {
        // Path to load resources from
        loadPath: '/locales/{{lng}}/{{ns}}.json',
        // Add cache busting to prevent browser caching issues
        queryStringParams: { v: new Date().getTime().toString() },
      },
      // Default language
      fallbackLng: 'en',
      // Debug mode in development
      debug: true,
      // Namespace - the JSON file name in locales folder
      defaultNS: 'common',
      ns: ['common'],
      // Interpolation configuration
      interpolation: {
        // Not needed for React as it escapes by default
        escapeValue: false,
      },
      // Supported languages
      supportedLngs: ['en', 'vi', 'ru', 'th', 'id', 'zh'],
      // Default detection options
      detection: {
        // Order of detection
        order: ['localStorage', 'navigator'],
        // Cache language in localStorage
        caches: ['localStorage'],
        // Look up language code format
        lookupLocalStorage: 'i18nextLng',
      },
      // React specific configuration
      react: {
        useSuspense: false, // Disable suspense to prevent layout shifts
      },
      // Add default resources
      resources: defaultResources,
      // Important: Make sure resources are loaded before using
      initImmediate: false,
    });
} else {
  console.log('i18n already initialized, skipping initialization');
}

// Add event handlers for debugging
i18n.on('initialized', () => {
  console.log('i18n initialized successfully');
});

i18n.on('loaded', (loaded) => {
  console.log('i18n resources loaded:', loaded);
});

i18n.on('failedLoading', (lng, ns, msg) => {
  console.error(`i18n failed loading ${lng} ${ns}:`, msg);
});

export default i18n;