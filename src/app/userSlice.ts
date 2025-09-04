import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
import { balanceService, type UserBalance } from '../services/balanceService';
import { userStatsService, type UserStats } from '../services/userStatsService';
import { API_BASE_URL } from '@/lib/api';
import { setGlobalLanguage } from '@/lib/i18n';
import { fetchUserDataNoCache } from '@/lib/noCacheApi';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  balance: string;
  coins: number;
  virtualBalance: string;
  freeBalance: string;
  preferredLanguage?: string;
  createdAt: string;
  updatedAt: string;
  profileImageUrl?: string;
  proModeUntil?: string;
  adsDisabledUntil?: string;
  tutorialCompleted: boolean;
  experience?: number;
  totalPnl?: string;
  tradesCount: number;
  totalTradesVolume: string;
  successfulTradesPercentage: string;
  maxProfit: string;
  maxLoss: string;
  averageTradeAmount: string;
  rewardsCount: number;
  ratingScore: number;
  ratingRank30Days?: number | null;
  lastDailyReward?: string | null;
  dailyStreak?: number;
  isPremium?: boolean;
  energyTasksBonus?: number;
};

export type Notification = {
  id: number;
  type: 'daily_reward' | 'trade_closed' | 'achievement_unlocked' | 'system_alert' | 'trade_opened';
  title: string;
  message?: string;
  is_active: boolean;
  is_read: boolean;
  created_at: string;
};

// Типы для API ответов
type ApiNotification = {
  id: number;
  type: string;
  title: string;
  message?: string;
  isActive: boolean;
  isRead: boolean;
  createdAt: string;
};

type ApiResponse = {
  data?: ApiNotification[];
} | ApiNotification[];

type UserState = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  notifications: Notification[];
  unreadCount: number;
  // Локальный оверрайд энергии, чтобы не было мерцания от отстающего API
  energyOverrideValue?: number;
  energyOverrideUntil?: number;
};

const initialState: UserState = {
  user: null,
  isLoading: false,
  error: null,
  notifications: [], // Пустой массив - данные загрузятся из API
  unreadCount: 0,
  energyOverrideValue: undefined,
  energyOverrideUntil: undefined,
};

// Async thunks
export const fetchUser = createAsyncThunk<User, { forceRefresh?: boolean }, { rejectValue: string }>(
  'user/fetchUser',
  async ({ forceRefresh = false } = {}, { rejectWithValue }) => {
    try {
      let response: Response;
      
      if (forceRefresh) {
        // Используем наш специальный метод без кэширования
        console.log('[fetchUser] Using no-cache fetch method');
        response = await fetchUserDataNoCache();
      } else {
        // Обычный fetch
        response = await fetch(`${API_BASE_URL}/auth/user`, {
          credentials: 'include'
        });
      }
      
      if (response.status === 401) {
        // Пользователь не авторизован - это нормально
        return rejectWithValue('Unauthorized');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }
      
      const user = await response.json() as User;
      console.log(`[fetchUser] ${forceRefresh ? 'NO-CACHE' : 'CACHED'} user data:`, {
        coins: user.coins,
        balance: user.balance,
        energy: user.energyTasksBonus,
        timestamp: new Date().toISOString()
      });
      return user;
    } catch (error) {
      console.error('[fetchUser] Error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user');
    }
  }
);

export const updateGameData = createAsyncThunk<User, { coins?: number; experience?: number }, { rejectValue: string }>(
  'user/updateGameData',
  async (gameData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user/game-data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(gameData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }
      
      const updatedUser = await response.json() as User;
      return updatedUser;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update game data');
    }
  }
);

// Notification thunks
export const fetchNotifications = createAsyncThunk<Notification[] | null, undefined, { rejectValue: string }>(
  'user/fetchNotifications',
  async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Если API недоступен, возвращаем null
        return null;
      }
      
      const data = await response.json() as ApiResponse;
      const apiNotifications: ApiNotification[] = Array.isArray(data) ? data : (data.data ?? []);
      
      // Адаптируем формат API к формату фронтенда
      const notifications: Notification[] = apiNotifications.map((notification: ApiNotification) => ({
        id: notification.id,
        type: notification.type as Notification['type'],
        title: notification.title,
        message: notification.message,
        is_active: notification.isActive,
        is_read: notification.isRead,
        created_at: notification.createdAt,
      }));
      
      return notifications;
    } catch {
      // При ошибке возвращаем null
      return null;
    }
  }
);

export const markAsRead = createAsyncThunk<number, number, { rejectValue: string }>(
  'user/markAsRead',
  async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id.toString()}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Если API недоступен, просто возвращаем ID для локального обновления
        return id;
      }
      
      return id;
    } catch {
      // При ошибке возвращаем ID для локального обновления
      return id;
    }
  }
);

export const markAllAsRead = createAsyncThunk<undefined, undefined, { rejectValue: string }>(
  'user/markAllAsRead',
  async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Handle error case
        return undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
);

export const deleteNotification = createAsyncThunk<number, number, { rejectValue: string }>(
  'user/deleteNotification',
  async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        return id;
      }
      
      return id;
    } catch {
      return id;
    }
  }
);

// Thunk для создания обычного уведомления
export const createNotification = createAsyncThunk<Notification, { type: string; title: string; message: string }, { rejectValue: string }>(
  'user/createNotification',
  async (notificationData) => {
    const response = await fetch(`${API_BASE_URL}/notifications/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(notificationData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status.toString()}`);
    }
    
    const notification = await response.json() as Notification;
    return notification;
  }
);

// Thunk для создания уведомления о закрытии сделки
export const createTradeClosedNotification = createAsyncThunk<Notification, { symbol: string; profit: number }, { rejectValue: string }>(
  'user/createTradeClosedNotification',
  async (tradeData) => {
    const response = await fetch(`${API_BASE_URL}/notifications/trade-closed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(tradeData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status.toString()}`);
    }
    
    const notification = await response.json() as Notification;
    return notification;
  }
);

// Thunk для создания уведомления о ежедневной награде
export const createDailyRewardNotification = createAsyncThunk<Notification, { amount: number }, { rejectValue: string }>(
  'user/createDailyRewardNotification',
  async (rewardData) => {
    const response = await fetch(`${API_BASE_URL}/notifications/daily-reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(rewardData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status.toString()}`);
    }
    
    const notification = await response.json() as Notification;
    return notification;
  }
);

// Thunk для создания уведомления о достижении
export const createAchievementNotification = createAsyncThunk<Notification, { name: string; description: string }, { rejectValue: string }>(
  'user/createAchievementNotification',
  async (achievementData) => {
    const response = await fetch(`${API_BASE_URL}/notifications/achievement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(achievementData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status.toString()}`);
    }
    
    const notification = await response.json() as Notification;
    return notification;
  }
);

// Thunk для создания системного уведомления
export const createSystemNotification = createAsyncThunk<Notification, { title: string; message: string }, { rejectValue: string }>(
  'user/createSystemNotification',
  async (systemData) => {
    const response = await fetch(`${API_BASE_URL}/notifications/system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(systemData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status.toString()}`);
    }
    
    const notification = await response.json() as Notification;
    return notification;
  }
);

export const fetchUserBalance = createAsyncThunk<UserBalance, undefined, { rejectValue: string }>(
  'user/fetchUserBalance',
  async (_, { rejectWithValue }) => {
    try {
      const balance = await balanceService.getUserBalance();
      return balance;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user balance');
    }
  }
);

export const fetchUserStats = createAsyncThunk<UserStats, undefined, { rejectValue: string }>(
  'user/fetchUserStats',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await userStatsService.getUserStats();
      return stats;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user stats');
    }
  }
);

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    updateUserData: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    forceUserUpdate: (state, action: PayloadAction<User>) => {
      // Принудительно заменяем весь объект пользователя
      console.log('[userSlice] Force updating user data:', action.payload);
      state.user = action.payload;
      state.error = null;
    },
    setEnergyOverride: (state, action: PayloadAction<{ value: number; ttlMs?: number }>) => {
      const ttlMs = action.payload.ttlMs ?? 5000;
      state.energyOverrideValue = action.payload.value;
      state.energyOverrideUntil = Date.now() + ttlMs;
      if (state.user) {
        // Применяем к текущему пользователю немедленно - разрешаем значения выше 100
        state.user.energyTasksBonus = action.payload.value;
      }
    },
    clearEnergyOverride: (state) => {
      state.energyOverrideValue = undefined;
      state.energyOverrideUntil = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUser
      .addCase(fetchUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (action.payload?.preferredLanguage) {
            setGlobalLanguage(action.payload.preferredLanguage as "ru" | "en" | "es" | "fr" | "pt");
          }
        } catch {
          // Ignore language setting errors
        }
        // Если у нас активен локальный оверрайд энергии — не даем серверу повысить значение обратно
        const now = Date.now();
        if (
          state.energyOverrideValue !== undefined &&
          state.energyOverrideUntil !== undefined &&
          now < state.energyOverrideUntil
        ) {
          // Используем серверное значение энергии без ограничений
          state.user.energyTasksBonus = state.user.energyTasksBonus ?? 0;
        }
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // updateGameData
      .addCase(updateGameData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateGameData.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateGameData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unknown error';
      })
      // fetchNotifications
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        // Обновляем состояние только если получены реальные данные
        if (action.payload !== null && action.payload.length > 0) {
          state.notifications = action.payload;
          state.unreadCount = action.payload.filter(n => !n.is_read).length;
        }
      })
      // markAsRead
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification) {
          notification.is_read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      // markAllAsRead
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(n => n.is_read = true);
        state.unreadCount = 0;
      })
      // deleteNotification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload);
        if (index !== -1) {
          const notification = state.notifications[index];
          if (!notification.is_read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications.splice(index, 1);
        }
      })
      // createNotification
      .addCase(createNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        if (!action.payload.is_read) {
          state.unreadCount += 1;
        }
      })
      // createTradeClosedNotification
      .addCase(createTradeClosedNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        if (!action.payload.is_read) {
          state.unreadCount += 1;
        }
      })
      // createDailyRewardNotification
      .addCase(createDailyRewardNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        if (!action.payload.is_read) {
          state.unreadCount += 1;
        }
      })
      // createAchievementNotification
      .addCase(createAchievementNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        state.unreadCount = state.notifications.filter(n => !n.is_read).length;
      })
      // createSystemNotification
      .addCase(createSystemNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        if (!action.payload.is_read) {
          state.unreadCount += 1;
        }
      })
      // fetchUserBalance
      .addCase(fetchUserBalance.fulfilled, (state, action) => {
        if (state.user) {
          const payload = action.payload as { balance: number; freeBalance: number };
          state.user.balance = String(payload.balance);
          state.user.freeBalance = String(payload.freeBalance);
        }
      })
      // fetchUserStats
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        if (state.user) {
          state.user.tradesCount = action.payload.tradesCount;
          state.user.totalTradesVolume = action.payload.totalTradesVolume;
          state.user.successfulTradesPercentage = action.payload.successfulTradesPercentage;
          state.user.maxProfit = action.payload.maxProfit;
          state.user.maxLoss = action.payload.maxLoss;
          state.user.averageTradeAmount = action.payload.averageTradeAmount;
          state.user.rewardsCount = action.payload.rewardsCount;
          state.user.ratingScore = action.payload.ratingScore;
          state.user.ratingRank30Days = action.payload.ratingRank30Days;
          state.user.isPremium = action.payload.isPremium;
        }
      });
  },
});

export const {
  setUser,
  clearUser,
  setLoading,
  setError,
  updateUserData,
  forceUserUpdate,
  setEnergyOverride,
  clearEnergyOverride,
} = userSlice.actions;

// Selectors
export const selectUser = (state: RootState) => state.user.user;
export const selectIsLoading = (state: RootState) => state.user.isLoading;
export const selectError = (state: RootState) => state.user.error;
export const selectIsAuthenticated = (state: RootState) => !!state.user.user;
export const selectUserCoins = (state: RootState) => state.user.user?.coins ?? 0;
export const selectUserBalance = (state: RootState) => state.user.user?.balance ?? '0.00';
export const selectUserExperience = (state: RootState) => state.user.user?.experience ?? 0;

// Notification selectors
export const selectNotifications = (state: RootState) => state.user.notifications;
export const selectUnreadCount = (state: RootState) => state.user.unreadCount;
export const selectActiveNotifications = (state: RootState) => 
  state.user.notifications.filter(n => n.is_active);

export default userSlice.reducer; 