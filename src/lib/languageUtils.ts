// Утилиты для определения и синхронизации языка приложения
import { getCookie, setCookie, LANGUAGE_COOKIE_NAME } from './cookieUtils';

export const SUPPORTED_LANGUAGES = ['ru', 'en', 'es', 'fr', 'pt'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

const normalizeLanguage = (lang: string | null | undefined): SupportedLanguage | null => {
  if (!lang || typeof lang !== 'string') return null;
  const lower = lang.toLowerCase();
  // Берём только первые 2 символа (ru-RU -> ru)
  const two = lower.slice(0, 2);
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(two) ? (two as SupportedLanguage) : null;
};

const getMetaContentLanguage = (): SupportedLanguage | null => {
  try {
    const meta = document.querySelector('meta[http-equiv="content-language"]');
    if (!meta) return null;
    return normalizeLanguage(String(meta.getAttribute('content')));
  } catch {
    return null;
  }
};

const getHtmlLang = (): SupportedLanguage | null => {
  try {
    const htmlLang = document.documentElement.lang;
    return normalizeLanguage(htmlLang);
  } catch {
    return null;
  }
};

export const getPreferredLanguage = (): SupportedLanguage => {
  // 1) User preference from localStorage (highest priority for manual selection)
  try {
    const fromStorage = normalizeLanguage(localStorage.getItem('language'));
    if (fromStorage) return fromStorage;
  } catch { /* noop */ }

  // 2) Cookie (for server synchronization)
  const fromCookie = normalizeLanguage(getCookie(LANGUAGE_COOKIE_NAME));
  if (fromCookie) return fromCookie;

  // 3) Browser language detection (automatic based on user's system)
  try {
    // Check navigator.languages array for multiple preferences
    if (navigator.languages?.length) {
      for (const lang of navigator.languages) {
        const normalized = normalizeLanguage(lang);
        if (normalized) return normalized;
      }
    }
    
    // Fallback to navigator.language
    const fromNavigator = normalizeLanguage(navigator.language);
    if (fromNavigator) return fromNavigator;
  } catch { /* noop */ }

  // 4) <meta http-equiv="content-language"> (legacy support)
  const fromMeta = getMetaContentLanguage();
  if (fromMeta) return fromMeta;

  // 5) <html lang="..."> (legacy support)
  const fromHtml = getHtmlLang();
  if (fromHtml) return fromHtml;

  // 6) Default fallback - English as primary default
  return 'en';
};

export const setPreferredLanguage = (language: string): SupportedLanguage => {
  const normalized = normalizeLanguage(language) ?? getPreferredLanguage();

  // cookie
  setCookie(LANGUAGE_COOKIE_NAME, normalized);

  // localStorage
  try {
    localStorage.setItem('language', normalized);
  } catch { /* noop */ }

  // <html lang>
  try {
    document.documentElement.lang = normalized;
  } catch { /* noop */ }

  // <meta http-equiv="content-language">
  try {
    const head = document.head ?? document.getElementsByTagName('head')[0];
    let meta = document.querySelector('meta[http-equiv="content-language"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'content-language');
      head.appendChild(meta);
    }
    meta.setAttribute('content', normalized);
  } catch { /* noop */ }

  return normalized;
};

// Инициализация: привести все источники к одному и тому же языку
export const ensureLanguageInitialized = (): SupportedLanguage => {
  const lang = getPreferredLanguage();
  return setPreferredLanguage(lang);
};

