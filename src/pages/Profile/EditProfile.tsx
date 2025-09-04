import type React from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from '../../lib/i18n';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch } from '../../app/hooks';
import { updateUserData, type User } from '../../app/userSlice';
import BottomNavigation from '../../components/ui/BottomNavigation';
import { Modal } from '@/components/ui/modal';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';

// Схема валидации формируется динамически, чтобы использовать переводы
const makeEditProfileSchema = (t: (k: string) => string) => z.object({
  name: z
    .string()
    .min(1, t('validation.nameRequired'))
    .min(2, t('validation.nameMin'))
    .max(50, t('validation.nameMax')),
  phone: z
    .string()
    .min(1, t('validation.phoneRequired'))
    .regex(/^[+]?[1-9][\d]{0,15}$/, t('validation.phoneInvalid')),
  email: z
    .string()
    .min(1, t('validation.emailRequired'))
    .max(100, t('validation.emailMax'))
    .refine((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), {
      message: t('validation.emailInvalid'),
    }),
});

type EditProfileFormData = z.infer<ReturnType<typeof makeEditProfileSchema>>;

const EditProfile: React.FC = () => {
  const { t } = useTranslation();
  const editProfileSchema = useMemo(() => makeEditProfileSchema(t), [t]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isLoading, isAuthenticated } = useUser();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const response = await fetch(`${API_BASE_URL}/auth/user/update`, {
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
        throw new Error(t('profile.updateError'));
      }

      const updatedUser = await response.json() as User;
      
      // Обновляем данные в Redux store
      void dispatch(updateUserData(updatedUser));
      
      // Показываем модальное окно успеха
      setShowSuccessModal(true);
    } catch (error) {
      console.error(t('profile.updateError'), error);
    }
  };

  const handleBack = () => {
    void navigate('/profile');
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(t('profile.fileTooLarge'));
        return;
      }

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert(t('profile.imagesOnly'));
        return;
      }

      setSelectedPhoto(file);
      
      // Создаем превью
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) return;

    try {
      setIsUploadingPhoto(true);
      
      const formData = new FormData();
      formData.append('avatar', selectedPhoto);

      const response = await fetch(`${API_BASE_URL}/auth/user/upload-avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t('profile.updateError'));
      }

      const updatedUser = await response.json() as User;
      
      // Обновляем данные в Redux store
      void dispatch(updateUserData(updatedUser));
      
      // Очищаем состояние
      setSelectedPhoto(null);
      setPhotoPreview(null);
      
    } catch (error) {
      console.error(t('profile.uploadError'), error);
      alert(t('profile.uploadError'));
    } finally {
      setIsUploadingPhoto(false);
    }
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
        <div className="text-xl">{t('auth.loginRequired')}</div>
      </div>
    );
  }

  return (
    <div className='py-2'>
      <div className="min-h-screen bg-[#F1F7FF] pb-[calc(70px+env(safe-area-inset-bottom))]">
        {/* Top App Bar */}
        <div className="bg-white px-2 py-2">
          <div className='flex flex-row justify-between gap-2 items-center px-2'>
            <div
              onClick={handleBack}
              className="flex items-center gap-2 cursor-pointer"
            >
              <img src="/top-menu/back.svg" alt="back" className="w-6 h-6" />
              <span className="text-xl font-semibold">{t('profile.editTitle') || 'Редактировать профиль'}</span>
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
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Photo Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt={t('profile.avatar') || 'Profile'} 
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
                  alt={t('profile.avatarDefault') || 'Default Avatar'} 
                  className={`w-[72px] h-[74px] ${photoPreview || user.profileImageUrl ? 'hidden' : ''}`}
                />
              </div>
              
              {/* Edit Avatar Button */}
              <button 
                type="button"
                onClick={handlePhotoClick}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 flex items-center justify-center hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <div className="relative">
                  <img src="/ellipse.svg" alt={t('profile.editBg') || 'Edit background'} className="w-[110px] h-[54px]" />
                  {isUploadingPhoto ? (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <img 
                      src="/top-menu/edit-light.svg" 
                      alt={t('profile.editIcon') || 'Edit'} 
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5" 
                    />
                  )}
                </div>
              </button>
              
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            {/* Photo Upload Actions */}
            {selectedPhoto && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="px-4 py-2 bg-[#0C54EA] text-white text-sm rounded-lg hover:bg-[#0a4bc7] transition-colors disabled:opacity-50"
                >
                  {isUploadingPhoto ? t('profile.uploading') : t('profile.uploadPhoto')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhoto(null);
                    setPhotoPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="w-10 h-10 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors flex items-center justify-center"
                  aria-label={t('profile.cancel')}
                >
                  <img src="/close.svg" alt="close" className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* User Name Display */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-black">
                {watch('name') || t('profile.defaultName')}
              </h2>
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="bg-[#F1F7FF] px-4 mt-4 space-y-3">
            <div className="text-left flex flex-col gap-3 pt-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black opacity-50 mb-2">{t('profile.name') || 'Имя'}</label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[40px] focus:outline-none focus:ring-2 focus:ring-[#0C54EA] ${
                  errors.name ? 'border-red-500' : ''
                }`}
                placeholder={t('profile.namePlaceholder') || 'Ваше имя'}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-black opacity-50 mb-2">{t('profile.phone') || 'Номер телефона'}</label>
              <input
                type="tel"
                id="phone"
                {...register('phone')}
                className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[40px] focus:outline-none focus:ring-2 focus:ring-[#0C54EA] ${
                  errors.phone ? 'border-red-500' : ''
                }`}
                placeholder={t('profile.phonePlaceholder') || 'Ваш номер телефона'}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black opacity-50 mb-2">{t('profile.email') || 'Почта'}</label>
              <input
                type="email"
                id="email"
                {...register('email')}
                className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-[40px] focus:outline-none focus:ring-2 focus:ring-[#0C54EA] ${
                  errors.email ? 'border-red-500' : ''
                }`}
                placeholder={t('profile.emailPlaceholder') || 'Ваш email'}
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
                {isSubmitting ? t('common.loading') : t('common.save')}
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
          <img src="/accept.png" alt={t('common.success')} className="w-46 h-46 mx-auto mb-4" />
          
          <h3 className="text-2xl font-bold text-black mb-10">{t('profile.updated') || 'Ваши данные успешно обновлены'}</h3>
          
          {/* Button */}
          <button
            onClick={() => {
              setShowSuccessModal(false);
              void navigate('/profile');
            }}
            className="w-full bg-[#0C54EA] text-white font-bold py-3 px-4 rounded-[100px] hover:bg-[#0A4BD9] transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </Modal>
      
      <BottomNavigation />
    </div>
  );
};

export default EditProfile;
