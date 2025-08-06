import React from 'react';
import { Select } from './ui/select';
import { useTranslation } from '../lib/i18n';

export function LanguageSelector() {
  const { language, changeLanguage } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
  ];

  return (
    <Select
      value={language}
      onChange={(e) => changeLanguage(e.target.value as any)}
      className="w-auto"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </Select>
  );
}
