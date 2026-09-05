import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode, LanguageOption, LANGUAGES, translations, defaultLanguage } from '../constants/i18n';
import { logApiError } from '../services/apiError';

const LANGUAGE_STORAGE_KEY = '@app_language';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLangState] = useState<LanguageCode>(defaultLanguage);

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'kn' || saved === 'ml')) {
        setLangState(saved as LanguageCode);
      }
    } catch (error) {
      logApiError('Language load', error);
    }
  };

  const setLanguage = async (newLang: LanguageCode) => {
    setLangState(newLang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (error) {
      logApiError('Language save', error);
    }
  };

  /**
   * Helper function to safely fetch nested translation key strings.
   * e.g., t('auth.welcomeBack') or t('common.appName')
   */
  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      let current: any = translations[language] || translations[defaultLanguage];

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          // Fallback to English if missing in current language
          let fallback: any = translations[defaultLanguage];
          for (const fallbackKey of keys) {
            if (fallback && typeof fallback === 'object' && fallbackKey in fallback) {
              fallback = fallback[fallbackKey];
            } else {
              return path; // Return raw key path if not found
            }
          }
          current = fallback;
          break;
        }
      }

      if (typeof current !== 'string') {
        return path;
      }

      let result = current;
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }

      return result;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
