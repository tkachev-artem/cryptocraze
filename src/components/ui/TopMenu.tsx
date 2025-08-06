import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../../app/userSlice';

type TopMenuProps = {
  variant?: 'home' | 'profile';
};

const TopMenu = ({ variant = 'home' }: TopMenuProps) => {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  // Получаем URL аватарки из Redux или используем дефолтную
  const avatarUrl = user?.profileImageUrl ?? '/avatar.png';

  if (variant === 'profile') {
    return (
      <div className='flex flex-row justify-between gap-2 items-center px-2'>
        <div></div>
        <div
          onClick={() => {
            void navigate('/edit-profile');
          }}
        >
          <img src="/top-menu/edit.svg" alt="edit" className='w-5 h-5' />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-row justify-between gap-2 items-center'>
      <div className='flex flex-row gap-2 items-center'>
        <div 
          onClick={() => {
            void navigate('/profile');
          }}
        >
          <img src={avatarUrl} alt="avatar" className='w-10 h-10 rounded-full' />
        </div>

        <div className='flex h-8 items-center gap-2 bg-[#F5A600] px-1 py-0 rounded-2xl mr-4'
          onClick={() => {
            void navigate('/premium');
          }}
        >
          <img src="/crown.png" alt="premium" className='w-6 h-6' />
          <p className='text-sm font-semibold text-black'>Перейти на Premium</p>
        </div>
      </div>

      <div
        onClick={() => {
          void navigate('/home/settings');
        }}
      >
        <img src="/settings.svg" alt="settings" className='w-6 h-6' />
      </div>
    </div>
  );
};

export default TopMenu; 