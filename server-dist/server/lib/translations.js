"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverTranslations = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ServerTranslations {
    cache = {};
    defaultLocale = 'ru';
    loadTranslation(locale) {
        if (!this.cache[locale]) {
            try {
                const filePath = path_1.default.join(process.cwd(), 'src', 'locales', `${locale}.json`);
                const data = fs_1.default.readFileSync(filePath, 'utf8');
                this.cache[locale] = JSON.parse(data);
            }
            catch (error) {
                console.warn(`Failed to load translation file for locale: ${locale}`);
                return null;
            }
        }
        return this.cache[locale];
    }
    getNestedValue(obj, key) {
        const keys = key.split('.');
        let current = obj;
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            }
            else {
                return null;
            }
        }
        return typeof current === 'string' ? current : null;
    }
    t(key, locale = this.defaultLocale) {
        const translations = this.loadTranslation(locale);
        if (!translations) {
            return key; // Fallback to key if translations not found
        }
        const value = this.getNestedValue(translations, key);
        return value || key; // Fallback to key if translation not found
    }
    // Convenience method for error messages
    error(key, locale = this.defaultLocale) {
        return this.t(`errors.${key}`, locale);
    }
    // Convenience method for notification titles
    notificationTitle(key, locale = this.defaultLocale) {
        return this.t(`notifications.titles.${key}`, locale);
    }
}
exports.serverTranslations = new ServerTranslations();
