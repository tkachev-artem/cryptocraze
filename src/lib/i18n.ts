import { useEffect, useState } from 'react';
import { ensureLanguageInitialized, setPreferredLanguage, type SupportedLanguage } from './languageUtils';

type TranslationCache = Record<string, Record<string, unknown>>

const translationCache: TranslationCache = {};

// --- Global i18n store ---
type Language = SupportedLanguage;
let currentLanguage: Language | null = null;
let currentTranslations: Record<string, unknown> = {};
let isLoadingGlobal = true;
const listeners = new Set<() => void>();

const translationLoaders: Record<Language, () => Promise<{ default: Record<string, unknown> }>> = {
  ru: () => import('../locales/ru.json'),
  en: () => import('../locales/en.json'),
  es: () => import('../locales/es.json'),
  fr: () => import('../locales/fr.json'),
  pt: () => import('../locales/pt.json'),
};

const notify = () => { listeners.forEach((fn) => { fn(); }); };

const loadTranslationsGlobal = async (lang: Language) => {
  isLoadingGlobal = true;
  notify();
  try {
    if (lang in translationCache) {
      currentTranslations = translationCache[lang];
      return;
    }
    const module = await translationLoaders[lang]();
    const data = module.default;
    translationCache[lang] = data;
    currentTranslations = data;
  } catch {
    // fallback to EN
    if (lang !== 'en') {
      await loadTranslationsGlobal('en');
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

// initialize once on first import
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!currentLanguage) {
  const initialized = ensureLanguageInitialized();
  currentLanguage = initialized;
  void loadTranslationsGlobal(initialized);
}

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
