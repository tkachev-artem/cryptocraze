import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

export type BinanceStats = {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  volume: number;
  bidPrice: number;
  askPrice: number;
  count: number;
};

type BinanceState = {
  stats: BinanceStats | null;
  loading: boolean;
  error: string | null;
};

const initialState: BinanceState = {
  stats: null,
  loading: false,
  error: null,
};

export const fetchBinanceStats = createAsyncThunk<BinanceStats, string, { rejectValue: string }>(
  'binance/fetchStats',
  async (symbol, { rejectWithValue }) => {
    try {
      const response = await fetch(`http://localhost:8000/api/binance/stats/${symbol}`);
      if (!response.ok) throw new Error('Ошибка загрузки данных');
      const data = await response.json();
      return data as BinanceStats;
    } catch (e) {
      return rejectWithValue('Ошибка загрузки данных');
    }
  }
);

const binanceSlice = createSlice({
  name: 'binance',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchBinanceStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBinanceStats.fulfilled, (state, action: PayloadAction<BinanceStats>) => {
        state.stats = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchBinanceStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Ошибка';
      });
  }
});

export default binanceSlice.reducer;

export const selectBinanceStats = (state: { binance: BinanceState }) => state.binance.stats;
export const selectBinanceLoading = (state: { binance: BinanceState }) => state.binance.loading;
export const selectBinanceError = (state: { binance: BinanceState }) => state.binance.error;