import { store } from '@/app/store';
import { forceUserUpdate } from '@/app/userSlice';
import { fetchUserDataNoCache } from './noCacheApi';

// Принудительное обновление данных пользователя с обходом всех кэшей
export const forceRefreshUserData = async (): Promise<void> => {
  console.log('[forceRefresh] Starting aggressive user data refresh...');
  
  try {
    // 1. Получаем свежие данные с сервера (без кэша)
    const response = await fetchUserDataNoCache();
    
    if (response.status === 401) {
      console.log('[forceRefresh] User not authenticated');
      return;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const userData = await response.json();
    console.log('[forceRefresh] Fresh user data from server:', userData);
    
    // 2. Принудительно обновляем Redux store
    store.dispatch(forceUserUpdate(userData));
    
    // 3. Ждем немного для React рендера
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[forceRefresh] User data forcefully refreshed in store');
    
  } catch (error) {
    console.error('[forceRefresh] Failed to refresh user data:', error);
  }
};