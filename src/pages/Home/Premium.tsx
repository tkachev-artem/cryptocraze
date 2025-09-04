import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useUser } from '../../hooks/useUser';
import { usePremium } from '../../hooks/usePremium';
import { useAppDispatch } from '../../app/hooks';
import { updateUserData } from '../../app/userSlice';
import { useToast } from '../../hooks/use-toast';
import { API_BASE_URL } from '../../lib/api';
import { useTranslation } from '@/lib/i18n';


const Premium: FC = () => {
    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('month');
    const [isLoading, setIsLoading] = useState(false);
    const { user, isLoading: userLoading } = useUser();
    const { isPremium } = usePremium();
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { t } = useTranslation();



    // Создание подписки в БД
    const createPremiumSubscription = async (planType: 'month' | 'year') => {
        if (!user?.id) {
            console.error('ID пользователя не найден');
            return;
        }

        const telegramId = localStorage.getItem('telegramId') ?? '';
        const amount = planType === 'month' ? 6.99 : 64.99;

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/premium/subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userId: user.id,
                    planType,
                    telegramId,
                    amount
                })
            });

            if (!response.ok) {
                console.error(`Ошибка создания подписки: ${response.status.toString()} ${response.statusText}`);
                toast({
                    title: t('premium.activateErrorTitle') || 'Не удалось активировать PRO',
                    description: t('premium.tryLater') || 'Попробуйте позже',
                    variant: 'destructive'
                });
                return;
            }

            const data = await response.json() as unknown;
            const success = Boolean((data as Record<string, unknown>).success ?? true);
            if (success) {
                // Обновляем локально статус PRO
                dispatch(updateUserData({ isPremium: true }));
                toast({ title: t('premium.activated') || 'PRO активирован', description: t('premium.enabled') || 'Premium режим включён' });
                // Возвращаемся на главную после успешной активации
                setTimeout(() => { void navigate('/home'); }, 300);
            } else {
                console.error('Неожиданная структура ответа при создании подписки:', data);
                toast({
                    title: t('premium.activateErrorTitle') || 'Ошибка активации PRO',
                    description: t('premium.unexpected') || 'Неожиданный ответ сервера',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Ошибка создания подписки:', error);
            toast({
                title: t('common.error'),
                description: t('premium.network') || 'Проверьте соединение и попробуйте ещё раз',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // статус Premium проверяется автоматически в usePremium
    }, [user?.id, userLoading]);

    const handleBackClick = () => {
        void navigate(-1);
    };

    const handleMonthPlanClick = () => {
        setSelectedPlan('month');
    };

    const handleYearPlanClick = () => {
        setSelectedPlan('year');
    };

    const handleSubscribeClick = () => {
        void createPremiumSubscription(selectedPlan);
    };

    return (
        <div className="bg-white min-h-screen pb-[env(safe-area-inset-bottom)]">
            {/* Navigation Bar */}
            <div className="sticky top-0 z-10">
                <div className="relative h-[240px] rounded-b-[20px] bg-[radial-gradient(50%_50%_at_50%_50%,_#3C76F0_0%,_#0C46BE_100%)]">
                {/* Top App Bar */}
                <div className="flex items-center justify-between px-2 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                        <button
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
                            onClick={handleBackClick}
                        >
                            <img src="/top-menu/back.svg" alt="Back" className="w-6 h-6 brightness-0 invert" />
                        </button>
                    </div>

                    {/* Premium Logo */}
                    <div className="absolute top-12 left-1/2 -translate-x-1/2">
                        <img src="/premium/logo.svg" alt="Premium Logo" className="w-32 h-44" />
                    </div>
                </div>
            </div>
            </div>

            {/* Info Text Section */}
            <div className="px-4 py-4 space-y-5">
                <h2 className="text-2xl font-bold text-black text-center">{t('settings.premium.goPremium')}</h2>

                {/* Features List */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[#0C54EA] rounded-[10px] flex items-center justify-center">
                            <img src="/premium/check.svg" alt="Check" className="w-3 h-3" />
                        </div>
                        <span className="text-black font-medium text-sm">{t('premium.noAds') || 'Нет рекламы'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[#0C54EA] rounded-[10px] flex items-center justify-center">
                            <img src="/premium/check.svg" alt="Check" className="w-3 h-3" />
                        </div>
                        <span className="text-black font-medium text-sm">{t('premium.moreOrders') || 'Увеличенный лимит открытых ордеров'}</span>
                    </div>

                    <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-[#0C54EA] rounded-[10px] flex items-center justify-center mt-0.5">
                            <img src="/premium/check.svg" alt="Check" className="w-3 h-3" />
                        </div>
                        <span className="text-black font-medium text-sm">{t('premium.moreMultipliers') || 'Доступно больше опций мультипликатора'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-[#0C54EA] rounded-[10px] flex items-center justify-center">
                            <img src="/premium/check.svg" alt="Check" className="w-3 h-3" />
                        </div>
                        <span className="text-black font-medium text-sm">{t('premium.highlighted') || 'Ваш аккаунт выделен в рейтинге'}</span>
                    </div>
                </div>
            </div>

            {/* Subscription Plans */}
            <div className="px-4 py-4 space-y-4">
                {/* Monthly Plan */}
                <div
                    className={`relative p-3 rounded-xl cursor-pointer transition-all w-full ${selectedPlan === 'month'
                            ? 'bg-[#0C54EA]'
                            : 'bg-white border border-gray-200'
                        }`}
                    onClick={handleMonthPlanClick}
                >
                    <div className="flex justify-between items-start">
                        <div className="space-y-5">
                            <div className="flex h-5 w-16 justify-center items-center rounded-[12px] bg-[#F5A600]">
                                <span className="text-black font-medium text-xs">{t('premium.monthly') || 'в месяц'}</span>
                            </div>
                            <div className={`font-bold text-2xl ${selectedPlan === 'month' ? 'text-white' : 'text-black'
                                }`}>
$6.99
                            </div>
                        </div>

                        {/* Radio Button */}
                        <div className="w-4 h-4 flex items-center justify-center">
                            {selectedPlan === 'month' ? (
                                <img src="/premium/radio.svg" alt="Selected" className="w-4 h-4" />
                            ) : (
                                <img src="/premium/radio-bg.svg" alt="Unselected" className="w-4 h-4" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Yearly Plan */}
                <div
                    className={`relative p-3 rounded-xl cursor-pointer transition-all w-full ${selectedPlan === 'year'
                            ? 'bg-[#0C54EA]'
                            : 'bg-white border border-gray-200'
                        }`}
                    onClick={handleYearPlanClick}
                >
                    <div className="flex justify-between items-start">
                        <div className="space-y-5">
                            <div className="flex gap-2">
                                <div className="flex h-5 w-16 justify-center items-center rounded-[12px] bg-[#F5A600]">
                                <span className="text-black font-medium text-xs">{t('premium.yearly') || 'в год'}</span>
                                </div>
                                <div className="flex h-5 w-16 justify-center items-center rounded-[12px] bg-[#2EBD85]">
                                    <span className="text-white font-semibold text-xs">-22%</span>
                                </div>
                            </div>
                            <div className={`font-bold text-2xl ${selectedPlan === 'year' ? 'text-white' : 'text-black'
                                }`}>
$64.99
                            </div>
                        </div>

                        {/* Radio Button */}
                        <div className="w-4 h-4 flex items-center justify-center">
                            {selectedPlan === 'year' ? (
                                <img src="/premium/radio.svg" alt="Selected" className="w-4 h-4" />
                            ) : (
                                <img src="/premium/radio-bg.svg" alt="Unselected" className="w-4 h-4" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscription Info */}
            <div className="px-4">
                <p className="text-black max-w-[255px] mx-auto font-medium text-xs text-center leading-relaxed">
                    {selectedPlan === 'month'
                        ? t('premium.chargeMonthly') || '$6.99 will be charged automatically every month until you cancel your subscription'
                        : t('premium.chargeYearly') || '$64.99 will be charged automatically every year until you cancel your subscription'
                    }
                </p>
            </div>

            {/* Subscribe Button */}
            <div className="px-4 py-4">
                {userLoading ? (
                    <div className="w-full bg-gray-400 text-white font-bold text-base py-3 px-6 rounded-full text-center">
                        {t('common.loading')}
                    </div>
                ) : isPremium ? (
                    <div className="w-full bg-[#F5A600] text-black font-bold text-base py-3 px-6 rounded-full text-center flex items-center justify-center gap-2">
                        <img src="/crown.png" alt="premium" className='w-6 h-6' />
                         <span>{t('settings.premium.pro')}</span>
                    </div>
                ) : (
                    <button
                        onClick={handleSubscribeClick}
                        disabled={isLoading}
                        className={`w-full font-bold text-base py-3 px-6 rounded-full transition-colors ${
                            isLoading 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-[#0C54EA] hover:bg-[#0A47C7]'
                        } text-white`}
                        aria-label={t('settings.premium.goPremium')}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleSubscribeClick();
                            }
                        }}
                    >
                        {isLoading ? t('common.loading') : t('settings.premium.goPremium')}
                    </button>
                )}
            </div>

        </div>
    );
};

export default Premium;
