// i18n.config.ts
// Core i18n functionality for translation management - v23.5.0
import i18next from 'i18next';
// Browser language detection plugin - v7.1.0
import i18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';
// Dynamic loading of translation files - v2.2.2
import i18nextHttpBackend from 'i18next-http-backend';

// Import language resources
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

// Define supported namespaces
const NAMESPACES = ['common', 'search', 'profile', 'analytics'] as const;
type NamespaceType = typeof NAMESPACES[number];

// Define supported languages
const LANGUAGES = ['en', 'es', 'fr'] as const;
type LanguageType = typeof LANGUAGES[number];

// Type for translation resources
interface TranslationResource {
  [key: string]: {
    [key: string]: any;
  };
}

// i18n configuration object
const i18nConfig = {
  fallbackLng: 'en' as LanguageType,
  supportedLngs: LANGUAGES,
  defaultNS: 'common' as NamespaceType,
  ns: NAMESPACES,
  
  // Language detection configuration
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
    cookieMinutes: 43200, // 30 days
    lookupLocalStorage: 'i18nextLng',
  },
  
  // Interpolation settings
  interpolation: {
    escapeValue: false,
    formatSeparator: ',',
  },
  
  // Backend configuration for dynamic loading
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    requestOptions: {
      cache: 'default' as RequestCache,
    },
  },
  
  // Debug settings (disabled in production)
  debug: process.env.NODE_ENV === 'development',
  
  // Resource loading settings
  load: 'currentOnly',
  preload: LANGUAGES,
};

// Initialize i18next instance
const initializeI18n = async (): Promise<typeof i18next> => {
  try {
    await i18next
      .use(i18nextBrowserLanguageDetector)
      .use(i18nextHttpBackend)
      .init({
        ...i18nConfig,
        // Load initial resources
        resources: {
          en: en as TranslationResource,
          es: es as TranslationResource,
          fr: fr as TranslationResource,
        },
        // Error handling for missing translations
        saveMissing: process.env.NODE_ENV === 'development',
        missingKeyHandler: (lng: string, ns: string, key: string) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Missing translation: ${lng}:${ns}:${key}`);
          }
        },
        // Pluralization rules
        pluralSeparator: '_',
        nsSeparator: ':',
        keySeparator: '.',
      });

    // Type augmentation for i18next
    declare module 'i18next' {
      interface CustomTypeOptions {
        defaultNS: typeof i18nConfig.defaultNS;
        resources: {
          en: typeof en;
          es: typeof es;
          fr: typeof fr;
        };
      }
    }

    return i18next;
  } catch (error) {
    console.error('Failed to initialize i18next:', error);
    throw error;
  }
};

// Initialize i18next
const i18n = await initializeI18n();

// Export configured i18next instance and types
export type { NamespaceType, LanguageType, TranslationResource };
export { i18nConfig, LANGUAGES, NAMESPACES };
export default i18n;