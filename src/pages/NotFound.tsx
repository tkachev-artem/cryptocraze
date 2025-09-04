import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useTranslation } from '../lib/i18n';

export function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        
        {/* Bear character */}
        <div className="mb-8">
          <img 
            src="/tutorial/bear-1.svg" 
            alt="Bear" 
            className="w-48 h-48 mx-auto mb-6"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Error message */}
        <div className="mb-8 max-w-md">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('errors.404.title')}
          </h2>
        </div>

        {/* Action button */}
        <div className="w-full max-w-sm">
          <Button
            onClick={() => navigate('/home')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {t('errors.404.goHome')}
          </Button>
        </div>

      </div>
    </div>
  );
}
