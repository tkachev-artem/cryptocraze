import { useEffect, useState } from 'react';

// Static imports instead of dynamic
import ruTranslations from '../locales/ru.json';
import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';
import frTranslations from '../locales/fr.json';
import ptTranslations from '../locales/pt.json';
import { ensureLanguageInitialized, setPreferredLanguage, type SupportedLanguage } from './languageUtils';

type TranslationCache = Record<string, Record<string, unknown>>

const translationCache: TranslationCache = {};

// --- Global i18n store ---
type Language = SupportedLanguage;
let currentLanguage: Language | null = null;
let currentTranslations: Record<string, unknown> = {};
let isLoadingGlobal = true;
const listeners = new Set<() => void>();

const staticTranslations: Record<Language, Record<string, unknown>> = {
  ru: ruTranslations,
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  pt: ptTranslations,
};

const notify = () => { listeners.forEach((fn) => { fn(); }); };

const loadTranslationsGlobal = async (lang: Language) => {
  isLoadingGlobal = true;
  notify();
  try {
    if (lang in translationCache) {
      currentTranslations = translationCache[lang];
      isLoadingGlobal = false;
      notify();
      return;
    }
    const data = staticTranslations[lang];
    if (!data) {
      throw new Error(`No translations found for language: ${lang}`);
    }
    translationCache[lang] = data;
    currentTranslations = data;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    // fallback to EN
    if (lang !== 'en') {
      const enData = staticTranslations.en;
      if (enData) {
        currentTranslations = enData;
        translationCache.en = enData;
      } else {
        console.error('Failed to load fallback EN translations');
        currentTranslations = {};
      }
    } else {
      currentTranslations = {};
    }
  } finally {
    isLoadingGlobal = false;
    notify();
  }
};

export const setGlobalLanguage = (newLanguage: Language) => {
  const normalized = setPreferredLanguage(newLanguage);
  currentLanguage = normalized;
  void loadTranslationsGlobal(normalized);
};

// Initialize synchronously with static translations
const initializeSync = () => {
  if (!currentLanguage) {
    const initialized = ensureLanguageInitialized();
    currentLanguage = initialized;
    // Load synchronously for static imports
    const data = staticTranslations[initialized];
    if (data) {
      translationCache[initialized] = data;
      currentTranslations = data;
      isLoadingGlobal = false;
    }
  }
};

// initialize once on first import
initializeSync();

export type UseTranslationReturn = {
  language: Language;
  translations: Record<string, unknown>;
  isLoading: boolean;
  changeLanguage: (newLanguage: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function useTranslation(): UseTranslationReturn {
  const [language, setLanguage] = useState<Language>(currentLanguage ?? 'en');
  const [translations, setTranslations] = useState<Record<string, unknown>>(currentTranslations);
  const [isLoading, setIsLoading] = useState<boolean>(isLoadingGlobal);

  useEffect(() => {
    const update = () => {
      setLanguage(currentLanguage ?? 'en');
      setTranslations(currentTranslations);
      setIsLoading(isLoadingGlobal);
    };
    listeners.add(update);
    // immediate sync
    update();
    return () => { listeners.delete(update); };
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setGlobalLanguage(newLanguage);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }
    if (typeof value !== 'string') return key;
    if (params) {
      return Object.entries(params).reduce(
        (result, [paramKey, paramValue]) => result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
        value
      );
    }
    return value;
  };

  return { language, translations, isLoading, changeLanguage, t };
}
