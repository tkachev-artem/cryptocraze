import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../../app/userSlice';
import { useState } from 'react';
import { Modal } from '../../components/ui/modal';

const Settings: FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  const handleBackClick = () => {
    void navigate('/home');
  };

  const handlePremiumClick = () => {
    // Логика для перехода на Premium
    console.log('Переход на Premium');
  };

  const handleNotificationsClick = () => {
    // Логика для настроек уведомлений
    console.log('Настройки уведомлений');
  };

  const handleLanguageClick = () => {
    void navigate('/home/language');
  };

  const handleShareClick = () => {
    // Логика для поделиться
    console.log('Поделиться');
  };

  const handleDeleteAccountClick = () => {
    setIsDeleteAccountModalOpen(true);
  };



  const handleCloseDeleteAccountModal = () => {
    setIsDeleteAccountModalOpen(false);
  };

  const handleDeleteAccount = () => {
    // Логика удаления аккаунта
    console.log('Удаление аккаунта');
    setIsDeleteAccountModalOpen(false);
    // Здесь можно добавить логику удаления аккаунта
  };

  const handleOpenLogoutModal = () => {
    setIsLogoutModalOpen(true);
  };

  const handleCloseLogoutModal = () => {
    setIsLogoutModalOpen(false);
  };

  const handleLogout = () => {
    // Логика выхода из аккаунта
    console.log('Выход из аккаунта');
    setIsLogoutModalOpen(false);
    // Здесь можно добавить очистку пользователя и редирект
    // navigate('/welcome');
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
            >
              <img src="/top-menu/back.svg" alt="Back" className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-black">Настройки</h1>
          </div>
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            onClick={handleOpenLogoutModal}
          >
            <img src="/top-menu/exit.svg" alt="Exit" className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Premium Banner */}
      <div className="px-4 py-3">
        <div 
          className="bg-[#0C54EA] rounded-xl p-4 flex items-center justify-between cursor-pointer"
          onClick={handlePremiumClick}
        >
          <span className="text-white font-bold text-base">Перейти на Premium</span>
          <div className="relative">
            {/* Crown icon */}
            <img src="/settings/crown.svg" alt="Crown" className="w-[64px] h-[42px]" />
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="px-4 py-3 space-y-2">
        {/* Notifications */}
        <div 
          className="bg-white rounded-full border border-gray-200 p-4 flex items-center gap-3.5 cursor-pointer"
          onClick={handleNotificationsClick}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <img src="/settings/notifications.svg" alt="Notifications" className="w-5.5 h-5.5" />
          </div>
          <span className="text-black font-medium text-base">Уведомления</span>
        </div>

        {/* Language */}
        <div 
          className="bg-white rounded-full border border-gray-200 p-4 flex items-center gap-3.5 cursor-pointer relative"
          onClick={handleLanguageClick}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <img src="/settings/language.svg" alt="Language" className="w-6 h-6" />
          </div>
          <span className="text-black font-medium text-base">Язык</span>
          <span className="absolute right-4 text-black font-semibold text-xs opacity-50">
            {user?.preferredLanguage ?? 'Русский'}
          </span>
        </div>

        {/* Share */}
        <div 
          className="bg-white rounded-full border border-gray-200 p-4 flex items-center gap-3.5 cursor-pointer"
          onClick={handleShareClick}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <img src="/settings/share.svg" alt="Share" className="w-6 h-6" />
          </div>
          <span className="text-black font-medium text-base">Поделиться</span>
        </div>

        {/* Delete Account */}
        <div 
          className="bg-white rounded-full border border-gray-200 p-4 flex items-center gap-3.5 cursor-pointer"
          onClick={handleDeleteAccountClick}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <img src="/settings/delete.svg" alt="Delete Account" className="w-6 h-6" />
          </div>
          <span className="text-black font-medium text-base">Удалить аккаунт</span>
        </div>
      </div>

      {/* App Info */}
      <div className="px-4 py-4 space-y-1">
        <p className="text-black font-medium text-xs opacity-50 tracking-wide">
          Версия приложения 0.1.2
        </p>
        <p className="text-black font-medium text-xs opacity-50 tracking-wide">
          ID аккаунта {user?.id ?? 'Загрузка...'}
        </p>
      </div>

      {/* Logout Modal */}
      <Modal isOpen={isLogoutModalOpen} onClose={handleCloseLogoutModal}>
        <div className="flex flex-col items-center text-center w-full max-w-sm">
          {/* Bear Image */}
          <div className="mb-6">
            <img src="/settings/modal-image.svg" alt="Bear" className="w-[141px] h-[198px]" />
          </div>
          
          {/* Title */}
          <h2 className="text-xl font-bold text-black mb-3 text-center w-full">
            Вы точно хотите выйти из аккаунта?
          </h2>
          
          
          {/* Buttons */}
          <div className="w-full flex flex-row gap-4 justify-center">
            <button
              onClick={handleLogout}
              className="bg-white text-[#0C54EA] font-semibold text-center py-3 px-6 rounded-full border-2 border-[#0C54EA] hover:bg-gray-50 transition-colors"
              aria-label="Выйти из аккаунта"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleLogout();
                }
              }}
            >
              Да
            </button>
            
            <button
              onClick={handleCloseLogoutModal}
              className=" bg-[#0C54EA] text-white font-semibold text-center py-3 px-6 rounded-full hover:bg-[#0A47C7] transition-colors"
              aria-label="Отменить выход"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCloseLogoutModal();
                }
              }}
            >
              Нет
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={isDeleteAccountModalOpen} onClose={handleCloseDeleteAccountModal}>
        <div className="flex flex-col items-center text-center w-full max-w-sm">
          {/* Bear Image */}
          <div className="mb-6">
            <img src="/settings/modal-image.svg" alt="Bear" className="w-[141px] h-[198px]" />
          </div>
          
          {/* Title */}
          <h2 className="text-xl font-bold text-black mb-3 text-center w-full">
            Вы точно хотите удалить аккаунт?
          </h2>
          
          {/* Buttons */}
          <div className="w-full flex flex-row gap-4 justify-center">
            <button
              onClick={handleDeleteAccount}
              className="bg-white text-[#0C54EA] font-semibold text-center py-3 px-6 rounded-full border-2 border-[#0C54EA] hover:bg-gray-50 transition-colors"
              aria-label="Удалить аккаунт"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleDeleteAccount();
                }
              }}
            >
              Да
            </button>
            
            <button
              onClick={handleCloseDeleteAccountModal}
              className="bg-[#0C54EA] text-white font-semibold text-center py-3 px-6 rounded-full hover:bg-[#0A47C7] transition-colors"
              aria-label="Отменить удаление"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCloseDeleteAccountModal();
                }
              }}
            >
              Нет
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
