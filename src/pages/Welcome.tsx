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
      <div className='items-center p-2'>
        {/* Panda Mascot */}
        <img 
          src="/panda.png" 
          alt="Logo" 
          className="w-64 h-64 mx-auto mb-8 select-none pointer-events-none" 
        />

        <div className='mb-8'>
          <Button 
              className="flex w-full h-12 items-center justify-center bg-[#0C54EA] px-4  text-white font-semibold hover:bg-[#0A47C7] transition-colors"
              onClick={redirectToLogin}
            >
              {t('welcome.login.google')}
            </Button> 
        </div>

        {/* Кнопки */}
        <div className="space-y-4">

          <Button 
            variant="outline" 
            className="w-full h-12 text-lg font-semibold text-black border-1"
            onClick={
              () => {
                setShowErrorModal(true);
              }
            }
          >
            <img src="/facebook.svg" alt="Facebook" className="w-6 h-6 mr-2 select-none pointer-events-none" />
            {t('welcome.login.facebook')}
          </Button>

          <Button 
            variant="outline" 
            className="w-full h-12 text-lg font-semibold text-black border-1"
            onClick={
              () => {
                setShowErrorModal(true);
              }
            }
          >
            <img src="/apple.svg" alt="Apple" className="w-6 h-6 mr-2 select-none pointer-events-none" />
            {t('welcome.login.apple')}
          </Button>

          <Button 
            variant="outline" 
            className="w-full h-12 text-lg font-semibold text-gray-800 border-1 rounded-full"
            onClick={
              () => {
                setShowErrorModal(true);
              }
            }
          >
            <img src="/github.svg" alt="GitHub" className="w-6 h-6 mr-2 select-none pointer-events-none" />
            {t('welcome.login.github')}
          </Button>
        </div>

        {/* Terms */}
        <p className="w-full mt-8 text-sm text-black text-center">
          {t('welcome.terms.agree')} {' '}
          <a href="#" className="text-gray-600 underline hover:text-gray-700">{t('welcome.terms.terms')}</a>
          {' '}{t('welcome.terms.and')}{' '}
          <a href="#" className="text-gray-600 underline hover:text-gray-700">{t('welcome.terms.privacy')}</a>
        </p>
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