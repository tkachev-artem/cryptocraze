import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { useUser } from '../hooks/useUser';
import { API_BASE_URL } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export function Welcome() {
  const { isAuthenticated, isLoading, user } = useUser();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { t } = useTranslation();


  // Проверяем ошибки авторизации в URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      setShowErrorModal(true);
      // Очищаем URL от параметров ошибки
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Перенаправляем авторизованных пользователей в личный кабинет
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      window.location.href = '/home';
    }
  }, [isAuthenticated, isLoading, user]);

  // Показываем загрузку пока проверяем авторизацию
  if (isLoading) {
    return null;
  }

  // Если пользователь авторизован, не показываем ничего (будет перенаправление)
  if (isAuthenticated && user) {
    return null;
  }

  const redirectToLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <>
      <div className='min-h-screen flex flex-col items-center px-4 pb-28'>
        {/* Верхняя часть с пандой */}
        <div className='flex flex-col items-center pt-8 w-full'>
          <img 
            src="/panda.webp" 
            alt="Logo" 
            className="w-64 h-64 mx-auto select-none pointer-events-none" 
          />
        </div>

        {/* Контент */}
        <div className='flex-1 w-full' />
      </div>

      {/* Нижняя навигация */}
      <div 
        className='fixed inset-x-0 bottom-0 z-20 bg-white/90 backdrop-blur border-t border-gray-200'
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom))' }}
        aria-label={t('welcome.login.google')}
      >
        <div className='mx-auto w-full max-w-md px-4 pt-3 pb-4'>
          <Button 
            className="flex w-full h-12 items-center justify-center bg-[#0C54EA] px-4 text-white font-semibold hover:bg-[#0A47C7] transition-colors mb-3"
            onClick={redirectToLogin}
            aria-label={t('welcome.login.google')}
          >
            {t('welcome.login.google')}
          </Button>

          <p className="w-full text-xs text-black text-center leading-snug">
            {t('welcome.terms.agree')} {' '}
            <a href="#" className="text-gray-600 underline hover:text-gray-700">{t('welcome.terms.terms')}</a>
            {' '}{t('welcome.terms.and')}{' '}
            <a href="#" className="text-gray-600 underline hover:text-gray-700">{t('welcome.terms.privacy')}</a>
          </p>
        </div>
      </div>

      {/* Error Modal */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
        }}
      >
        <div>
          <h2>{t('welcome.authError.title')}</h2>
          <p>{t('welcome.authError.message')}</p>
        </div>
      </Modal>
    </>
  );
} 