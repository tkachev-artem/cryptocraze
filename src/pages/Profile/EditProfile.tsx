import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '../../lib/i18n';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch } from '../../app/hooks';
import { updateUserData, type User } from '../../app/userSlice';
import BottomNavigation from '../../components/ui/BottomNavigation';
import { Grid } from '@/components/ui/grid';
import { Modal } from '@/components/ui/modal';
import { z } from 'zod';

// Zod схема для валидации формы
const editProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Имя обязательно для заполнения')
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно превышать 50 символов'),
  phone: z
    .string()
    .min(1, 'Номер телефона обязателен для заполнения')
    .regex(/^[+]?[1-9][\d]{0,15}$/, 'Введите корректный номер телефона'),
  email: z
    .string()
    .min(1, 'Email обязателен для заполнения')
    .max(100, 'Email не должен превышать 100 символов')
    .refine((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), {
      message: 'Введите корректный email',
    }),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

const EditProfile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isLoading, isAuthenticated } = useUser();

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
    },
  });

  // Загружаем данные пользователя в форму
  useEffect(() => {
    if (user) {
      reset({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: user.phone ?? '',
        email: user.email || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: EditProfileFormData) => {
    try {
      // Разделяем имя на firstName и lastName
      const nameParts = data.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Проверяем, изменились ли данные
      const currentName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
      const currentPhone = user?.phone ?? '';
      const currentEmail = user?.email ?? '';

      const hasChanges = 
        data.name.trim() !== currentName ||
        data.phone !== currentPhone ||
        data.email !== currentEmail;

      if (!hasChanges) {
        // Данные не изменились, показываем модальное окно без запроса
        setShowSuccessModal(true);
        return;
      }

      const response = await fetch('http://localhost:8000/api/auth/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName,
          lastName,
          email: data.email,
          phone: data.phone,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении профиля');
      }

      const updatedUser = await response.json() as User;
      
      // Обновляем данные в Redux store
      void dispatch(updateUserData(updatedUser));
      
      // Показываем модальное окно успеха
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
    }
  };

  const handleBack = () => {
    void navigate('/profile');
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Требуется авторизация</div>
      </div>
    );
  }

  return (
    <Grid className='py-2'>
      <div className="min-h-screen bg-[#F1F7FF] pb-[70px]">
        {/* Top App Bar */}
        <div className="bg-white px-2 py-2">
          <div className='flex flex-row justify-between gap-2 items-center px-2'>
            <div
              onClick={handleBack}
              className="flex items-center gap-2 cursor-pointer"
            >
              <img src="/top-menu/back.svg" alt="back" className="w-6 h-6" />
              <span className="text-xl font-semibold">Редактировать профиль</span>
            </div>
            <div></div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="bg-white">
          <div className="flex flex-col items-center gap-4 px-4 pt-6">
            {/* Avatar Section */}
            <div className="relative">
              <div className="w-[110px] h-[110px] bg-[#F1F7FF] rounded-[55px] flex items-center justify-center overflow-hidden">
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <img 
                  src="/panda.png" 
                  alt="Default Avatar" 
                  className={`w-[72px] h-[74px] ${user.profileImageUrl ? 'hidden' : ''}`}
                />
              </div>
              
              {/* Edit Avatar Button */}
              <button 
                type="button"
                className="absolute bottom-0 right-0 flex items-center justify-center hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <div className="relative">
                  <img src="/ellipse.svg" alt="edit background" className="w-[110px] h-[54px]" />
                  <img 
                    src="/top-menu/edit-light.svg" 
                    alt="edit" 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5" 
                  />
                </div>
              </button>
            </div>

            {/* User Name Display */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-black">
                {watch('name') || 'James Foster'}
              </h2>
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="bg-[#F1F7FF] px-4 mt-4 space-y-3">
            <div className="text-left flex flex-col gap-3 pt-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black opacity-50 mb-2">
                Имя
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[40px] focus:outline-none focus:ring-2 focus:ring-[#0C54EA] ${
                  errors.name ? 'border-red-500' : ''
                }`}
                placeholder="Ваше имя"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-black opacity-50 mb-2">
                Номер телефона
              </label>
              <input
                type="tel"
                id="phone"
                {...register('phone')}
                className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[40px] focus:outline-none focus:ring-2 focus:ring-[#0C54EA] ${
                  errors.phone ? 'border-red-500' : ''
                }`}
                placeholder="Ваш номер телефона"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black opacity-50 mb-2">
                Почта
              </label>
              <input
                type="email"
                id="email"
                {...register('email')}
                className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[40px] focus:outline-none focus:ring-2 focus:ring-[#0C54EA] ${
                  errors.email ? 'border-red-500' : ''
                }`}
                placeholder="Ваш email"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Save Button */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-[100px] font-bold text-base transition-colors ${
                  !isSubmitting
                    ? 'bg-[#0C54EA] text-white hover:bg-[#0A4BD9]'
                    : 'bg-[#0C54EA] text-white opacity-30 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
            </div>
          </form>
        </div>
      </div>
      
      {/* Success Modal */}
      <Modal 
        isOpen={showSuccessModal} 
        onClose={() => {
          setShowSuccessModal(false);
          void navigate('/profile');
        }}
      >
        <div className="text-center">
          {/* Success Icon */}
          <img src="/accept.png" alt="success" className="w-46 h-46 mx-auto mb-4" />
          
          {/* Title */}
          <h3 className="text-2xl font-bold text-black mb-10">
            Ваши данные успешно обновлены
          </h3>
          
          {/* Button */}
          <button
            onClick={() => {
              setShowSuccessModal(false);
              void navigate('/profile');
            }}
            className="w-full bg-[#0C54EA] text-white font-bold py-3 px-4 rounded-[100px] hover:bg-[#0A4BD9] transition-colors"
          >
            Закрыть
          </button>
        </div>
      </Modal>
      
      <BottomNavigation />
    </Grid>
  );
};

export default EditProfile;
