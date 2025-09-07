import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../../app/userSlice';
import { usePremium } from '../../hooks/usePremium';
import { useTranslation } from '@/lib/i18n';
import { useNotifications } from '../../hooks/useNotifications';

type TopMenuProps = {
  variant?: 'home' | 'profile';
};

const TopMenu = ({ variant = 'home' }: TopMenuProps) => {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const { isPremium } = usePremium();
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();

  // Получаем URL аватарки из Redux или используем дефолтную
  const avatarUrl = user?.profileImageUrl ?? '/avatar.webp';

  if (variant === 'profile') {
    return (
      <div className='flex flex-row justify-between gap-2 items-center px-2'>
        <div></div>
        <button
          className="p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C54EA]/50"
          onClick={() => {
            void navigate('/edit-profile');
          }}
          aria-label={t('profile.editTitle') || 'Edit Profile'}
        >
          <img src="/top-menu/edit.svg" alt="edit" className='w-5 h-5' loading="eager" />
        </button>
      </div>
    );
  }

  return (
    <div className='flex flex-row justify-between gap-2 items-center'>
      <div className='flex flex-row gap-2 items-center'>
        <button 
          className='p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C54EA]/50'
          onClick={() => {
            void navigate('/profile');
          }}
          aria-label={t('profile.title') || 'Profile'}
        >
          <img src={avatarUrl} alt="avatar" className='w-10 h-10 rounded-full object-cover' loading="eager" />
        </button>

        <button className="flex h-8 items-center gap-2 px-1 py-0 rounded-2xl mr-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C54EA]/50 whitespace-nowrap bg-[#F5A600]"
          onClick={() => {
            void navigate('/home/premium');
          }}
          aria-label={t('settings.premium.goPremium')}
        >
          <img src="/crown.webp" alt="premium" className='w-6 h-6' loading="eager" />
          <p className="text-sm font-bold text-black">
            {isPremium ? t('settings.premium.pro') : t('settings.premium.goPremium')}
          </p>
        </button>
      </div>

      <button
        className='p-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C54EA]/50 relative'
        onClick={() => {
          void navigate('/home/settings');
        }}
        aria-label={t('settings.title')}
      >
        <img src="/settings.svg" alt="settings" className='w-6 h-6' loading="eager" />
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 bg-red-500 rounded-full w-3 h-3"></div>
        )}
      </button>
    </div>
  );
};

export default TopMenu; 