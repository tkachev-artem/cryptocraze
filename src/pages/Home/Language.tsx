import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../../app/userSlice';
import { useState, useEffect } from 'react';
import { DEFAULT_LANGUAGE } from '../../lib/cookieUtils';
import { useTranslation } from '../../lib/i18n';
import { getPreferredLanguage, setPreferredLanguage } from '../../lib/languageUtils';

type Language = {
  id: string;
  name: string;
  code: string;
};

const languages: Language[] = [
  { id: 'ru', name: 'Русский', code: 'ru' },
  { id: 'en', name: 'English', code: 'en' },
  { id: 'es', name: 'Español', code: 'es' },
  { id: 'fr', name: 'Français', code: 'fr' },
  { id: 'pt', name: 'Português', code: 'pt' },
];

const Language: FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const { t, changeLanguage } = useTranslation();

  // Загружаем язык при инициализации (cookie/meta/html/localStorage/navigator)
  useEffect(() => {
    const savedLanguage = getPreferredLanguage();
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    } else if (user?.preferredLanguage) {
      setSelectedLanguage(user.preferredLanguage);
    }
  }, [user]);

  const handleBackClick = () => {
    void navigate('/home/settings');
  };

  const handleLanguageSelect = (languageId: string) => {
    setSelectedLanguage(languageId);
    setPreferredLanguage(languageId);
    try { changeLanguage(languageId as 'ru' | 'en' | 'es' | 'fr' | 'pt'); } catch { /* noop */ }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Navigation Bar */}
      <div className="bg-white">
        {/* Top App Bar */}
        <div className="flex items-center justify-between px-2 pt-4 pb-2">
          <div className="flex items-center gap-1">
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              onClick={handleBackClick}
              aria-label={t('common.back')}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBackClick();
                }
              }}
            >
              <img src="/top-menu/back.svg" alt="Back" className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-black">{t('language.title')}</h1>
          </div>
        </div>
      </div>

      {/* Image Section */}
      <div className="px-4 py-4">
          <div className="h-[200px] flex items-center justify-center relative overflow-hidden">
          <img 
            src="/settings/language-panda.svg" 
            alt="Language Panda" 
              className="w-[120px] h-[170px] object-contain select-none"
          />
        </div>
      </div>

      {/* Text Section */}
      <div className="px-4 py-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-black">{t('language.title')}</h2>
        <p className="text-sm text-black opacity-50 leading-relaxed max-w-xs mx-auto">
          {t('language.description')}
        </p>
      </div>

      {/* Language Selection */}
      <div className="px-4 py-4 space-y-2">
        {languages.map((language) => (
          <div 
            key={language.id}
            className="bg-white rounded-full border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              handleLanguageSelect(language.id);
            }}
            aria-label={`${t('nav.back')} ${language.name}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleLanguageSelect(language.id);
              }
            }}
          >
            <span className="text-black font-medium text-base">
              {t(`language.languages.${language.id}`)}
            </span>
            
            {/* Radio Button */}
            <div className="relative select-none">
              <div 
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedLanguage === language.id 
                    ? 'border-[#0C54EA]' 
                    : 'border-gray-300'
                }`}
              >
                {selectedLanguage === language.id && (
                  <div className="w-3 h-3 bg-[#0C54EA] rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Spacing */}
      <div className="h-20"></div>
    </div>
  );
};

export default Language;
