import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getCachedBinanceStats } from '@/lib/resilientApi';

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
      const resilientData = await getCachedBinanceStats(symbol);
      
      // Преобразуем данные из resilient API в локальный формат
      const data: BinanceStats = {
        symbol: resilientData.symbol,
        priceChange: Number(resilientData.priceChange),
        priceChangePercent: Number(resilientData.priceChangePercent),
        lastPrice: Number(resilientData.lastPrice),
        highPrice: Number(resilientData.highPrice),
        lowPrice: Number(resilientData.lowPrice),
        openPrice: Number(resilientData.openPrice),
        volume: Number(resilientData.volume),
        bidPrice: 0, // Эти поля нет в resilient API, устанавливаем default
        askPrice: 0,
        count: 0,
      };
      
      return data;
    } catch (e) {
      console.error('Ошибка в fetchBinanceStats:', e);
      return rejectWithValue(e instanceof Error ? e.message : 'errors.dataLoading');
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
        state.error = action.payload ?? 'errors.general';
      });
  }
});

export default binanceSlice.reducer;

export const selectBinanceStats = (state: { binance: BinanceState }) => state.binance.stats;
export const selectBinanceLoading = (state: { binance: BinanceState }) => state.binance.loading;
export const selectBinanceError = (state: { binance: BinanceState }) => state.binance.error;