import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Grid } from '../components/ui/grid';
import { useUser } from '../hooks/useUser';

export function Welcome() {
  const { isAuthenticated, isLoading, user } = useUser();
  const [showErrorModal, setShowErrorModal] = useState(false);

  console.log('Welcome component - user:', user, 'isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);

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
    console.log('Welcome useEffect - checking redirect conditions:', { isLoading, isAuthenticated, user });
    if (!isLoading && isAuthenticated && user) {
      console.log('Welcome useEffect - redirecting to /home');
      window.location.href = '/home';
    }
  }, [isAuthenticated, isLoading, user]);

  // Показываем загрузку пока проверяем авторизацию
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  // Если пользователь авторизован, показываем сообщение о перенаправлении
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Перенаправление в личный кабинет...</div>
      </div>
    );
  }

  const redirectToLogin = () => {
    window.location.href = 'http://localhost:8000/api/auth/google';
  };

  return (
    <>
      <Grid className='items-center p-2'>
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
              Войти через Google
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
            Facebook
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
            Apple ID
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
            GitHub
          </Button>
        </div>

        {/* Terms */}
        <p className="w-full mt-8 text-sm text-black text-center">
          Нажимая «Войти», вы соглашаетесь с нашими{' '}
          <a href="#" className="text-gray-600 underline hover:text-gray-700">Условиями использования</a>
          {' '}и{' '}
          <a href="#" className="text-gray-600 underline hover:text-gray-700">Политикой конфиденциальности</a>
        </p>
      </Grid>

    {/* Error Modal */}
    <Modal
      isOpen={showErrorModal}
      onClose={() => {
        setShowErrorModal(false);
      }}
    >
      <div>
        <h2>Ошибка</h2>
        <p>Произошла ошибка при авторизации. Пожалуйста, попробуйте еще раз.</p>
      </div>
    </Modal>
  </>
  );
} 