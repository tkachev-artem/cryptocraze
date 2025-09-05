import fs from 'fs';
import path from 'path';

interface TranslationCache {
  [locale: string]: any;
}

class ServerTranslations {
  private cache: TranslationCache = {};
  private defaultLocale = 'ru';

  private loadTranslation(locale: string): any {
    if (!this.cache[locale]) {
      try {
        const filePath = path.join(process.cwd(), 'src', 'locales', `${locale}.json`);
        const data = fs.readFileSync(filePath, 'utf8');
        this.cache[locale] = JSON.parse(data);
      } catch (error) {
        console.warn(`Failed to load translation file for locale: ${locale}`);
        return null;
      }
    }
    return this.cache[locale];
  }

  private getNestedValue(obj: any, key: string): string | null {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }
    
    return typeof current === 'string' ? current : null;
  }

  t(key: string, locale: string = this.defaultLocale): string {
    const translations = this.loadTranslation(locale);
    if (!translations) {
      return key; // Fallback to key if translations not found
    }

    const value = this.getNestedValue(translations, key);
    return value || key; // Fallback to key if translation not found
  }

  // Convenience method for error messages
  error(key: string, locale: string = this.defaultLocale): string {
    return this.t(`errors.${key}`, locale);
  }

  // Convenience method for notification titles
  notificationTitle(key: string, locale: string = this.defaultLocale): string {
    return this.t(`notifications.titles.${key}`, locale);
  }
}

export const serverTranslations = new ServerTranslations();