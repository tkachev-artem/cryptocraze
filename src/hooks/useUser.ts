import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { 
  fetchUser, 
  updateGameData,
  selectUser,
  selectIsLoading,
  selectError,
  selectIsAuthenticated,
} from '../app/userSlice';

export const useUser = () => {
  const dispatch = useAppDispatch();
  const hasAttemptedAuth = useRef(false);
  
  const user = useAppSelector(selectUser);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Автоматически загружаем пользователя при инициализации хука
  useEffect(() => {
    // Делаем запрос только один раз, если пользователь не загружен и мы еще не пытались
    if ((user == null) && !isLoading && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      void dispatch(fetchUser({}));
    }
  }, [dispatch, user, isLoading]);

  const loadUser = () => {
    hasAttemptedAuth.current = false; // Сбрасываем флаг для ручной загрузки
    void dispatch(fetchUser({}));
  };

  const updateUserGameData = (gameData: { coins?: number; experience?: number }) => {
    const coinsValue = gameData.coins ?? undefined;
    const experienceValue = gameData.experience ?? undefined;
    void dispatch(updateGameData({ coins: coinsValue, experience: experienceValue }));
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    loadUser,
    updateUserGameData,
  };
}; 