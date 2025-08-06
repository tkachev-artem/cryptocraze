import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { 
  fetchUser, 
  updateGameData,
  selectUser,
  selectIsLoading,
  selectError,
  selectIsAuthenticated,
  selectUserCoins,
  selectUserBalance,
  selectUserExperience,
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
    console.log('useUser hook - user:', user, 'isLoading:', isLoading, 'error:', error, 'hasAttemptedAuth:', hasAttemptedAuth.current);
    
    // Делаем запрос только один раз, если пользователь не загружен и мы еще не пытались
    if (!user && !isLoading && !hasAttemptedAuth.current) {
      console.log('useUser hook - dispatching fetchUser');
      hasAttemptedAuth.current = true;
      void dispatch(fetchUser());
    }
  }, [dispatch, user, isLoading]);

  const loadUser = () => {
    console.log('useUser hook - manual loadUser called');
    hasAttemptedAuth.current = false; // Сбрасываем флаг для ручной загрузки
    void dispatch(fetchUser());
  };

  const updateUserGameData = (gameData: { coins?: number; experience?: number }) => {
    void dispatch(updateGameData(gameData));
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