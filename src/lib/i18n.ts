import { useState, useEffect } from 'react';

type Language = 'en' | 'es' | 'fr' | 'pt';

interface TranslationCache {
  [key: string]: any;
}

const translationCache: TranslationCache = {};

export function useTranslation() {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get language from localStorage or browser
    const savedLanguage = localStorage.getItem('language') as Language;
    const browserLanguage = navigator.language.slice(0, 2) as Language;
    const defaultLanguage = savedLanguage || 
      (['en', 'es', 'fr', 'pt'].includes(browserLanguage) ? browserLanguage : 'en');
    
    setLanguage(defaultLanguage);
    loadTranslations(defaultLanguage);
  }, []);

  const loadTranslations = async (lang: Language) => {
    setIsLoading(true);
    
    try {
      if (translationCache[lang]) {
        setTranslations(translationCache[lang]);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/src/locales/${lang}.json`);
      const data = await response.json();
      
      translationCache[lang] = data;
      setTranslations(data);
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      // Fallback to English
      if (lang !== 'en') {
        loadTranslations('en');
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    loadTranslations(newLanguage);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (typeof value !== 'string') {
      return key; // Return key if translation not found
    }
    
    if (params) {
      return Object.entries(params).reduce(
        (result, [paramKey, paramValue]) =>
          result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
        value
      );
    }
    
    return value;
  };

  return {
    language,
    translations,
    isLoading,
    changeLanguage,
    t,
  };
}
