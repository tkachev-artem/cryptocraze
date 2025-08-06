import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

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
};

type UserState = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: UserState = {
  user: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchUser = createAsyncThunk<User, undefined, { rejectValue: string }>(
  'user/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      console.log('fetchUser thunk - starting request');
      const response = await fetch('http://localhost:8000/api/auth/user', {
        credentials: 'include',
      });
      
      console.log('fetchUser thunk - response status:', response.status);
      
      if (response.status === 401) {
        // Пользователь не авторизован - это нормально
        console.log('fetchUser thunk - user not authenticated (401)');
        return rejectWithValue('Unauthorized');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }
      
      const user = await response.json() as User;
      console.log('fetchUser thunk - user data received:', user);
      console.log('fetchUser thunk - coins value:', user.coins);
      return user;
    } catch (error) {
      console.error('fetchUser thunk - error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch user');
    }
  }
);

export const updateGameData = createAsyncThunk<User, { coins?: number; experience?: number }, { rejectValue: string }>(
  'user/updateGameData',
  async (gameData, { rejectWithValue }) => {
    try {
      console.log('updateGameData thunk - starting request with data:', gameData);
      const response = await fetch('http://localhost:8000/api/auth/user/game-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(gameData),
      });
      
      console.log('updateGameData thunk - response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }
      
      const updatedUser = await response.json() as User;
      console.log('updateGameData thunk - updated user data:', updatedUser);
      console.log('updateGameData thunk - updated coins value:', updatedUser.coins);
      return updatedUser;
    } catch (error) {
      console.error('updateGameData thunk - error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update game data');
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
      });
  },
});

export const {
  setUser,
  clearUser,
  setLoading,
  setError,
  updateUserData,
} = userSlice.actions;

// Selectors
export const selectUser = (state: { user: UserState }) => state.user.user;
export const selectIsLoading = (state: { user: UserState }) => state.user.isLoading;
export const selectError = (state: { user: UserState }) => state.user.error;
export const selectIsAuthenticated = (state: { user: UserState }) => !!state.user.user;
export const selectUserCoins = (state: { user: UserState }) => state.user.user?.coins ?? 0;
export const selectUserBalance = (state: { user: UserState }) => state.user.user?.balance ?? '0.00';
export const selectUserExperience = (state: { user: UserState }) => state.user.user?.experience ?? 0;

export default userSlice.reducer; 