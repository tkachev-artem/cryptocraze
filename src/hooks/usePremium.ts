import { useUser } from './useUser';

export const usePremium = () => {
  const { user, isLoading } = useUser();
  const isPremium = Boolean(user?.isPremium ?? false);

  return {
    isPremium,
    isLoading,
    // сохраняем API совместимость, но проверки через сеть больше не выполняем
    checkPremiumStatus: async () => {
      // Empty function maintained for API compatibility
    }
  };
};